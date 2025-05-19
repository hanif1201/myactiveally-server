// routes/auth.js - Authentication routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      age,
      gender,
      fitnessLevel,
      preferredWorkouts,
      bio,
      location,
    } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role: role || "client",
      age,
      gender,
      fitnessLevel,
      preferredWorkouts,
      bio,
      location,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
      },
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error("Error in POST /api/auth/register:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ msg: "Account is deactivated" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
      },
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error("Error in POST /api/auth/login:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/auth/user
// @desc    Get authenticated user
// @access  Private
router.get("/user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error("Error in GET /api/auth/user:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/auth/refresh
// @desc    Refresh authentication token
// @access  Private
router.post("/refresh", auth, authController.refreshToken);

// @route   PUT api/auth/password
// @desc    Change password
// @access  Private
router.put(
  "/password",
  [
    auth,
    check("currentPassword", "Current password is required").exists(),
    check(
      "newPassword",
      "Please enter a new password with 6 or more characters"
    ).isLength({ min: 6 }),
    validation,
  ],
  authController.changePassword
);

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { user: { id: user.id } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // TODO: Send reset email with token
    // For now, just return the token
    res.json({ msg: "Password reset email sent", resetToken });
  } catch (err) {
    console.error("Error in POST /api/auth/forgot-password:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id);

    if (!user) {
      return res.status(400).json({ msg: "Invalid token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    res.json({ msg: "Password reset successful" });
  } catch (err) {
    console.error("Error in POST /api/auth/reset-password:", err.message);
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ msg: "Invalid token" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/auth/admin/login
// @desc    Authenticate admin & get token
// @access  Public
router.post(
  "/admin/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
    validation,
  ],
  authController.adminLogin
);

module.exports = router;
