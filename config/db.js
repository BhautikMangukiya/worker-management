require('dotenv').config(); // Must be at the very top
const mongoose = require("mongoose");

// Enhanced MongoDB Connection Function
async function connectDB() {
  // Debug: Verify environment variables are loaded
  console.log('\nEnvironment Variables:', {
    MONGO_URI: process.env.MONGO_URI ? '*****' : 'MISSING'
  });

  const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    retryWrites: true,
    w: 'majority',
    retryReads: true,
    connectTimeoutMS: 10000 // 10 seconds connection timeout
  };

  try {
    // Verify connection string format
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    // Enable Mongoose debugging
    mongoose.set('debug', true);

    // Connection events
    mongoose.connection.on('connecting', () => console.log('\nConnecting to MongoDB...'));
    mongoose.connection.on('connected', () => console.log('\nMongoDB connected!'));
    mongoose.connection.on('disconnected', () => console.log('\nMongoDB disconnected!'));

    const connection = await mongoose.connect(process.env.MONGO_URI, connectionOptions);
    
    console.log('\n✅ MongoDB connected successfully to:', connection.connection.host);
    console.log('\nDatabase Name:', connection.connection.name);
    
    // Verify database exists and is accessible
    const db = mongoose.connection.db;
    await db.command({ ping: 1 });
    console.log('Database ping successful\n');

    
    return connection;
  } catch (err) {
    console.error('\n❌ MongoDB connection error:', err.message);
    
    // Enhanced error diagnostics
    if (err.code === 8000 || err.name === 'MongoServerError') {
      console.error('\n🔐 AUTHENTICATION FAILURE:');
      console.error('1. Verify your credentials in .env file');
      console.error('2. Check special characters in password are URL-encoded');
      console.error('3. Ensure user has proper privileges in Atlas');
    } else if (err.name === 'MongooseTimeoutError') {
      console.error('\n⏱ CONNECTION TIMEOUT:');
      console.error('1. Check your internet connection');
      console.error('2. Verify cluster name in connection string');
      console.error('3. Whitelist your IP in Atlas Network Access');
    }
    
    process.exit(1); // Exit with failure
  }
}

// Enhanced Worker Schema with validations
const workerSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email!`
      }
    },
    phone: { 
      type: String, 
      required: [true, 'Phone is required'],
      validate: {
        validator: function(v) {
          return /^[0-9]{10,15}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },
    jobTitle: { 
      type: String, 
      required: [true, 'Job title is required'],
      trim: true
    },
    position: { 
      type: String, 
      required: [true, 'Position is required'],

    },
    salary: { 
      type: Number, 
      required: [true, 'Salary is required'],
      min: [0, 'Salary must be positive']
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Admin", 
      required: [true, 'Creator ID is required'] 
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Explicitly remove unique indexes
workerSchema.index({ email: 1 }, { unique: false, sparse: true });
workerSchema.index({ phone: 1 }, { unique: false, sparse: true });

// Enhanced Task Schema
const taskSchema = new mongoose.Schema(
  {
    workerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Worker", 
      required: [true, 'Worker ID is required'] 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Admin", 
      required: [true, 'Creator ID is required'] 
    },
    taskName: { 
      type: String, 
      required: [true, 'Task name is required'],
      trim: true,
      maxlength: [200, 'Task name cannot exceed 200 characters']
    },
    taskDetails: { 
      type: String, 
      required: [true, 'Task details are required'],
      trim: true
    },
    taskDueDate: { 
      type: Date, 
      required: [true, 'Due date is required'],
      validate: {
        validator: function(v) {
          return v > new Date();
        },
        message: 'Due date must be in the future'
      }
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending'
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true } 
  }
);

// Enhanced Attendance Schema
const attendanceSchema = new mongoose.Schema({
  workerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Worker", 
    required: [true, 'Worker ID is required'] 
  },
  date: { 
    type: Date, 
    required: [true, 'Date is required'],
    default: Date.now
  },
  status: { 
    type: String, 
    required: [true, 'Status is required'],
    enum: ['Present', 'Absent', 'Late', 'Half Day']
  },
  note: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Note cannot exceed 500 characters']
  },
  recordedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin", 
    required: [true, 'Recorder ID is required'] 
  }
}, { 
  timestamps: true 
});

// Enhanced Admin Schema
const adminSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [4, 'Username must be at least 4 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  mobile: { 
    type: String, 
    required: [true, 'Mobile number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid mobile number!`
    }
  },
  companyName: { 
    type: String, 
    required: [true, 'Company name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, { 
  timestamps: true 
});

// Create models
const Worker = mongoose.model("Worker", workerSchema);
const Task = mongoose.model("Task", taskSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const Admin = mongoose.model("Admin", adminSchema);

// Export with enhanced connection handling
module.exports = {
  mongoose,
  connectDB,
  Worker,
  Task,
  Attendance,
  Admin,
  connection: mongoose.connection // Direct access to connection
};