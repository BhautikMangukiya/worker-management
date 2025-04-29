const express = require("express");
const router = express.Router();
const { Admin } = require("../config/db");
const sendTaskEmail = require("../utils/sendmail");
require("dotenv").config();

let otpStorage = {};

// ------------------- Register ------------------- //
router.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

router.post("/register", async (req, res) => {
  const { username, password, mobile, companyName, email } = req.body;

  try {
    const existing = await Admin.findOne({ username });
    if (existing) {
      return res.render("register", {
        error: "Username already exists.",
        success: null,
      });
    }

    const newAdmin = new Admin({ username, password, mobile, companyName, email });
    await newAdmin.save();

    res.render("login", {
      error: null,
      success: "✅ Admin profile created. Please log in.",
    });
  } catch (error) {
    console.error("[POST /register] Registration error:", error);
    res.render("register", {
      error: "Something went wrong during registration. Please try again.",
      success: null,
    });
  }
});

// ------------------- Login ------------------- //
router.get("/login", (req, res) => {
  res.render("login", {
    error: null,
    success: req.query.success || null,
  });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.render("login", { error: "Admin not found.", success: null });
    }

    if (admin.password !== password) {
      return res.render("login", { error: "Invalid password.", success: null });
    }

    req.session.adminId = admin._id;
    req.session.adminUsername = admin.username;

    res.redirect("/");
  } catch (error) {
    console.error("[POST /login] Login error:", error);
    res.render("login", { error: "Something went wrong during login. Please try again.", success: null });
  }
});

// ------------------- Logout ------------------- //
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("[GET /logout] Logout error:", err);
      return res.status(500).send("Logout failed. Please try again.");
    }
    res.redirect("/login");
  });
});

// ------------------- Forgot Password with Email OTP ------------------- //
router.get('/forgot-password', (req, res) => {
  const step = req.session.step || 1;
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('forgot-password', { step, success, error });
});

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Admin.findOne({ email });
    if (!user) {
      req.flash('error', 'Email not found.');
      return res.redirect('/forgot-password');
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStorage[email] = { otp, expiresAt };

    const htmlContent = `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`;

    await sendTaskEmail(email, 'OTP for Password Reset', htmlContent, null);

    req.session.email = email;
    req.session.step = 2;
    req.flash('success', 'OTP sent to your email.');
    res.redirect('/forgot-password');
  } catch (error) {
    console.error("[POST /send-otp] Sending OTP error:", error);
    req.flash('error', 'Failed to send OTP. Please try again later.');
    res.redirect('/forgot-password');
  }
});

router.post('/verify-otp', (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.email;
    const stored = otpStorage[email];

    if (!stored) {
      req.flash('error', 'No OTP found or it has expired. Please try again.');
      req.session.step = 1;
      return res.redirect('/forgot-password');
    }

    if (String(stored.otp) === String(otp) && stored.expiresAt > Date.now()) {
      delete otpStorage[email];
      req.flash('success', 'OTP verified. You can now reset your password.');
      return res.redirect(`/reset-password?email=${email}`);
    }

    req.flash('error', 'Invalid or expired OTP.');
    res.redirect('/forgot-password');
  } catch (error) {
    console.error("[POST /verify-otp] Verifying OTP error:", error);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/forgot-password');
  }
});

router.get('/reset-password', (req, res) => {
  const email = req.query.email;
  res.render('reset-password', {
    email,
    error: req.flash('error'),
    success: req.flash('success'),
  });
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect(`/reset-password?email=${email}`);
  }

  try {
    const admin = await Admin.findOneAndUpdate(
      { email },
      { password: newPassword }
    );

    if (!admin) {
      req.flash('error', 'Admin not found.');
      return res.redirect(`/reset-password?email=${email}`);
    }

    req.flash('success', 'Password updated! You can now log in.');
    res.redirect('/login');
  } catch (error) {
    console.error("[POST /reset-password] Password reset error:", error);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect(`/reset-password?email=${email}`);
  }
});

module.exports = router;
