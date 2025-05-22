// routes/users.js - User routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const instructor = require("../middleware/instructor");
const validation = require("../middleware/validation");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profile-images");
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
  },
});

// @route   GET api/users
// @desc    Get all users
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ name: 1 });

    // Log the response data to the terminal
    console.log("API Response - Users:", users);

    res.json(users);
  } catch (err) {
    console.error("Error in GET /api/users:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error in GET /api/users/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "User not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", auth, userController.getCurrentProfile);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", auth, async (req, res) => {
  try {
    const {
      name,
      email,
      age,
      gender,
      fitnessLevel,
      preferredWorkouts,
      bio,
      location,
    } = req.body;

    // Build user object
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (age) userFields.age = age;
    if (gender) userFields.gender = gender;
    if (fitnessLevel) userFields.fitnessLevel = fitnessLevel;
    if (preferredWorkouts) userFields.preferredWorkouts = preferredWorkouts;
    if (bio) userFields.bio = bio;
    if (location) userFields.location = location;

    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error("Error in PUT /api/users/profile:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/users/instructor-profile
// @desc    Update instructor profile
// @access  Private (Instructors only)
router.put(
  "/instructor-profile",
  [
    auth,
    check("experience", "Experience must be a positive number")
      .optional()
      .isInt({ min: 0 }),
    check("hourlyRate", "Hourly rate must be a positive number")
      .optional()
      .isFloat({ min: 0 }),
    validation,
  ],
  userController.updateInstructorProfile
);

// @route   POST api/users/profile-image
// @desc    Upload profile image
// @access  Private
router.post(
  "/profile-image",
  [auth, upload.single("image")],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }

      user.profileImage = `/uploads/profile-images/${req.file.filename}`;
      await user.save();

      res.json({ profileImage: user.profileImage });
    } catch (err) {
      console.error("Error in POST /api/users/profile-image:", err.message);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

// @route   GET api/users/matches/find
// @desc    Find potential matches
// @access  Private
router.get("/matches/find", auth, userController.findMatches);

// @route   GET api/users/matches/list
// @desc    Get user's matches
// @access  Private
router.get("/matches/list", auth, userController.getUserMatches);

// @route   GET api/users/workouts/list
// @desc    Get user's workouts
// @access  Private
router.get("/workouts/list", auth, userController.getUserWorkouts);

// @route   GET api/users/consultations/list
// @desc    Get user's consultations
// @access  Private
router.get("/consultations/list", auth, userController.getUserConsultations);

// @route   PUT api/users/deactivate
// @desc    Deactivate user account
// @access  Private
router.put("/deactivate", auth, userController.deactivateAccount);

// @route   PUT api/users/reactivate
// @desc    Reactivate user account
// @access  Private
router.put("/reactivate", auth, userController.reactivateAccount);

// @route   DELETE api/users
// @desc    Delete user account
// @access  Private
router.delete("/", auth, userController.deleteAccount);

// @route   GET api/users/nearby
// @desc    Get nearby users
// @access  Private
router.get("/nearby/users", auth, userController.getNearbyUsers);

// @route   GET api/users/nearby/instructors
// @desc    Get nearby instructors
// @access  Private
router.get("/nearby/instructors", auth, userController.getNearbyInstructors);

// @route   POST api/users/favorites/users/:userId
// @desc    Add a user to favorites
// @access  Private
router.post(
  "/favorites/users/:userId",
  auth,
  userController.addUserToFavorites
);

// @route   DELETE api/users/favorites/users/:userId
// @desc    Remove a user from favorites
// @access  Private
router.delete(
  "/favorites/users/:userId",
  auth,
  userController.removeUserFromFavorites
);

// @route   GET api/users/favorites/users
// @desc    Get favorited users
// @access  Private
router.get("/favorites/users", auth, userController.getFavoritedUsers);

module.exports = router;
