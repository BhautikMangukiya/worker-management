const express = require("express");
const router = express.Router();
const { Worker, Attendance } = require("../config/db.js");
const sendTaskEmail = require("../utils/sendmail");

// Middleware to check login
function isLoggedIn(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    return res.redirect("/login");
  }
}

// Show attendance page (only admin's workers)
router.get("/attendance", isLoggedIn, async (req, res) => {
  const selectedDate = req.query.selectedDate || new Date().toISOString().split("T")[0];
  const adminId = req.session.adminId;

  try {
    const workers = await Worker.find({ createdBy: adminId });
    const workerIds = workers.map((w) => w._id);

    const attendanceData = await Attendance.find({
      workerId: { $in: workerIds },
      date: selectedDate,
    });

    const attendanceMap = {};
    attendanceData.forEach((att) => {
      attendanceMap[att.workerId.toString()] = att;
    });

    const records = workers.map((worker) => ({
      ...worker._doc,
      status: attendanceMap[worker._id]?.status || null,
      note: attendanceMap[worker._id]?.note || "",
    }));

    res.render("Attendance", {
      records,
      selectedDate,
    });
  } catch (error) {
    console.error(`[GET /attendance] Error loading attendance:`, error);
    return res.status(500).render("error", { message: "Failed to load attendance data." });
  }
});

// Update attendance & send email (only for admin's workers)
router.post("/attendance/updateAll", isLoggedIn, async (req, res) => {
  const { status, note, date } = req.body;
  const adminId = req.session.adminId;

  try {
    const workers = await Worker.find({ createdBy: adminId });
    const allowedWorkerIds = workers.map((w) => w._id.toString());

    const updatePromises = Object.keys(status).map(async (workerId) => {
      if (!allowedWorkerIds.includes(workerId)) return;

      const attendanceStatus = status[workerId];
      const attendanceNote = note[workerId] || "";

      try {
        await Attendance.findOneAndUpdate(
          { workerId, date },
          {
            workerId,
            status: attendanceStatus,
            date,
            note: attendanceNote,
            createdBy: adminId,
          },
          { upsert: true }
        );

        const worker = await Worker.findById(workerId);
        if (!worker) {
          console.warn(`[POST /attendance/updateAll] Worker not found: ${workerId}`);
          return;
        }

        const emailHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; padding: 30px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
              <h2 style="color: #2E86C1; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Attendance Update Notification</h2>
              <p style="color:black">Dear <strong>${worker.name}</strong>,</p>
              <p style="color:black">Your attendance has been updated:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; background-color: #f1f1f1;"><strong>Date</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${new Date(date).toDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; background-color: #f1f1f1;"><strong>Status</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${attendanceStatus}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; background-color: #f1f1f1;"><strong>Note</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${attendanceNote || "No note provided"}</td>
                </tr>
              </table>
              <p style="color:black">If you have questions, contact HR.</p>
              <p style="color:black">Regards,</p>
              <p style="color:black"><strong>Codenest Infotech</strong><br/>HR Team</p>
              <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #888;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        `;

        await sendTaskEmail(
          worker.email,
          `Attendance Updated for ${new Date(date).toDateString()}`,
          emailHtml
        );
      } catch (innerError) {
        console.error(`[POST /attendance/updateAll] Error updating attendance or sending email for workerId: ${workerId}`, innerError);
      }
    });

    await Promise.all(updatePromises);

    res.redirect(`/attendance?selectedDate=${date}`);
  } catch (err) {
    console.error(`[POST /attendance/updateAll] Error saving attendance:`, err);
    return res.status(500).render("error", { message: "Failed to update attendance records." });
  }
});

module.exports = router;
