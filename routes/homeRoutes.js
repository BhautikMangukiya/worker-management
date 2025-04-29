const express = require("express");
const router = express.Router();
const { Worker } = require("../config/db");

// Homepage - Show workers of the logged-in admin only
router.get("/", async (req, res) => {
  try {
    const adminId = req.session.adminId;
    if (!adminId) {
      console.warn("[GET /] No admin session found.");
      return res.render("home", { workers: [], error: "Unauthorized access." });
    }

    const workers = await Worker.find({ createdBy: adminId });
    res.render("home", { workers });
  } catch (error) {
    console.error("[GET /] Error fetching workers:", error);
    res.render("home", { workers: [], error: "Failed to load workers. Please try again later." });
  }
});

module.exports = router;
