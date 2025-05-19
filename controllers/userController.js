const User = require("../models/User");
const Instructor = require("../models/Instructor");
const Match = require("../models/Match");
const Workout = require("../models/Workout");
const Consultation = require("../models/Consultation");

// Get current user profile
exports.getCurrentProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("favoritedUsers", "name profileImage");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error in getCurrentProfile:", err.message);
    res.status(500).send("Server error");
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, age, gender, fitnessLevel } = req.body;

    // Build profile object
    const profileFields = {};
    if (name) profileFields.name = name;
    if (age) profileFields.age = age;
    if (gender) profileFields.gender = gender;
    if (fitnessLevel) profileFields.fitnessLevel = fitnessLevel;

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error in updateProfile:", err.message);
    res.status(500).send("Server error");
  }
};

// Update instructor profile
exports.updateInstructorProfile = async (req, res) => {
  try {
    const { experience, hourlyRate, specializations } = req.body;

    // Build instructor profile object
    const instructorFields = {};
    if (experience) instructorFields.experience = experience;
    if (hourlyRate) instructorFields.hourlyRate = hourlyRate;
    if (specializations) instructorFields.specializations = specializations;

    // Find and update instructor profile
    let instructor = await Instructor.findOne({ user: req.user.id });

    if (instructor) {
      // Update existing instructor profile
      instructor = await Instructor.findOneAndUpdate(
        { user: req.user.id },
        { $set: instructorFields },
        { new: true }
      );
    } else {
      // Create new instructor profile
      instructor = new Instructor({
        user: req.user.id,
        ...instructorFields,
      });
      await instructor.save();
    }

    res.json(instructor);
  } catch (err) {
    console.error("Error in updateInstructorProfile:", err.message);
    res.status(500).send("Server error");
  }
};

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    // Update user's profile image
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profileImage: imageUrl } },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error in uploadProfileImage:", err.message);
    res.status(500).send("Server error");
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("favoritedUsers", "name profileImage");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // If the user is an instructor, get their instructor profile
    if (user.userType === "instructor") {
      const instructorProfile = await Instructor.findOne({ user: user._id });
      if (instructorProfile) {
        user.instructorProfile = instructorProfile;
      }
    }

    res.json(user);
  } catch (err) {
    console.error("Error in getUserById:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "User not found" });
    }
    res.status(500).send("Server error");
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    // Delete associated instructor profile if exists
    if (req.userDetails.userType === "instructor") {
      await Instructor.findOneAndDelete({ user: req.user.id });
    }

    // Delete user's matches
    await Match.deleteMany({
      $or: [{ initiator: req.user.id }, { receiver: req.user.id }],
    });

    // Delete user's workouts (or mark as orphaned)
    await Workout.updateMany(
      { creator: req.user.id },
      { $set: { creator: null } }
    );

    // Delete the user
    await User.findByIdAndDelete(req.user.id);

    res.json({ msg: "Account deleted successfully" });
  } catch (err) {
    console.error("Error in deleteAccount:", err.message);
    res.status(500).send("Server error");
  }
};

// Get nearby users
exports.getNearbyUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get user's location
    const userLocation = user.location.coordinates;

    // Maximum distance in kilometers (default: 10km)
    const maxDistance = req.query.distance ? parseInt(req.query.distance) : 10;

    // Find users within the specified distance
    const nearbyUsers = await User.find({
      _id: { $ne: req.user.id }, // Exclude current user
      isActive: true,
      accountStatus: "active",
      // Location within the specified distance
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: userLocation,
          },
          $maxDistance: maxDistance * 1000, // Convert to meters
        },
      },
    }).select(
      "name profileImage location.address fitnessLevel preferredWorkouts"
    );

    res.json(nearbyUsers);
  } catch (err) {
    console.error("Error in getNearbyUsers:", err.message);
    res.status(500).send("Server error");
  }
};

// Get nearby instructors
exports.getNearbyInstructors = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get user's location
    const userLocation = user.location.coordinates;

    // Maximum distance in kilometers (default: 20km)
    const maxDistance = req.query.distance ? parseInt(req.query.distance) : 20;

    // Find instructors within the specified distance
    const instructorUsers = await User.find({
      userType: "instructor",
      isActive: true,
      accountStatus: "active",
      // Location within the specified distance
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: userLocation,
          },
          $maxDistance: maxDistance * 1000, // Convert to meters
        },
      },
    }).select("_id name profileImage location.address");

    // Get the instructor IDs
    const instructorIds = instructorUsers.map((user) => user._id);

    // Get the instructor profiles with details
    const instructors = await Instructor.find({
      user: { $in: instructorIds },
      isVerified: true,
    })
      .populate("user", "name profileImage location.address")
      .select(
        "specializations experience hourlyRate averageRating totalReviews"
      );

    res.json(instructors);
  } catch (err) {
    console.error("Error in getNearbyInstructors:", err.message);
    res.status(500).send("Server error");
  }
};

// Add a user to favorites
exports.addUserToFavorites = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if the user exists
    const favoriteUser = await User.findById(userId);
    if (!favoriteUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Add user to favorites if not already added
    const user = await User.findById(req.user.id);

    if (user.favoritedUsers.includes(userId)) {
      return res.status(400).json({ msg: "User already in favorites" });
    }

    user.favoritedUsers.push(userId);
    await user.save();

    res.json({
      msg: "User added to favorites",
      favoritedUsers: user.favoritedUsers,
    });
  } catch (err) {
    console.error("Error in addUserToFavorites:", err.message);
    res.status(500).send("Server error");
  }
};

// Remove a user from favorites
exports.removeUserFromFavorites = async (req, res) => {
  try {
    const { userId } = req.params;

    // Remove user from favorites
    const user = await User.findById(req.user.id);

    const index = user.favoritedUsers.indexOf(userId);
    if (index === -1) {
      return res.status(400).json({ msg: "User not in favorites" });
    }

    user.favoritedUsers.splice(index, 1);
    await user.save();

    res.json({
      msg: "User removed from favorites",
      favoritedUsers: user.favoritedUsers,
    });
  } catch (err) {
    console.error("Error in removeUserFromFavorites:", err.message);
    res.status(500).send("Server error");
  }
};

// Get favorited users
exports.getFavoritedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "favoritedUsers",
      "name profileImage bio fitnessLevel preferredWorkouts"
    );

    res.json(user.favoritedUsers);
  } catch (err) {
    console.error("Error in getFavoritedUsers:", err.message);
    res.status(500).send("Server error");
  }
};

// Find potential matches
exports.findMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Get user's preferences and location
    const { preferredWorkouts, fitnessLevel, location } = user;

    // Find potential matches based on preferences
    const potentialMatches = await User.find({
      _id: { $ne: req.user.id }, // Exclude current user
      isActive: true,
      accountStatus: "active",
      preferredWorkouts: { $in: preferredWorkouts },
      fitnessLevel: fitnessLevel,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: location.coordinates,
          },
          $maxDistance: 50000, // 50km radius
        },
      },
    })
      .select(
        "name profileImage location.address fitnessLevel preferredWorkouts"
      )
      .limit(20);

    res.json(potentialMatches);
  } catch (err) {
    console.error("Error in findMatches:", err.message);
    res.status(500).send("Server error");
  }
};

// Get user's matches
exports.getUserMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ initiator: req.user.id }, { receiver: req.user.id }],
      status: "accepted",
    })
      .populate("initiator receiver", "name profileImage fitnessLevel")
      .sort({ createdAt: -1 });

    res.json(matches);
  } catch (err) {
    console.error("Error in getUserMatches:", err.message);
    res.status(500).send("Server error");
  }
};

// Get user's workouts
exports.getUserWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({
      $or: [{ creator: req.user.id }, { participants: req.user.id }],
    })
      .populate("creator", "name profileImage")
      .sort({ date: -1 });

    res.json(workouts);
  } catch (err) {
    console.error("Error in getUserWorkouts:", err.message);
    res.status(500).send("Server error");
  }
};

// Get user's consultations
exports.getUserConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find({
      $or: [{ client: req.user.id }, { instructor: req.user.id }],
    })
      .populate("client instructor", "name profileImage")
      .sort({ date: -1 });

    res.json(consultations);
  } catch (err) {
    console.error("Error in getUserConsultations:", err.message);
    res.status(500).send("Server error");
  }
};

// Deactivate user account
exports.deactivateAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          isActive: false,
          accountStatus: "inactive",
          deactivatedAt: Date.now(),
        },
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ msg: "Account deactivated successfully", user });
  } catch (err) {
    console.error("Error in deactivateAccount:", err.message);
    res.status(500).send("Server error");
  }
};

// Reactivate user account
exports.reactivateAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          isActive: true,
          accountStatus: "active",
          deactivatedAt: null,
        },
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ msg: "Account reactivated successfully", user });
  } catch (err) {
    console.error("Error in reactivateAccount:", err.message);
    res.status(500).send("Server error");
  }
};
