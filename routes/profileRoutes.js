const express = require('express');
const router = express.Router();
const { Admin } = require('../config/db');

// Middleware to protect route
router.use((req, res, next) => {
  if (!req.session.adminId) return res.redirect('/login');
  next();
});

// Show profile
router.get('/profile', async (req, res) => {
  const user = await Admin.findById(req.session.adminId);
  res.render('profile', { user });
});

// Update profile
router.post('/profile/update', async (req, res) => {
  const { username, password, companyName } = req.body;
  await Admin.findByIdAndUpdate(req.session.adminId, { username, password, companyName });
  res.redirect('/profile');
});

module.exports = router;
