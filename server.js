const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");
const flash = require("connect-flash");

dotenv.config();

const { connectDB, Admin } = require("./config/db");

// Routes
const homeRoutes = require("./routes/homeRoutes");
const workerRoutes = require("./routes/workerRoutes");
const taskRoutes = require("./routes/taskRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const loginRoutes = require("./routes/loginRoutes");
const profileRoutes = require("./routes/profileRoutes");
const usernameRoutes = require("./routes/usernameRoutes");

const app = express();
const PORT = process.env.PORT || 8000;

// Set EJS view engine
app.set("view engine", "ejs");

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Session and flash setup
app.use(session({
  secret: process.env.SESSION_SECRET || "defaultSecretKey",
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inject user data into EJS views
app.use(async (req, res, next) => {
  if (req.session && req.session.adminId) {
    try {
      const user = await Admin.findById(req.session.adminId);
      res.locals.user = user;
    } catch (err) {
      console.error("Session middleware error:", err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

// Public routes
app.use(loginRoutes);
app.use(usernameRoutes);

// Auth middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.redirect("/login");
}

// Protected routes
app.use("/", isAuthenticated, homeRoutes);
app.use("/", isAuthenticated, workerRoutes);
app.use("/", isAuthenticated, taskRoutes);
app.use("/", isAuthenticated, attendanceRoutes);
app.use("/", isAuthenticated, salaryRoutes);
app.use("/", isAuthenticated, profileRoutes);

// Start server and connect to DB
async function startServer() {
  await connectDB();

  // Create a default admin if not exists
  const existing = await Admin.findOne({ username: "Admin123" });
  if (!existing) {
    await Admin.create({
      username: "Admin123",
      password: "Admin@123",
      mobile: "8780341577",
      companyName: "Admin Testing",
      email: "Bhautikmangukiya2005@gmail.com",
    });
    console.log("✅ Default admin created");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

startServer();
