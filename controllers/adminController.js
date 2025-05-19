// controllers/adminController.js - Admin dashboard and management
const User = require("../models/User");
const Instructor = require("../models/Instructor");
const Gym = require("../models/Gym");
const Match = require("../models/Match");
const Consultation = require("../models/Consultation");
const Workout = require("../models/Workout");

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user stats
    const totalUsers = await User.countDocuments({ userType: "user" });
    const activeUsers = await User.countDocuments({
      userType: "user",
      isActive: true,
      accountStatus: "active",
    });

    // Get instructor stats
    const totalInstructors = await Instructor.countDocuments();
    const pendingInstructors = await Instructor.countDocuments({
      isVerified: false,
    });

    // Get gym stats
    const totalGyms = await Gym.countDocuments();
    const verifiedGyms = await Gym.countDocuments({ isVerified: true });

    // Get match stats
    const totalMatches = await Match.countDocuments();
    const activeMatches = await Match.countDocuments({
      status: "accepted",
      isActive: true,
    });

    // Get consultation stats
    const totalConsultations = await Consultation.countDocuments();
    const activeConsultations = await Consultation.countDocuments({
      status: { $in: ["pending", "confirmed"] },
    });

    // Get workout stats
    const totalWorkouts = await Workout.countDocuments();
    const aiGeneratedWorkouts = await Workout.countDocuments({
      isAiGenerated: true,
    });

    // Get recent activity
    const recentActivity = await getRecentActivity();

    // Get user growth data (monthly for the last 6 months)
    const userGrowth = await getUserGrowthData();

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      instructors: {
        total: totalInstructors,
        pending: pendingInstructors,
      },
      gyms: {
        total: totalGyms,
        verified: verifiedGyms,
      },
      matches: {
        total: totalMatches,
        active: activeMatches,
      },
      consultations: {
        total: totalConsultations,
        active: activeConsultations,
      },
      workouts: {
        total: totalWorkouts,
        aiGenerated: aiGeneratedWorkouts,
      },
      recentActivity,
      userGrowth,
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err.message);
    res.status(500).send("Server error");
  }
};

// Helper function to get recent activity
const getRecentActivity = async () => {
  const activities = [];

  // Get recent user registrations
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name createdAt userType");

  recentUsers.forEach((user) => {
    activities.push({
      type: "user_registered",
      user: { id: user._id, name: user.name },
      timestamp: user.createdAt,
    });
  });

  // Get recent consultations
  const recentConsultations = await Consultation.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("user", "name")
    .populate({
      path: "instructor",
      populate: { path: "user", select: "name" },
    });

  recentConsultations.forEach((consultation) => {
    activities.push({
      type: "consultation_booked",
      user: { id: consultation.user._id, name: consultation.user.name },
      instructor: {
        id: consultation.instructor.user._id,
        name: consultation.instructor.user.name,
      },
      timestamp: consultation.createdAt,
    });
  });

  // Get recent matches
  const recentMatches = await Match.find()
    .sort({ matchedAt: -1 })
    .limit(5)
    .populate("initiator", "name")
    .populate("receiver", "name");

  recentMatches.forEach((match) => {
    activities.push({
      type: "match_created",
      users: [
        { id: match.initiator._id, name: match.initiator.name },
        { id: match.receiver._id, name: match.receiver.name },
      ],
      timestamp: match.matchedAt,
    });
  });

  // Sort all activities by timestamp (newest first)
  activities.sort((a, b) => b.timestamp - a.timestamp);

  // Return the 10 most recent activities
  return activities.slice(0, 10);
};

// Helper function to get user growth data
const getUserGrowthData = async () => {
  const months = [];
  const counts = [];

  // Get current date
  const currentDate = new Date();

  // Loop for the last 6 months
  for (let i = 5; i >= 0; i--) {
    const month = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1
    );
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i + 1,
      1
    );

    // Get month name
    const monthName = month.toLocaleString("default", { month: "short" });
    months.push(monthName);

    // Count users registered in this month
    const count = await User.countDocuments({
      createdAt: { $gte: month, $lt: nextMonth },
    });
    counts.push(count);
  }

  return { months, counts };
};

// Get all users (with pagination and filtering)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.accountStatus = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getAllUsers:", err.message);
    res.status(500).send("Server error");
  }
};

// Get all instructors (with pagination and filtering)
exports.getAllInstructors = async (req, res) => {
  try {
    const { page = 1, limit = 10, verified, search } = req.query;

    // Build filter object
    const filter = {};

    if (verified) {
      filter.isVerified = verified === "true";
    }

    // Get instructor IDs that match the search
    let instructorIds = [];
    if (search) {
      const userIds = await User.find({
        userType: "instructor",
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      instructorIds = userIds.map((user) => user._id);

      if (instructorIds.length > 0) {
        filter.user = { $in: instructorIds };
      } else {
        // No matches found
        return res.json({
          instructors: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0,
          },
        });
      }
    }

    // Get total count for pagination
    const total = await Instructor.countDocuments(filter);

    // Get instructors with pagination
    const instructors = await Instructor.find(filter)
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      instructors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getAllInstructors:", err.message);
    res.status(500).send("Server error");
  }
};

// Get all gyms (with pagination and filtering)
exports.getAllGyms = async (req, res) => {
  try {
    const { page = 1, limit = 10, verified, search } = req.query;

    // Build filter object
    const filter = {};

    if (verified) {
      filter.isVerified = verified === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.formattedAddress": { $regex: search, $options: "i" } },
      ];
    }

    // Get total count for pagination
    const total = await Gym.countDocuments(filter);

    // Get gyms with pagination
    const gyms = await Gym.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      gyms,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getAllGyms:", err.message);
    res.status(500).send("Server error");
  }
};

// Get all matches (with pagination and filtering)
exports.getAllMatches = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    // Get total count for pagination
    const total = await Match.countDocuments(filter);

    // Get matches with pagination
    const matches = await Match.find(filter)
      .populate("initiator", "name profileImage")
      .populate("receiver", "name profileImage")
      .sort({ matchedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      matches,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getAllMatches:", err.message);
    res.status(500).send("Server error");
  }
};

// Get all consultations (with pagination and filtering)
exports.getAllConsultations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    // Get total count for pagination
    const total = await Consultation.countDocuments(filter);

    // Get consultations with pagination
    const consultations = await Consultation.find(filter)
      .populate("user", "name profileImage")
      .populate({
        path: "instructor",
        populate: { path: "user", select: "name profileImage" },
      })
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      consultations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getAllConsultations:", err.message);
    res.status(500).send("Server error");
  }
};

// Get all workouts (with pagination and filtering)
exports.getAllWorkouts = async (req, res) => {
  try {
    const { page = 1, limit = 10, isAiGenerated } = req.query;

    // Build filter object
    const filter = {};

    if (isAiGenerated !== undefined) {
      filter.isAiGenerated = isAiGenerated === "true";
    }

    // Get total count for pagination
    const total = await Workout.countDocuments(filter);

    // Get workouts with pagination
    const workouts = await Workout.find(filter)
      .populate("creator", "name profileImage")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      workouts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getAllWorkouts:", err.message);
    res.status(500).send("Server error");
  }
};

// Verify an instructor
exports.verifyInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;

    const instructor = await Instructor.findById(instructorId);

    if (!instructor) {
      return res.status(404).json({ msg: "Instructor not found" });
    }

    instructor.isVerified = true;
    await instructor.save();

    res.json({ msg: "Instructor verified successfully", instructor });
  } catch (err) {
    console.error("Error in verifyInstructor:", err.message);
    res.status(500).send("Server error");
  }
};

// Verify a gym
exports.verifyGym = async (req, res) => {
  try {
    const { gymId } = req.params;

    const gym = await Gym.findById(gymId);

    if (!gym) {
      return res.status(404).json({ msg: "Gym not found" });
    }

    gym.isVerified = true;
    await gym.save();

    res.json({ msg: "Gym verified successfully", gym });
  } catch (err) {
    console.error("Error in verifyGym:", err.message);
    res.status(500).send("Server error");
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["active", "inactive", "suspended", "deleted"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Update user status
    user.accountStatus = status;
    user.isActive = status === "active";

    await user.save();

    res.json({ msg: "User status updated successfully", user });
  } catch (err) {
    console.error("Error in updateUserStatus:", err.message);
    res.status(500).send("Server error");
  }
};

// Create a new admin user
exports.createAdminUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create new admin user
    user = new User({
      name,
      email,
      password,
      userType: "user",
      role: "admin",
      isProfileComplete: true,
      accountStatus: "active",
      isActive: true,
      emailVerified: true,
    });

    await user.save();

    res.json({
      msg: "Admin user created successfully",
      user: { id: user._id, name, email },
    });
  } catch (err) {
    console.error("Error in createAdminUser:", err.message);
    res.status(500).send("Server error");
  }
};

// Get reports and analytics
exports.getReports = async (req, res) => {
  try {
    // User Statistics
    const userStats = await getUserStats();

    // Instructor Statistics
    const instructorStats = await getInstructorStats();

    // Consultation Statistics
    const consultationStats = await getConsultationStats();

    // Match Statistics
    const matchStats = await getMatchStats();

    res.json({
      userStats,
      instructorStats,
      consultationStats,
      matchStats,
    });
  } catch (err) {
    console.error("Error in getReports:", err.message);
    res.status(500).send("Server error");
  }
};

// Helper function to get user statistics
const getUserStats = async () => {
  // Get current date
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // User counts
  const totalUsers = await User.countDocuments({ userType: "user" });
  const newUsersThisMonth = await User.countDocuments({
    userType: "user",
    createdAt: { $gte: thisMonth },
  });
  const newUsersLastMonth = await User.countDocuments({
    userType: "user",
    createdAt: { $gte: lastMonth, $lt: thisMonth },
  });

  // Growth percentage
  const userGrowthRate =
    lastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
      : 100;

  // User distribution by fitness level
  const beginners = await User.countDocuments({ fitnessLevel: "beginner" });
  const intermediate = await User.countDocuments({
    fitnessLevel: "intermediate",
  });
  const advanced = await User.countDocuments({ fitnessLevel: "advanced" });
  const professional = await User.countDocuments({
    fitnessLevel: "professional",
  });

  return {
    totalUsers,
    newUsersThisMonth,
    userGrowthRate,
    fitnessLevelDistribution: {
      beginner: beginners,
      intermediate,
      advanced,
      professional,
    },
  };
};

// Helper function to get instructor statistics
const getInstructorStats = async () => {
  const totalInstructors = await Instructor.countDocuments();
  const verifiedInstructors = await Instructor.countDocuments({
    isVerified: true,
  });
  const pendingInstructors = totalInstructors - verifiedInstructors;

  // Top rated instructors
  const topInstructors = await Instructor.find({ isVerified: true })
    .sort({ averageRating: -1 })
    .limit(5)
    .populate("user", "name profileImage");

  return {
    totalInstructors,
    verifiedInstructors,
    pendingInstructors,
    verificationRate:
      totalInstructors > 0 ? (verifiedInstructors / totalInstructors) * 100 : 0,
    topInstructors,
  };
};

// Helper function to get consultation statistics
const getConsultationStats = async () => {
  const totalConsultations = await Consultation.countDocuments();
  const completedConsultations = await Consultation.countDocuments({
    status: "completed",
  });
  const cancelledConsultations = await Consultation.countDocuments({
    status: "cancelled",
  });

  // Calculate average consultation rating
  const consultations = await Consultation.find({ status: "completed" });
  let totalRating = 0;
  let ratedConsultations = 0;

  consultations.forEach((consultation) => {
    if (
      consultation.rating &&
      consultation.rating.user &&
      consultation.rating.user.rating
    ) {
      totalRating += consultation.rating.user.rating;
      ratedConsultations++;
    }
  });

  const averageRating =
    ratedConsultations > 0 ? totalRating / ratedConsultations : 0;

  // Revenue from consultations
  const revenue = await Consultation.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: null, total: { $sum: "$price" } } },
  ]);

  const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;

  return {
    totalConsultations,
    completedConsultations,
    cancelledConsultations,
    completionRate:
      totalConsultations > 0
        ? (completedConsultations / totalConsultations) * 100
        : 0,
    averageRating,
    totalRevenue,
    platformFees: totalRevenue * 0.1, // Assuming 10% platform fee
  };
};

// Helper function to get match statistics
const getMatchStats = async () => {
  const totalMatches = await Match.countDocuments();
  const acceptedMatches = await Match.countDocuments({ status: "accepted" });
  const rejectedMatches = await Match.countDocuments({ status: "rejected" });

  return {
    totalMatches,
    acceptedMatches,
    rejectedMatches,
    acceptanceRate:
      totalMatches > 0 ? (acceptedMatches / totalMatches) * 100 : 0,
  };
};
