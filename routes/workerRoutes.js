// ✅ routes/workerRoutes.js (Cleaned & Improved Error Handling)

const express = require("express");
const router = express.Router();
const { Worker, Admin } = require("../config/db.js");
const sendTaskEmail = require("../utils/sendmail");

// Middleware to check if admin is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.adminId) {
    console.warn("Unauthorized access attempt detected.");
    return res.redirect("/login");
  }
  next();
}

// GET: All Workers
router.get("/workers", isLoggedIn, async (req, res) => {
  try {
    const workers = await Worker.find({ createdBy: req.session.adminId });
    res.render("workers", { title: "All Workers", workers });
  } catch (err) {
    console.error("Error fetching workers:", err.message);
    res.status(500).send("❌ Internal Server Error. Please try again later.");
  }
});

// GET: Add Worker Form
router.get("/workers/add", isLoggedIn, (req, res) => {
  res.render("addworker", { title: "Add Worker" });
});

// POST: Add New Worker
router.post("/workers/add", isLoggedIn, async (req, res) => {
  try {
    const { name, email, phone, jobTitle, position, salary } = req.body;
    const createdBy = req.session.adminId;

    const newWorker = new Worker({ name, email, phone, jobTitle, position, salary, createdBy });
    await newWorker.save();

    const admin = await Admin.findById(createdBy);
    const companyName = admin?.companyName || "Staff Manager";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px;">
          <h2 style="color: #2E86C1;">Welcome to ${companyName}!</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>We're thrilled to have you join as a <strong>${position}</strong> in the <strong>${jobTitle}</strong> department.</p>
          <table style="width: 100%; margin: 15px 0;">
            <tr><td><strong>Email</strong></td><td>${email}</td></tr>
            <tr><td><strong>Phone</strong></td><td>${phone}</td></tr>
            <tr><td><strong>Salary</strong></td><td>₹${salary}</td></tr>
          </table>
          <p>Reach out anytime if you have questions.</p>
          <p>Regards,<br/><strong>${companyName}</strong> [ HR Team ]</p>
        </div>
      </div>
    `;

    await sendTaskEmail(email, "Welcome to the team!", emailHtml, createdBy);
    res.redirect("/workers");
  } catch (err) {
    console.error("Error adding new worker:", err.message);
    res.status(500).send("❌ Failed to add worker. Please try again later.");
  }
});

// GET: Edit Worker Form
router.get("/workers/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const worker = await Worker.findOne({ _id: req.params.id, createdBy: req.session.adminId });
    if (!worker) {
      console.warn(`Worker not found or unauthorized access for edit: ${req.params.id}`);
      return res.status(404).send("❌ Worker not found or unauthorized access.");
    }
    res.render("editWorker", { worker });
  } catch (err) {
    console.error("Error fetching worker for edit:", err.message);
    res.status(500).send("❌ Internal Server Error. Please try again later.");
  }
});

// POST: Edit Worker
router.post("/workers/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const updated = await Worker.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.session.adminId },
      req.body,
      { new: true }
    );
    if (!updated) {
      console.warn(`Worker not found or unauthorized access for update: ${req.params.id}`);
      return res.status(404).send("❌ Worker not found or unauthorized access.");
    }
    res.redirect("/workers");
  } catch (err) {
    console.error("Error updating worker:", err.message);
    res.status(500).send("❌ Failed to update worker. Please try again later.");
  }
});

// POST: Delete Worker
router.post("/workers/delete/:id", isLoggedIn, async (req, res) => {
  try {
    const deleted = await Worker.findOneAndDelete({ _id: req.params.id, createdBy: req.session.adminId });
    if (!deleted) {
      console.warn(`Worker not found or unauthorized access for deletion: ${req.params.id}`);
      return res.status(404).send("❌ Worker not found or unauthorized access.");
    }
    res.redirect("/workers");
  } catch (err) {
    console.error("Error deleting worker:", err.message);
    res.status(500).send("❌ Failed to delete worker. Please try again later.");
  }
});

module.exports = router;
