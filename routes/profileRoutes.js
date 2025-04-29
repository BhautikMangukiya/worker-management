const express = require('express');
const router = express.Router();
const { Admin } = require('../config/db');

// Middleware to protect route
router.use((req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect('/login');
  }
  next();
});

// Show profile
router.get('/profile', async (req, res) => {
  try {
    const user = await Admin.findById(req.session.adminId);

    if (!user) {
      console.error("[GET /profile] Admin not found.");
      return res.redirect('/login');
    }

    res.render('profile', { user });
  } catch (error) {
    console.error("[GET /profile] Error fetching profile:", error);
    res.status(500).send("Something went wrong while loading your profile.");
  }
});

// Update profile
router.post('/profile/update', async (req, res) => {
  const { username, password, companyName } = req.body;

  try {
    const updated = await Admin.findByIdAndUpdate(
      req.session.adminId,
      { username, password, companyName },
      { new: true }
    );

    if (!updated) {
      console.error("[POST /profile/update] Admin not found for update.");
      return res.status(404).send("Admin not found.");
    }

    res.redirect('/profile');
  } catch (error) {
    console.error("[POST /profile/update] Error updating profile:", error);
    res.status(500).send("Something went wrong while updating your profile.");
  }
});

module.exports = router;
