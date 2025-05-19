// routes/gyms.js - Gym facility routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const gymController = require("../controllers/gymController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");

// @route   GET api/gyms/nearby
// @desc    Get nearby gyms
// @access  Private
router.get("/nearby", auth, gymController.getNearbyGyms);

// @route   GET api/gyms/:id
// @desc    Get gym details
// @access  Private
router.get("/:id", auth, gymController.getGymDetails);

// @route   POST api/gyms/favorites/:gymId
// @desc    Add a gym to favorites
// @access  Private
router.post("/favorites/:gymId", auth, gymController.addGymToFavorites);

// @route   DELETE api/gyms/favorites/:gymId
// @desc    Remove a gym from favorites
// @access  Private
router.delete("/favorites/:gymId", auth, gymController.removeGymFromFavorites);

// @route   GET api/gyms/favorites
// @desc    Get favorited gyms
// @access  Private
router.get("/favorites", auth, gymController.getFavoriteGyms);

// @route   POST api/gyms/:gymId/reviews
// @desc    Add a review to a gym
// @access  Private
router.post(
  "/:gymId/reviews",
  [
    auth,
    check("rating", "Rating must be between 1 and 5").isInt({ min: 1, max: 5 }),
    validation,
  ],
  gymController.addGymReview
);

// @route   GET api/gyms/search
// @desc    Search gyms by name or address
// @access  Private
router.get("/search", auth, gymController.searchGyms);

// @route   GET api/gyms/:gymId/instructors
// @desc    Get instructors associated with a gym
// @access  Private
router.get("/:gymId/instructors", auth, gymController.getGymInstructors);

module.exports = router;
