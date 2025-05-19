// routes/matches.js - Match routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const matchController = require("../controllers/matchController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");
const Match = require("../models/Match");
const User = require("../models/User");

// @route   GET api/matches
// @desc    Get all matches for a user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ initiator: req.user.id }, { receiver: req.user.id }],
    })
      .populate("initiator", "name email profileImage")
      .populate("receiver", "name email profileImage")
      .sort({ matchedAt: -1 });
    res.json(matches);
  } catch (err) {
    console.error("Error in GET /api/matches:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/matches/:id
// @desc    Get match by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("initiator", "name email profileImage")
      .populate("receiver", "name email profileImage");

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Check if user is part of the match
    if (
      match.initiator._id.toString() !== req.user.id &&
      match.receiver._id.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    res.json(match);
  } catch (err) {
    console.error("Error in GET /api/matches/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Match not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/matches
// @desc    Create a match request
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { receiver, message } = req.body;

    // Check if receiver exists
    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res.status(404).json({ msg: "Receiver not found" });
    }

    // Check if match already exists
    const existingMatch = await Match.findOne({
      $or: [
        { initiator: req.user.id, receiver: receiver },
        { initiator: receiver, receiver: req.user.id },
      ],
    });

    if (existingMatch) {
      return res.status(400).json({ msg: "Match already exists" });
    }

    const newMatch = new Match({
      initiator: req.user.id,
      receiver,
      status: "pending",
      messages: message
        ? [
            {
              sender: req.user.id,
              content: message,
              timestamp: Date.now(),
            },
          ]
        : [],
    });

    const match = await newMatch.save();
    await match.populate("initiator", "name email profileImage");
    await match.populate("receiver", "name email profileImage");

    res.json(match);
  } catch (err) {
    console.error("Error in POST /api/matches:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/matches/:id
// @desc    Update match status
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { status } = req.body;

    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Check if user is the receiver
    if (match.receiver.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    match.status = status;
    if (status === "accepted") {
      match.matchedAt = Date.now();
    }

    match = await match.save();
    await match.populate("initiator", "name email profileImage");
    await match.populate("receiver", "name email profileImage");

    res.json(match);
  } catch (err) {
    console.error("Error in PUT /api/matches/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Match not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   DELETE api/matches/:id
// @desc    Delete a match
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Check if user is part of the match
    if (
      match.initiator.toString() !== req.user.id &&
      match.receiver.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    await match.remove();
    res.json({ msg: "Match removed" });
  } catch (err) {
    console.error("Error in DELETE /api/matches/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Match not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/matches/suggestions
// @desc    Get match suggestions
// @access  Private
router.get("/suggestions", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Find potential matches based on preferences
    const suggestions = await User.find({
      _id: { $ne: req.user.id },
      role: user.role === "client" ? "instructor" : "client",
      isActive: true,
      fitnessLevel: user.fitnessLevel,
      preferredWorkouts: { $in: user.preferredWorkouts },
    })
      .select("name email profileImage fitnessLevel preferredWorkouts bio")
      .limit(10);

    res.json(suggestions);
  } catch (err) {
    console.error("Error in GET /api/matches/suggestions:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
