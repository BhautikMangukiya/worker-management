const nodemailer = require("nodemailer");
const { Admin } = require("../config/db.js");
require("dotenv").config();

// Create reusable transporter object using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER, // your email
    pass: process.env.MAIL_PASS, // your Gmail App Password
  },
});


async function sendTaskEmail(to, subject, htmlContent, createdBy) {
  try {
    // Fetch the admin from database using ID
    const admin = await Admin.findById(createdBy);
    const companyName = admin?.companyName || "Staff Manager";

    const mailOptions = {
      from: `${companyName} | HR Team <${process.env.MAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      replyTo: "bhautikmangukiya.webmigrates@gmail.com",
    };

    // Send email
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

module.exports = sendTaskEmail;
