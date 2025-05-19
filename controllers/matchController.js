// controllers/matchController.js - Match controller (continued)
// Plan a workout together
exports.planWorkout = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { date, locationId, workoutId, status } = req.body;

    // Validate date
    const workoutDate = new Date(date);
    if (isNaN(workoutDate.getTime())) {
      return res.status(400).json({ msg: "Invalid date format" });
    }

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Verify the user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res
        .status(403)
        .json({ msg: "Not authorized to plan workouts in this match" });
    }

    // Check if match is accepted
    if (match.status !== "accepted") {
      return res
        .status(400)
        .json({ msg: "Cannot plan workouts in a match that is not accepted" });
    }

    // Create planned workout
    const plannedWorkout = {
      date: workoutDate,
      location: locationId || null,
      workout: workoutId || null,
      status: status || "proposed",
      proposer: req.user.id,
    };

    match.plannedWorkouts.push(plannedWorkout);
    await match.save();

    // Add a message about the planned workout
    const messageContent = `📅 I planned a workout for ${workoutDate.toLocaleDateString()}. Check it out!`;
    match.messages.push({
      sender: req.user.id,
      content: messageContent,
      timestamp: Date.now(),
      isRead: false,
    });
    match.lastMessageTimestamp = Date.now();

    await match.save();

    // TODO: Send notification to the other user

    res.json(match.plannedWorkouts[match.plannedWorkouts.length - 1]);
  } catch (err) {
    console.error("Error in planWorkout:", err.message);
    res.status(500).send("Server error");
  }
};

// Update planned workout status
exports.updatePlannedWorkout = async (req, res) => {
  try {
    const { matchId, workoutId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["proposed", "confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Verify the user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res
        .status(403)
        .json({ msg: "Not authorized to update workouts in this match" });
    }

    // Find the planned workout
    const workoutIndex = match.plannedWorkouts.findIndex(
      (workout) => workout._id.toString() === workoutId
    );

    if (workoutIndex === -1) {
      return res.status(404).json({ msg: "Planned workout not found" });
    }

    // Update the status
    match.plannedWorkouts[workoutIndex].status = status;

    // Add a message about the status update
    let messageContent = "";
    switch (status) {
      case "confirmed":
        messageContent = "✅ I confirmed our planned workout!";
        break;
      case "completed":
        messageContent = "🏆 I marked our workout as completed!";
        break;
      case "cancelled":
        messageContent = "❌ I had to cancel our planned workout.";
        break;
      default:
        messageContent = `I updated our workout status to ${status}.`;
    }

    match.messages.push({
      sender: req.user.id,
      content: messageContent,
      timestamp: Date.now(),
      isRead: false,
    });
    match.lastMessageTimestamp = Date.now();

    await match.save();

    // TODO: Send notification to the other user

    res.json(match.plannedWorkouts[workoutIndex]);
  } catch (err) {
    console.error("Error in updatePlannedWorkout:", err.message);
    res.status(500).send("Server error");
  }
};

// Get active matches for the current user
exports.getActiveMatches = async (req, res) => {
  try {
    // Find active matches where the user is either initiator or receiver
    const matches = await Match.find({
      users: req.user.id,
      status: "accepted",
      isActive: true,
    })
      .populate("users", "name profileImage")
      .select("-messages") // Exclude messages for performance
      .sort({ lastMessageTimestamp: -1 });

    res.json(matches);
  } catch (err) {
    console.error("Error in getActiveMatches:", err.message);
    res.status(500).send("Server error");
  }
};

// Get pending matches for the current user
exports.getPendingMatches = async (req, res) => {
  try {
    // Find pending matches
    const pendingMatches = await Match.find({
      $or: [
        { initiator: req.user.id, status: "pending" },
        { receiver: req.user.id, status: "pending" },
      ],
      isActive: true,
    })
      .populate("initiator", "name profileImage")
      .populate("receiver", "name profileImage")
      .select("-messages") // Exclude messages for performance
      .sort({ matchedAt: -1 });

    res.json(pendingMatches);
  } catch (err) {
    console.error("Error in getPendingMatches:", err.message);
    res.status(500).send("Server error");
  }
};

// Unmatch with a user
exports.unmatch = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Verify the user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res
        .status(403)
        .json({ msg: "Not authorized to unmatch this user" });
    }

    // Soft delete by marking as inactive
    match.isActive = false;
    await match.save();

    res.json({ msg: "Successfully unmatched" });
  } catch (err) {
    console.error("Error in unmatch:", err.message);
    res.status(500).send("Server error");
  }
};

// Get match suggestions based on compatibility
exports.getMatchSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Ensure user has a complete profile
    if (!user.isProfileComplete) {
      return res.status(400).json({
        msg: "Please complete your profile before getting match suggestions",
      });
    }

    // Get user's location
    const userLocation = user.location.coordinates;

    // Maximum distance in kilometers
    const maxDistance = req.query.distance ? parseInt(req.query.distance) : 10;

    // Find potential matches with filtering
    const potentialMatches = await User.find({
      _id: { $ne: req.user.id }, // Not the current user
      userType: "user", // Only match with regular users, not instructors
      isProfileComplete: true, // Only users with complete profiles
      isActive: true, // Only active users
      accountStatus: "active", // Only active accounts
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
      // Match gender preferences
      gender:
        user.preferredGender !== "any"
          ? user.preferredGender
          : { $exists: true },
      // Age range
      age: {
        $gte: user.preferredAgeMin || 16,
        $lte: user.preferredAgeMax || 100,
      },
    }).select(
      "name profileImage bio fitnessLevel fitnessGoals preferredWorkouts location"
    );

    // Get existing matches to exclude
    const existingMatches = await Match.find({
      $or: [{ initiator: req.user.id }, { receiver: req.user.id }],
    });

    const existingMatchUserIds = existingMatches.map((match) => {
      if (match.initiator.toString() === req.user.id) {
        return match.receiver.toString();
      }
      return match.initiator.toString();
    });

    // Filter out users who already have a match with the current user
    const filteredMatches = potentialMatches.filter(
      (match) => !existingMatchUserIds.includes(match._id.toString())
    );

    // Calculate compatibility scores for each potential match
    const matchesWithScores = filteredMatches.map((potentialMatch) => {
      const { matchScore, compatibilityFactors } = calculateMatchScore(
        user,
        potentialMatch
      );
      return {
        user: potentialMatch,
        matchScore,
        compatibilityFactors,
      };
    });

    // Sort by match score (highest first)
    matchesWithScores.sort((a, b) => b.matchScore - a.matchScore);

    // Return top matches (limit to 10)
    res.json(matchesWithScores.slice(0, 10));
  } catch (err) {
    console.error("Error in getMatchSuggestions:", err.message);
    res.status(500).send("Server error");
  }
};

const Match = require("../models/Match");
const User = require("../models/User");

// Create a new match request
exports.createMatch = async (req, res) => {
  try {
    const { receiverId } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ msg: "Receiver not found" });
    }

    // Check if match already exists
    const existingMatch = await Match.findOne({
      $or: [
        { initiator: req.user.id, receiver: receiverId },
        { initiator: receiverId, receiver: req.user.id },
      ],
    });

    if (existingMatch) {
      return res.status(400).json({ msg: "Match already exists" });
    }

    // Create new match
    const match = new Match({
      initiator: req.user.id,
      receiver: receiverId,
      status: "pending",
      users: [req.user.id, receiverId],
      matchedAt: Date.now(),
      isActive: true,
    });

    await match.save();

    // Populate user details
    await match.populate("initiator receiver", "name profileImage");

    res.json(match);
  } catch (err) {
    console.error("Error in createMatch:", err.message);
    res.status(500).send("Server error");
  }
};

// Respond to a match request
exports.respondToMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { status } = req.body;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Verify the user is the receiver
    if (match.receiver.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ msg: "Not authorized to respond to this match" });
    }

    // Update match status
    match.status = status;
    if (status === "accepted") {
      match.acceptedAt = Date.now();
    }

    await match.save();

    // Populate user details
    await match.populate("initiator receiver", "name profileImage");

    res.json(match);
  } catch (err) {
    console.error("Error in respondToMatch:", err.message);
    res.status(500).send("Server error");
  }
};

// Get match details
exports.getMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId)
      .populate("initiator receiver", "name profileImage")
      .populate("messages.sender", "name profileImage");

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Verify the user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res.status(403).json({ msg: "Not authorized to view this match" });
    }

    res.json(match);
  } catch (err) {
    console.error("Error in getMatchDetails:", err.message);
    res.status(500).send("Server error");
  }
};

// Send a message in a match
exports.sendMessage = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { content } = req.body;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Verify the user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res
        .status(403)
        .json({ msg: "Not authorized to send messages in this match" });
    }

    // Add message
    match.messages.push({
      sender: req.user.id,
      content,
      timestamp: Date.now(),
      isRead: false,
    });
    match.lastMessageTimestamp = Date.now();

    await match.save();

    // Populate sender details
    await match.populate("messages.sender", "name profileImage");

    res.json(match.messages[match.messages.length - 1]);
  } catch (err) {
    console.error("Error in sendMessage:", err.message);
    res.status(500).send("Server error");
  }
};

// Get messages for a match
exports.getMessages = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { limit = 50, before } = req.query;

    const match = await Match.findById(matchId).populate(
      "messages.sender",
      "name profileImage"
    );

    if (!match) {
      return res.status(404).json({ msg: "Match not found" });
    }

    // Verify the user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res
        .status(403)
        .json({ msg: "Not authorized to view messages in this match" });
    }

    // Filter messages if 'before' timestamp is provided
    let messages = match.messages;
    if (before) {
      messages = messages.filter((msg) => msg.timestamp < parseInt(before));
    }

    // Sort by timestamp and limit
    messages.sort((a, b) => b.timestamp - a.timestamp);
    messages = messages.slice(0, parseInt(limit));

    res.json(messages);
  } catch (err) {
    console.error("Error in getMessages:", err.message);
    res.status(500).send("Server error");
  }
};

// Get match suggestions
exports.getMatchSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Find potential matches based on preferences
    const suggestions = await User.find({
      _id: { $ne: req.user.id },
      isActive: true,
      accountStatus: "active",
      preferredWorkouts: { $in: user.preferredWorkouts },
      fitnessLevel: user.fitnessLevel,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: user.location.coordinates,
          },
          $maxDistance: 50000, // 50km radius
        },
      },
    })
      .select(
        "name profileImage location.address fitnessLevel preferredWorkouts"
      )
      .limit(20);

    res.json(suggestions);
  } catch (err) {
    console.error("Error in getMatchSuggestions:", err.message);
    res.status(500).send("Server error");
  }
};
