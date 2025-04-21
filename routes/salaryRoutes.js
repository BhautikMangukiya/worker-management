const express = require("express");
const router = express.Router();

router.get("/salary", (req, res) => {
    res.render("salary", { title: "Salary Management" });
})

module.exports = router;