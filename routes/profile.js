const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// @route   GET api/profile
// @desc    Get current user's profile
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error("Error in GET /api/profile:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put("/", auth, async (req, res) => {
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

    // Build profile object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (email) profileFields.email = email;
    if (age) profileFields.age = age;
    if (gender) profileFields.gender = gender;
    if (fitnessLevel) profileFields.fitnessLevel = fitnessLevel;
    if (preferredWorkouts) profileFields.preferredWorkouts = preferredWorkouts;
    if (bio) profileFields.bio = bio;
    if (location) profileFields.location = location;

    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error("Error in PUT /api/profile:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
