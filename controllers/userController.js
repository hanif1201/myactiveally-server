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
