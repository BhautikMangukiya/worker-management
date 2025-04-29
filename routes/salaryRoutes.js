const express = require("express");
const moment = require("moment");
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
const { Worker, Attendance, Admin } = require("../config/db");

const router = express.Router();

// Configure Puppeteer for Render
const puppeteerOptions = {
  args: chromium.args,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
  headless: chromium.headless,
  defaultViewport: chromium.defaultViewport,
};

// Middleware to ensure admin is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.session.adminId) {
    req.flash('error', 'Please login first');
    return res.redirect("/login");
  }
  next();
};

// Helper function to calculate salary details
const calculateSalaryDetails = async (worker, startDate, endDate) => {
  const dailySalary = worker.salary / 30;
  
  const [presentDays, absentDays, halfDays] = await Promise.all([
    Attendance.countDocuments({
      workerId: worker._id,
      status: "Present",
      date: { $gte: startDate, $lte: endDate }
    }),
    Attendance.countDocuments({
      workerId: worker._id,
      status: "Absent",
      date: { $gte: startDate, $lte: endDate }
    }),
    Attendance.countDocuments({
      workerId: worker._id,
      status: "Half-day",
      date: { $gte: startDate, $lte: endDate }
    })
  ]);

  const presentAmount = presentDays * dailySalary;
  const absentAmount = absentDays * dailySalary;
  const halfDayAmount = halfDays * (dailySalary / 2);
  const totalPayableSalary = presentAmount + halfDayAmount;

  return {
    monthlySalary: worker.salary.toFixed(2),
    dailySalary: dailySalary.toFixed(2),
    totalPayableSalary: totalPayableSalary.toFixed(2),
    summary: [
      { type: "Present Days", days: presentDays, amount: presentAmount.toFixed(2) },
      { type: "Absent Days", days: absentDays, amount: (-absentAmount).toFixed(2) },
      { type: "Half-day Work", days: halfDays, amount: halfDayAmount.toFixed(2) },
    ],
  };
};

// Route: Show all workers on the salary page
router.get("/salary", isLoggedIn, async (req, res) => {
  try {
    const workers = await Worker.find({ createdBy: req.session.adminId });
    res.render("salary", { 
      title: "Salary Management", 
      workers,
      moment // Pass moment to view for date formatting
    });
  } catch (error) {
    console.error("Error fetching workers:", error);
    req.flash('error', 'Failed to load salary page');
    res.redirect('back');
  }
});

// Route: Show salary report for a specific worker
router.get("/workers/:id/salary-report", isLoggedIn, async (req, res) => {
  try {
    const { adminId } = req.session;
    const { id: workerId } = req.params;
    const selectedMonth = parseInt(req.query.month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = moment().year(selectedYear).month(selectedMonth - 1).startOf("month");
    const endDate = moment().year(selectedYear).month(selectedMonth - 1).endOf("month");

    const [worker, admin] = await Promise.all([
      Worker.findOne({ _id: workerId, createdBy: adminId }),
      Admin.findOne({ _id: adminId })
    ]);

    if (!worker) throw new Error('Worker not found');
    if (!admin) throw new Error('Admin not found');

    const salaryDetails = await calculateSalaryDetails(worker, startDate, endDate);

    res.render("salary-Report", {
      title: "Worker Salary Report",
      worker,
      salarySummary: salaryDetails,
      selectedMonth,
      selectedYear,
      companyName: admin.companyName,
      moment // Pass moment to view
    });

  } catch (error) {
    console.error("Error generating salary report:", error);
    req.flash('error', error.message);
    res.redirect('back');
  }
});

// Route: Download salary report PDF
router.get("/workers/:id/salary-report/download", isLoggedIn, async (req, res) => {
  let browser;
  try {
    const { adminId } = req.session;
    const { id: workerId } = req.params;
    const selectedMonth = parseInt(req.query.month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = moment().year(selectedYear).month(selectedMonth - 1).startOf("month");
    const endDate = moment().year(selectedYear).month(selectedMonth - 1).endOf("month");

    const [worker, admin] = await Promise.all([
      Worker.findOne({ _id: workerId, createdBy: adminId }),
      Admin.findOne({ _id: adminId })
    ]);

    if (!worker) throw new Error('Worker not found');
    if (!admin) throw new Error('Admin not found');

    const salaryDetails = await calculateSalaryDetails(worker, startDate, endDate);

    // Prepare PDF path
    const pdfDir = path.join(__dirname, "../public/reports");
    const pdfPath = path.join(pdfDir, `salary-report-${workerId}-${selectedMonth}-${selectedYear}.pdf`);
    
    // Ensure directory exists
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Generate PDF
    browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();

    const htmlContent = await ejs.renderFile(
      path.join(__dirname, "../views/pdf-salary.ejs"),
      { worker, salarySummary: salaryDetails, companyName: admin.companyName }
    );

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.pdf({ 
      path: pdfPath, 
      format: "A4",
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });

    // Stream the PDF to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=salary-report-${worker.name}-${selectedMonth}-${selectedYear}.pdf`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // Cleanup after streaming
    fileStream.on('end', () => {
      fs.unlink(pdfPath, (err) => {
        if (err) console.error('Error deleting temporary PDF:', err);
      });
    });

  } catch (error) {
    console.error("Error generating salary report PDF:", error);
    req.flash('error', 'Failed to generate PDF report');
    res.redirect('back');
  } finally {
    if (browser) {
      await browser.close().catch(err => console.error('Error closing browser:', err));
    }
  }
});

module.exports = router;