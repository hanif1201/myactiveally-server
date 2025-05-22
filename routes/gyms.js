// routes/gyms.js - Gym facility routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const gymController = require("../controllers/gymController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");
const Gym = require("../models/Gym");

// @route   GET api/gyms
// @desc    Get all gyms
// @access  Public
router.get("/", async (req, res) => {
  try {
    const gyms = await Gym.find();

    // Log the response data to the terminal
    console.log("API Response - Gyms:", gyms);

    res.json(gyms);
  } catch (err) {
    console.error("Error fetching gyms:", err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET api/gyms/:id
// @desc    Get gym by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id);

    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    res.json(gym);
  } catch (err) {
    console.error("Error in GET /api/gyms/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Gym not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/gyms
// @desc    Create a gym
// @access  Private/Admin
router.post("/", auth, async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      amenities,
      hours,
      location,
    } = req.body;

    const newGym = new Gym({
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      amenities,
      hours,
      location: {
        type: "Point",
        coordinates: [location.lng, location.lat],
      },
    });

    const gym = await newGym.save();
    res.json(gym);
  } catch (err) {
    console.error("Error in POST /api/gyms:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/gyms/:id
// @desc    Update a gym
// @access  Private/Admin
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      amenities,
      hours,
      location,
    } = req.body;

    let gym = await Gym.findById(req.params.id);

    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    // Build gym object
    const gymFields = {};
    if (name) gymFields.name = name;
    if (address) gymFields.address = address;
    if (city) gymFields.city = city;
    if (state) gymFields.state = state;
    if (zipCode) gymFields.zipCode = zipCode;
    if (phone) gymFields.phone = phone;
    if (email) gymFields.email = email;
    if (website) gymFields.website = website;
    if (description) gymFields.description = description;
    if (amenities) gymFields.amenities = amenities;
    if (hours) gymFields.hours = hours;
    if (location) {
      gymFields.location = {
        type: "Point",
        coordinates: [location.lng, location.lat],
      };
    }

    gym = await Gym.findByIdAndUpdate(
      req.params.id,
      { $set: gymFields },
      { new: true }
    );

    res.json(gym);
  } catch (err) {
    console.error("Error in PUT /api/gyms/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Gym not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   DELETE api/gyms/:id
// @desc    Delete a gym
// @access  Private/Admin
router.delete("/:id", auth, async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.id);

    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    await gym.remove();
    res.json({ msg: "Gym removed" });
  } catch (err) {
    console.error("Error in DELETE /api/gyms/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Gym not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/gyms/nearby
// @desc    Get nearby gyms
// @access  Private
router.get("/nearby", auth, gymController.getNearbyGyms);

// @route   GET api/gyms/favorites/:gymId
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
// @desc    Search gyms by name or location
// @access  Public
router.get("/search", async (req, res) => {
  try {
    const { q, lat, lng, radius = 5000 } = req.query;
    let query = {};

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
      ];
    }

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const gyms = await Gym.find(query).sort({ name: 1 });
    res.json(gyms);
  } catch (err) {
    console.error("Error in GET /api/gyms/search:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/gyms/:gymId/instructors
// @desc    Get instructors associated with a gym
// @access  Private
router.get("/:gymId/instructors", auth, gymController.getGymInstructors);

module.exports = router;
