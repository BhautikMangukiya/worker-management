const express = require("express");
const moment = require("moment");
const puppeteer = require("puppeteer");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
const { Worker, Attendance, Admin } = require("../config/db");

const router = express.Router();

// Middleware to ensure admin is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.adminId) return res.redirect("/login");
  next();
}

// Helper function to calculate salary details
async function calculateSalaryDetails(worker, startDate, endDate) {
  const dailySalary = worker.salary / 30;

  const presentDays = await Attendance.countDocuments({
    workerId: worker._id,
    status: "Present",
    date: { $gte: startDate, $lte: endDate },
  });

  const absentDays = await Attendance.countDocuments({
    workerId: worker._id,
    status: "Absent",
    date: { $gte: startDate, $lte: endDate },
  });

  const halfDays = await Attendance.countDocuments({
    workerId: worker._id,
    status: "Half-day",
    date: { $gte: startDate, $lte: endDate },
  });

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
      { type: "Absent Days", days: absentDays, amount: absentAmount.toFixed(2) },
      { type: "Half-day Work", days: halfDays, amount: halfDayAmount.toFixed(2) },
    ],
  };
}

// Route: Show all workers on the salary page
router.get("/salary", isLoggedIn, async (req, res) => {
  try {
    const workers = await Worker.find({ createdBy: req.session.adminId });
    res.render("salary", { title: "Salary Management", workers });
  } catch (error) {
    console.error("Error fetching workers:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route: Show salary report for a specific worker
router.get("/workers/:id/salary-report", isLoggedIn, async (req, res) => {
  try {
    const { adminId } = req.session;
    const { id: workerId } = req.params;
    const selectedMonth = parseInt(req.query.month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = moment().year(selectedYear).month(selectedMonth - 1).startOf("month").format("YYYY-MM-DD");
    const endDate = moment().year(selectedYear).month(selectedMonth - 1).endOf("month").format("YYYY-MM-DD");

    // Fetch the worker
    const worker = await Worker.findOne({ _id: workerId, createdBy: adminId });
    if (!worker) return res.status(404).send("Worker not found or unauthorized access");

    // Fetch the company name from the Admin model
    const admin = await Admin.findOne({ _id: adminId });
    if (!admin) {
      return res.status(404).send("Admin not found");
    }
    const companyName = admin.companyName; // Get the company name

    // Calculate salary details
    const salaryDetails = await calculateSalaryDetails(worker, startDate, endDate);

    res.render("salary-Report", {
      title: "Worker Salary Report",
      worker,
      salarySummary: {
        workerName: worker.name,
        monthlySalary: worker.salary,
        ...salaryDetails,
      },
      selectedMonth,
      selectedYear,
      companyName: companyName, // Pass the company name to the EJS file
    });
  } catch (error) {
    console.error("Error generating salary report:", error);
    res.status(500).send("Internal Server Error");
  }
});





router.get("/workers/:id/salary-report/download", isLoggedIn, async (req, res) => {
  try {
    const adminId = req.session.adminId; // Get adminId from session
    const workerId = req.params.id;
    const selectedMonth = parseInt(req.query.month) || new Date().getMonth() + 1;
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = moment().year(selectedYear).month(selectedMonth - 1).startOf("month").format("YYYY-MM-DD");
    const endDate = moment().year(selectedYear).month(selectedMonth - 1).endOf("month").format("YYYY-MM-DD");

    // Fetch the worker
    const worker = await Worker.findOne({ _id: workerId, createdBy: adminId });
    if (!worker) {
      return res.status(404).send("Worker not found or unauthorized access");
    }

    // Fetch the company name from the Admin model
    const admin = await Admin.findOne({ _id: adminId });
    if (!admin) {
      return res.status(404).send("Admin not found");
    }
    const companyName = admin.companyName; // Get the company name

    // Calculate salary details
    const dailySalary = worker.salary / 30;
    const presentDays = await Attendance.countDocuments({
      workerId,
      status: "Present",
      date: { $gte: startDate, $lte: endDate },
    });
    const halfDays = await Attendance.countDocuments({
      workerId,
      status: "Half-day",
      date: { $gte: startDate, $lte: endDate },
    });
    const absentDays = await Attendance.countDocuments({
      workerId,
      status: "Absent",
      date: { $gte: startDate, $lte: endDate },
    });

    const presentAmount = presentDays * dailySalary;
    const absentAmount = absentDays * dailySalary;
    const halfDayAmount = halfDays * (dailySalary / 2);
    const totalPayableSalary = presentAmount + halfDayAmount;

    const salarySummary = {
      monthlySalary: worker.salary.toFixed(2),
      dailySalary: dailySalary.toFixed(2),
      totalPayableSalary: totalPayableSalary.toFixed(2),
      summary: [
        { type: "Present Days", days: presentDays, amount: presentAmount.toFixed(2) },
        { type: "Half-day Work", days: halfDays, amount: halfDayAmount.toFixed(2) },
        { type: "Absent Days", days: absentDays, amount: (-absentAmount.toFixed(2)) },
      ],
    };

    console.log("salarySummary being passed:", salarySummary);

    const pdfPath = path.join(__dirname, "../public/reports", `salary-report-${workerId}-${selectedMonth}-${selectedYear}.pdf`);
    if (!fs.existsSync(path.dirname(pdfPath))) {
      fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();

    const htmlContent = await ejs.renderFile(
      path.join(__dirname, "../views/pdf-salary.ejs"),
      { 
        worker: worker,
        salarySummary: salarySummary,
        companyName: companyName // Pass the company name to the EJS file
      }
    );

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4" });
    await browser.close();

    res.download(pdfPath, `salary-report-${worker.name}-${selectedMonth}-${selectedYear}.pdf`, (err) => {
      if (err) res.status(500).send("Error generating PDF");
      fs.unlink(pdfPath, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting PDF:", unlinkErr);
      });
    });
  } catch (error) {
    console.error("Error generating salary report:", error);
    res.status(500).send("Internal Server Error");
  }
});

// --------------------------------------

module.exports = router;
