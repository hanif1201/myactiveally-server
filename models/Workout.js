const mongoose = require("mongoose");

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  sets: Number,
  reps: String, // Can be a range like "8-12" or specific like "10"
  duration: Number, // In seconds, for timed exercises
  restPeriod: Number, // In seconds
  weight: String, // Can be "bodyweight" or a specific weight
  intensity: {
    type: String,
    enum: ["light", "moderate", "heavy", "maximum"],
  },
  notes: String,
  demoUrl: String, // Link to video demonstration
  targetMuscles: [
    {
      type: String,
      enum: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "forearms",
        "quadriceps",
        "hamstrings",
        "calves",
        "glutes",
        "abs",
        "obliques",
        "lower_back",
        "neck",
        "traps",
        "full_body",
        "cardiorespiratory",
      ],
    },
  ],
  equipment: [
    {
      type: String,
      enum: [
        "none",
        "barbell",
        "dumbbell",
        "kettlebell",
        "resistance_band",
        "machine",
        "cable",
        "bodyweight",
        "medicine_ball",
        "stability_ball",
        "foam_roller",
        "bench",
        "pull_up_bar",
        "box",
        "trx",
      ],
    },
  ],
});

const WorkoutDaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  dayNumber: Number,
  focus: {
    type: String,
    enum: [
      "full_body",
      "upper_body",
      "lower_body",
      "push",
      "pull",
      "legs",
      "chest",
      "back",
      "shoulders",
      "arms",
      "core",
      "cardio",
      "hiit",
      "active_recovery",
      "rest",
    ],
  },
  warmup: {
    duration: Number, // In minutes
    description: String,
    exercises: [ExerciseSchema],
  },
  mainWorkout: {
    exercises: [ExerciseSchema],
    format: {
      type: String,
      enum: [
        "straight_sets",
        "circuit",
        "superset",
        "pyramid",
        "interval",
        "amrap",
        "emom",
        "tabata",
      ],
    },
    notes: String,
  },
  cooldown: {
    duration: Number, // In minutes
    description: String,
    exercises: [ExerciseSchema],
  },
  duration: Number, // Estimated duration in minutes
  intensity: {
    type: String,
    enum: ["low", "moderate", "high", "very_high"],
  },
  caloriesBurned: Number, // Estimated calories
  notes: String,
});

const WorkoutSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
    description: String,
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      required: true,
    },
    goal: {
      type: String,
      enum: [
        "weight_loss",
        "muscle_gain",
        "strength",
        "endurance",
        "flexibility",
        "general_fitness",
        "sport_specific",
      ],
      required: true,
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ["days", "weeks", "months"],
        default: "weeks",
      },
    },
    frequency: Number, // Workouts per week
    schedule: [WorkoutDaySchema],
    equipment: [
      {
        type: String,
        enum: [
          "none",
          "minimal",
          "full_gym",
          "home_gym",
          "resistance_bands",
          "dumbbells",
          "barbell",
          "kettlebells",
          "machines",
          "cardio_equipment",
        ],
      },
    ],
    tags: [String],
    notes: String,
    isPublic: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    progressTracking: {
      type: Boolean,
      default: true,
    },
    completionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    usersFollowing: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workout", WorkoutSchema);
