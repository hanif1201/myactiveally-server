// routes/admin.js - Admin routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validation = require("../middleware/validation");
const User = require("../models/User");
const Gym = require("../models/Gym");
const Consultation = require("../models/Consultation");

// All routes in this file are protected with auth and admin middleware
router.use(auth, admin);

// @route   GET api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get("/dashboard", adminController.getDashboardStats);

// @route   GET api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
router.get("/users", adminController.getAllUsers);

// @route   GET api/admin/instructors
// @desc    Get all instructors with pagination and filtering
// @access  Private (Admin only)
router.get("/instructors", adminController.getAllInstructors);

// @route   GET api/admin/gyms
// @desc    Get all gyms with pagination and filtering
// @access  Private (Admin only)
router.get("/gyms", adminController.getAllGyms);

// @route   GET api/admin/matches
// @desc    Get all matches with pagination and filtering
// @access  Private (Admin only)
router.get("/matches", adminController.getAllMatches);

// @route   GET api/admin/consultations
// @desc    Get all consultations with pagination and filtering
// @access  Private (Admin only)
router.get("/consultations", adminController.getAllConsultations);

// @route   GET api/admin/workouts
// @desc    Get all workouts with pagination and filtering
// @access  Private (Admin only)
router.get("/workouts", adminController.getAllWorkouts);

// @route   PUT api/admin/instructors/:instructorId/verify
// @desc    Verify an instructor
// @access  Private (Admin only)
router.put(
  "/instructors/:instructorId/verify",
  adminController.verifyInstructor
);

// @route   PUT api/admin/gyms/:gymId/verify
// @desc    Verify a gym
// @access  Private (Admin only)
router.put("/gyms/:gymId/verify", adminController.verifyGym);

// @route   PUT api/admin/users/:userId/status
// @desc    Update user status
// @access  Private (Admin only)
router.put(
  "/users/:userId/status",
  [
    check("status", "Status is required").isIn([
      "active",
      "inactive",
      "suspended",
      "deleted",
    ]),
    validation,
  ],
  adminController.updateUserStatus
);

// @route   POST api/admin/users/admin
// @desc    Create a new admin user
// @access  Private (Admin only)
router.post(
  "/users/admin",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
    validation,
  ],
  adminController.createAdminUser
);

// @route   GET api/admin/reports
// @desc    Get reports and analytics
// @access  Private (Admin only)
router.get("/reports", adminController.getReports);

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ msg: "Not authorized as admin" });
    }
    next();
  } catch (err) {
    console.error("Error in isAdmin middleware:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get("/users", [auth, isAdmin], async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Error in GET /api/admin/users:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/admin/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get("/users/:id", [auth, isAdmin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error in GET /api/admin/users/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "User not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/admin/users/:id
// @desc    Update user status
// @access  Private/Admin
router.put("/users/:id", [auth, isAdmin], async (req, res) => {
  try {
    const { isActive, role } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Build update object
    const updateFields = {};
    if (typeof isActive === "boolean") updateFields.isActive = isActive;
    if (role) updateFields.role = role;

    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error("Error in PUT /api/admin/users/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "User not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/admin/gyms
// @desc    Get all gyms
// @access  Private/Admin
router.get("/gyms", [auth, isAdmin], async (req, res) => {
  try {
    const gyms = await Gym.find().sort({ name: 1 });
    res.json(gyms);
  } catch (err) {
    console.error("Error in GET /api/admin/gyms:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/admin/gyms/:id
// @desc    Update gym status
// @access  Private/Admin
router.put("/gyms/:id", [auth, isAdmin], async (req, res) => {
  try {
    const { isActive } = req.body;

    let gym = await Gym.findById(req.params.id);

    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    gym.isActive = isActive;
    await gym.save();

    res.json(gym);
  } catch (err) {
    console.error("Error in PUT /api/admin/gyms/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Gym not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/admin/consultations
// @desc    Get all consultations
// @access  Private/Admin
router.get("/consultations", [auth, admin], async (req, res) => {
  try {
    const consultations = await Consultation.find()
      .populate("client", "name email")
      .populate("instructor", "name email")
      .sort({ date: -1 });
    res.json(consultations);
  } catch (err) {
    console.error("Error in GET /api/admin/consultations:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/admin/stats
// @desc    Get system statistics
// @access  Private/Admin
router.get("/stats", [auth, admin], async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalInstructors,
      activeInstructors,
      totalGyms,
      activeGyms,
      totalConsultations,
      pendingConsultations,
      completedConsultations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "instructor" }),
      User.countDocuments({ role: "instructor", isActive: true }),
      Gym.countDocuments(),
      Gym.countDocuments({ isActive: true }),
      Consultation.countDocuments(),
      Consultation.countDocuments({ status: "pending" }),
      Consultation.countDocuments({ status: "completed" }),
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        instructors: {
          total: totalInstructors,
          active: activeInstructors,
        },
      },
      gyms: {
        total: totalGyms,
        active: activeGyms,
      },
      consultations: {
        total: totalConsultations,
        pending: pendingConsultations,
        completed: completedConsultations,
      },
    });
  } catch (err) {
    console.error("Error in GET /api/admin/stats:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
