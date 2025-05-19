// routes/auth.js - Authentication routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
    validation,
  ],
  authController.register
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
    validation,
  ],
  authController.login
);

// @route   GET api/auth
// @desc    Get authenticated user
// @access  Private
router.get("/", auth, authController.getUser);

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
// @desc    Request password reset
// @access  Public
router.post(
  "/forgot-password",
  [check("email", "Please include a valid email").isEmail(), validation],
  authController.forgotPassword
);

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  "/reset-password",
  [
    check("token", "Reset token is required").exists(),
    check(
      "newPassword",
      "Please enter a new password with 6 or more characters"
    ).isLength({ min: 6 }),
    validation,
  ],
  authController.resetPassword
);

module.exports = router;
