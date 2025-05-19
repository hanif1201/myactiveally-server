// routes/matches.js - Match routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const matchController = require("../controllers/matchController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");

// @route   POST api/matches
// @desc    Create a new match request
// @access  Private
router.post(
  "/",
  [
    auth,
    check("receiverId", "Receiver ID is required").not().isEmpty(),
    validation,
  ],
  matchController.createMatch
);

// @route   PUT api/matches/:matchId/respond
// @desc    Respond to a match request
// @access  Private
router.put(
  "/:matchId/respond",
  [
    auth,
    check("status", "Status must be accepted or rejected").isIn([
      "accepted",
      "rejected",
    ]),
    validation,
  ],
  matchController.respondToMatch
);

// @route   GET api/matches/:matchId
// @desc    Get match details
// @access  Private
router.get("/:matchId", auth, matchController.getMatchDetails);

// @route   POST api/matches/:matchId/messages
// @desc    Send a message in a match
// @access  Private
router.post(
  "/:matchId/messages",
  [
    auth,
    check("content", "Message content is required").not().isEmpty(),
    validation,
  ],
  matchController.sendMessage
);

// @route   GET api/matches/:matchId/messages
// @desc    Get messages for a match
// @access  Private
router.get("/:matchId/messages", auth, matchController.getMessages);

// @route   POST api/matches/:matchId/workouts
// @desc    Plan a workout together
// @access  Private
router.post(
  "/:matchId/workouts",
  [auth, check("date", "Date is required").not().isEmpty(), validation],
  matchController.planWorkout
);

// @route   PUT api/matches/:matchId/workouts/:workoutId
// @desc    Update planned workout status
// @access  Private
router.put(
  "/:matchId/workouts/:workoutId",
  [
    auth,
    check("status", "Status is required").isIn([
      "proposed",
      "confirmed",
      "completed",
      "cancelled",
    ]),
    validation,
  ],
  matchController.updatePlannedWorkout
);

// @route   GET api/matches/active
// @desc    Get active matches for the current user
// @access  Private
router.get("/list/active", auth, matchController.getActiveMatches);

// @route   GET api/matches/pending
// @desc    Get pending matches for the current user
// @access  Private
router.get("/list/pending", auth, matchController.getPendingMatches);

// @route   PUT api/matches/:matchId/unmatch
// @desc    Unmatch with a user
// @access  Private
router.put("/:matchId/unmatch", auth, matchController.unmatch);

// @route   GET api/matches/suggestions
// @desc    Get match suggestions based on compatibility
// @access  Private
router.get("/suggestions", auth, matchController.getMatchSuggestions);

module.exports = router;
