// utils/matching.js - Matching algorithm helpers
const User = require("../models/User");
const geocodeUtils = require("./geocode");

// Calculate compatibility score between users
exports.calculateCompatibilityScore = (user1, user2) => {
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Fitness goals compatibility (weight: 30%)
  const goalScore = calculateArrayOverlapScore(
    user1.fitnessGoals || [],
    user2.fitnessGoals || []
  );
  totalScore += goalScore * 30;
  maxPossibleScore += 30;

  // Workout preferences compatibility (weight: 25%)
  const workoutScore = calculateArrayOverlapScore(
    user1.preferredWorkouts || [],
    user2.preferredWorkouts || []
  );
  totalScore += workoutScore * 25;
  maxPossibleScore += 25;

  // Fitness level compatibility (weight: 15%)
  const levelScore = calculateLevelCompatibility(
    user1.fitnessLevel,
    user2.fitnessLevel
  );
  totalScore += levelScore * 15;
  maxPossibleScore += 15;

  // Location proximity (weight: 20%)
  let locationScore = 0;
  if (user1.location?.coordinates && user2.location?.coordinates) {
    const distance = geocodeUtils.calculateDistance(
      user1.location.coordinates,
      user2.location.coordinates
    );

    // Score based on proximity
    if (distance <= 1) {
      locationScore = 1; // Within 1km
    } else if (distance <= 5) {
      locationScore = 0.8; // Within 5km
    } else if (distance <= 10) {
      locationScore = 0.6; // Within 10km
    } else if (distance <= 20) {
      locationScore = 0.4; // Within 20km
    } else if (distance <= 50) {
      locationScore = 0.2; // Within 50km
    } else {
      locationScore = 0; // Beyond 50km
    }
  }
  totalScore += locationScore * 20;
  maxPossibleScore += 20;

  // Availability overlap (weight: 10%)
  const availabilityScore = calculateAvailabilityOverlap(
    user1.availability || [],
    user2.availability || []
  );
  totalScore += availabilityScore * 10;
  maxPossibleScore += 10;

  // Calculate percentage score (0-100)
  const percentageScore =
    maxPossibleScore > 0
      ? Math.round((totalScore / maxPossibleScore) * 100)
      : 0;

  return {
    score: percentageScore,
    details: {
      fitnessGoals: Math.round(goalScore * 100),
      workoutPreferences: Math.round(workoutScore * 100),
      fitnessLevel: Math.round(levelScore * 100),
      locationProximity: Math.round(locationScore * 100),
      availabilityOverlap: Math.round(availabilityScore * 100),
    },
  };
};

// Calculate score based on array overlap (0-1)
const calculateArrayOverlapScore = (array1, array2) => {
  if (!array1.length || !array2.length) return 0;

  const set1 = new Set(array1);
  const set2 = new Set(array2);

  // Calculate intersection
  const intersection = new Set([...set1].filter((item) => set2.has(item)));

  // Calculate Jaccard index (intersection over union)
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
};

// Calculate fitness level compatibility (0-1)
const calculateLevelCompatibility = (level1, level2) => {
  const levels = ["beginner", "intermediate", "advanced", "professional"];

  if (!level1 || !level2) return 0.5; // Default to medium compatibility

  const index1 = levels.indexOf(level1);
  const index2 = levels.indexOf(level2);

  if (index1 === -1 || index2 === -1) return 0.5;

  // Calculate level difference (0-3)
  const difference = Math.abs(index1 - index2);

  // Convert to compatibility score (0-1)
  return 1 - difference / 3;
};

// Calculate availability overlap (0-1)
const calculateAvailabilityOverlap = (availability1, availability2) => {
  if (!availability1.length || !availability2.length) return 0;

  let overlapCount = 0;
  let totalSlots = 0;

  // Create day map for faster lookup
  const availabilityMap = {};

  // Populate map with user1's availability
  for (const slot of availability1) {
    const { day, startTime, endTime } = slot;
    if (!availabilityMap[day]) {
      availabilityMap[day] = [];
    }
    availabilityMap[day].push({ startTime, endTime });
    totalSlots++;
  }

  // Check user2's availability against user1's
  for (const slot of availability2) {
    const { day, startTime, endTime } = slot;

    if (availabilityMap[day]) {
      // Check for overlap with any slot on this day
      for (const userSlot of availabilityMap[day]) {
        if (
          hasTimeOverlap(
            startTime,
            endTime,
            userSlot.startTime,
            userSlot.endTime
          )
        ) {
          overlapCount++;
          break; // Count overlap only once per day
        }
      }
    }
    totalSlots++;
  }

  // Calculate overlap ratio
  return overlapCount / (totalSlots / 2); // Divide by 2 to normalize
};

// Check if two time slots overlap
const hasTimeOverlap = (start1, end1, start2, end2) => {
  // Convert times to minutes for easier comparison
  const convertToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const start1Mins = convertToMinutes(start1);
  const end1Mins = convertToMinutes(end1);
  const start2Mins = convertToMinutes(start2);
  const end2Mins = convertToMinutes(end2);

  // Check for overlap
  return start1Mins < end2Mins && start2Mins < end1Mins;
};

// Find potential matches for a user
exports.findPotentialMatches = async (userId, options = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Default options
    const {
      maxDistance = 20, // km
      limit = 10,
      minScore = 50, // Minimum compatibility score (%)
    } = options;

    // Find users who might be a good match
    const potentialMatches = await User.find({
      _id: { $ne: userId }, // Not the current user
      userType: "user", // Only match with regular users
      isProfileComplete: true, // Only users with complete profiles
      isActive: true,
      accountStatus: "active",
      // Filter by gender preference if specified
      ...(user.preferredGender !== "any" && {
        gender: user.preferredGender,
      }),
      // Filter by age range if specified
      ...(user.preferredAgeMin && {
        age: { $gte: user.preferredAgeMin },
      }),
      ...(user.preferredAgeMax && {
        age: { $lte: user.preferredAgeMax },
      }),
      // Location filter (if user has set location)
      ...(user.location?.coordinates &&
        user.location.coordinates[0] !== 0 &&
        user.location.coordinates[1] !== 0 && {
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: user.location.coordinates,
              },
              $maxDistance: maxDistance * 1000, // Convert to meters
            },
          },
        }),
    }).select(
      "name profileImage bio fitnessLevel fitnessGoals preferredWorkouts location availability"
    );

    // Calculate compatibility scores
    const matchesWithScores = [];

    for (const potentialMatch of potentialMatches) {
      const { score, details } = exports.calculateCompatibilityScore(
        user,
        potentialMatch
      );

      if (score >= minScore) {
        matchesWithScores.push({
          user: potentialMatch,
          compatibilityScore: score,
          compatibilityDetails: details,
        });
      }
    }

    // Sort by compatibility score (highest first)
    matchesWithScores.sort(
      (a, b) => b.compatibilityScore - a.compatibilityScore
    );

    // Return top matches up to the limit
    return matchesWithScores.slice(0, limit);
  } catch (err) {
    console.error("Error in findPotentialMatches:", err.message);
    throw err;
  }
};
