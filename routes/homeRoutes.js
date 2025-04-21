const express = require("express");
const router = express.Router();
const { Worker } = require("../config/db");

// Homepage - Show workers of the logged-in admin only
router.get("/", async (req, res) => {
  try {
    const workers = await Worker.find({ createdBy: req.session.adminId });
    res.render("home", { workers });
  } catch (err) {
    console.error("Error fetching workers:", err);
    res.render("home", { workers: [], error: "Failed to load workers." });
  }
});

module.exports = router;
