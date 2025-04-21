// ✅ config/db.js (Duplicate-friendly Version)

const mongoose = require("mongoose");

// MongoDB Connection Function
function connectDB() {
  mongoose
    .connect(process.env.mongo_uri)
    .then(() => console.log("\n✅ MongoDB connected successfully"))
    .catch((err) => console.error("\n❌ MongoDB connection error:", err));
}

// Worker Schema (Allows Duplicate Email/Phone)
const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true }, // No unique
    phone: { type: String, required: true }, // No unique
    jobTitle: { type: String, required: true },
    position: { type: String, required: true },
    salary: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { timestamps: true }
);

// Remove any pre-existing unique indexes on email or phone
workerSchema.index({ email: 1 }, { unique: false });
workerSchema.index({ phone: 1 }, { unique: false });

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    taskName: { type: String, required: true },
    taskDetails: { type: String, required: true },
    taskDueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  name: String,
  workerId: String,
  date: String,
  status: String,
  note: String,
});

// Admin Schema (Keep username unique only)
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  companyName: { type: String, required: true },
  email: { type: String, required: true },
});

// Models
const Worker = mongoose.model("Worker", workerSchema);
const Task = mongoose.model("Task", taskSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const Admin = mongoose.model("Admin", adminSchema);

// Export
module.exports = {
  mongoose,
  connectDB,
  Worker,
  Task,
  Attendance,
  Admin,
};
