const express = require("express");
const router = express.Router();
const { Worker, Task, Admin } = require("../config/db.js");
const sendTaskEmail = require("../utils/sendmail");

// Middleware to check if admin is logged in
function isLoggedIn(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    return res.redirect("/login");
  }
}

// View all workers to assign tasks (only own workers)
router.get("/tasks", isLoggedIn, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const workers = await Worker.find({ createdBy: adminId });
    res.render("task", { title: "Task Management", workers });
  } catch (error) {
    console.error("Error fetching workers for task page:", error.message);
    res.status(500).send("Something went wrong while fetching workers. Please try again later.");
  }
});

// View specific worker tasks (only if owned by this admin)
router.get("/workers/:id/tasks", isLoggedIn, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const workerId = req.params.id;

    const worker = await Worker.findOne({ _id: workerId, createdBy: adminId });
    if (!worker) {
      console.warn(`Unauthorized access attempt by adminId: ${adminId} for workerId: ${workerId}`);
      return res.status(403).send("Unauthorized access to this worker's tasks");
    }

    const tasks = await Task.find({ workerId, createdBy: adminId });
    res.render("viewTask", { title: "Worker Tasks", worker, tasks });
  } catch (error) {
    console.error("Error loading worker tasks:", error.message);
    res.status(500).send("Unable to load tasks. Please try again later.");
  }
});

// Show form to assign task to specific worker
router.get("/task/add/:id", isLoggedIn, async (req, res) => {
  try {
    const workerId = req.params.id;

    const worker = await Worker.findOne({ _id: workerId, createdBy: req.session.adminId });
    if (!worker) {
      console.warn(`Unauthorized task assignment page access by adminId: ${req.session.adminId} for workerId: ${workerId}`);
      return res.status(403).send("Unauthorized access to assign task to this worker.");
    }

    res.render("addTask", { workerId });
  } catch (error) {
    console.error("Error loading add task form:", error.message);
    res.status(500).send("Something went wrong while loading the task form. Please try again.");
  }
});

// Assign task & send email
router.post("/task/add", isLoggedIn, async (req, res) => {
  try {
    const { workerId, taskName, taskDetails, taskDueDate } = req.body;
    const adminId = req.session.adminId;

    const worker = await Worker.findOne({ _id: workerId, createdBy: adminId });
    if (!worker) {
      console.warn(`Unauthorized task assignment attempt by adminId: ${adminId} for workerId: ${workerId}`);
      return res.status(403).send("Unauthorized action or worker not found.");
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      console.error(`Admin not found with ID: ${adminId}`);
      return res.status(404).send("Admin not found. Please re-login.");
    }

    const companyName = admin.companyName || "Staff Manager";

    const task = new Task({
      workerId,
      taskName,
      taskDetails,
      taskDueDate,
      createdBy: adminId,
    });

    await task.save();

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          <h1 style="color: #009688; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">${companyName}</h1>
          <h2 style="color: #2E86C1; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Task Assignment Notification</h2>
          <p>Dear <strong>${worker.name}</strong>,</p>
          <p>You have been assigned a new task:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Task Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${taskName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Task Details</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${taskDetails}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date(taskDueDate).toDateString()}</td>
            </tr>
          </table>
          <p>Make sure to complete it on time.</p>
          <p style="margin-top: 20px;"><strong>${companyName}</strong> - HR Team</p>
        </div>
      </div>
    `;

    await sendTaskEmail(worker.email, "New Task Assigned: " + taskName, emailHtml);

    res.redirect("/tasks");
  } catch (error) {
    console.error("Error assigning task:", error.message);
    res.status(500).send("Failed to assign task. Please ensure all data is correct and try again.");
  }
});

module.exports = router;
