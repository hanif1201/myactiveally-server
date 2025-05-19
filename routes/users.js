// routes/users.js - User routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const instructor = require("../middleware/instructor");
const validation = require("../middleware/validation");

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", auth, userController.getCurrentProfile);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  [
    auth,
    check("name", "Name is required").optional(),
    check("age", "Age must be between 16 and 100")
      .optional()
      .isInt({ min: 16, max: 100 }),
    check("gender", "Invalid gender")
      .optional()
      .isIn(["male", "female", "other", "prefer_not_to_say"]),
    check("fitnessLevel", "Invalid fitness level")
      .optional()
      .isIn(["beginner", "intermediate", "advanced", "professional"]),
    validation,
  ],
  userController.updateProfile
);

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
  [
    auth,
    check("imageUrl", "Image URL is required").not().isEmpty(),
    validation,
  ],
  userController.uploadProfileImage
);

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get("/:id", auth, userController.getUserById);

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
