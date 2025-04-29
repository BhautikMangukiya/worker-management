const express = require('express');
const router = express.Router();
const { Admin } = require('../config/db'); // Adjust path if needed

// GET: Show the forgot username form
router.get('/forgot-username', (req, res) => {
  res.render('forgot-username', { error: null, success: null, showForm: false });
});

// POST: Verify password (step 1)
router.post('/forgot-username', async (req, res) => {
  const { companyName, password } = req.body;

  try {
    const user = await Admin.findOne({ companyName });

    if (!user || user.password !== password) {
      return res.render('forgot-username', {
        error: '❌ Invalid company name or password.',
        success: null,
        showForm: false,
      });
    }

    // Show username update form
    res.render('forgot-username', {
      error: null,
      success: null,
      showForm: true,
      companyName,
    });
  } catch (err) {
    console.error("Error during verifying password for forgot-username:", err);
    res.render('forgot-username', {
      error: '❌ An unexpected error occurred. Please try again later.',
      success: null,
      showForm: false,
    });
  }
});

// POST: Update the username (step 2)
router.post('/update-username', async (req, res) => {
  const { newUsername, companyName } = req.body;

  try {
    const user = await Admin.findOne({ companyName });

    if (!user) {
      return res.render('forgot-username', {
        error: '❌ Company not found.',
        success: null,
        showForm: false,
      });
    }

    user.username = newUsername;
    await user.save();

    // ✅ Redirect to login with success message
    res.render('login', {
      error: null,
      success: '✅ Username changed successfully! Please login with new credentials.',
    });

  } catch (err) {
    console.error("Error while updating username:", err);
    res.render('forgot-username', {
      error: '❌ An unexpected error occurred while updating username. Please try again later.',
      success: null,
      showForm: false,
    });
  }
});

module.exports = router;
