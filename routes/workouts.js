const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Workout = require("../models/Workout");
const Match = require("../models/Match");

// @route   GET api/workouts
// @desc    Get all workouts for a user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id }).sort({
      date: -1,
    });
    res.json(workouts);
  } catch (err) {
    console.error("Error in GET /api/workouts:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/workouts/:id
// @desc    Get workout by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ msg: "Workout not found" });
    }

    // Check if user is authorized to view this workout
    if (workout.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    res.json(workout);
  } catch (err) {
    console.error("Error in GET /api/workouts/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Workout not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/workouts
// @desc    Create a workout
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { type, duration, intensity, exercises, notes, date, matchId } =
      req.body;

    const newWorkout = new Workout({
      user: req.user.id,
      type,
      duration,
      intensity,
      exercises,
      notes,
      date: date || Date.now(),
      match: matchId,
    });

    const workout = await newWorkout.save();

    // If this is a planned workout from a match, update the match
    if (matchId) {
      await Match.findByIdAndUpdate(matchId, {
        $push: { plannedWorkouts: workout._id },
      });
    }

    res.json(workout);
  } catch (err) {
    console.error("Error in POST /api/workouts:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/workouts/:id
// @desc    Update a workout
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { type, duration, intensity, exercises, notes, date, status } =
      req.body;

    let workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ msg: "Workout not found" });
    }

    // Check if user is authorized to update this workout
    if (workout.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Build workout object
    const workoutFields = {};
    if (type) workoutFields.type = type;
    if (duration) workoutFields.duration = duration;
    if (intensity) workoutFields.intensity = intensity;
    if (exercises) workoutFields.exercises = exercises;
    if (notes) workoutFields.notes = notes;
    if (date) workoutFields.date = date;
    if (status) workoutFields.status = status;

    workout = await Workout.findByIdAndUpdate(
      req.params.id,
      { $set: workoutFields },
      { new: true }
    );

    res.json(workout);
  } catch (err) {
    console.error("Error in PUT /api/workouts/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Workout not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   DELETE api/workouts/:id
// @desc    Delete a workout
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ msg: "Workout not found" });
    }

    // Check if user is authorized to delete this workout
    if (workout.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    await workout.remove();

    // If this was a planned workout from a match, update the match
    if (workout.match) {
      await Match.findByIdAndUpdate(workout.match, {
        $pull: { plannedWorkouts: workout._id },
      });
    }

    res.json({ msg: "Workout removed" });
  } catch (err) {
    console.error("Error in DELETE /api/workouts/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Workout not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/workouts/match/:matchId
// @desc    Get all workouts for a match
// @access  Private
router.get("/match/:matchId", auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Check if user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    const workouts = await Workout.find({ match: req.params.matchId }).sort({
      date: -1,
    });

    res.json(workouts);
  } catch (err) {
    console.error("Error in GET /api/workouts/match/:matchId:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Match not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
