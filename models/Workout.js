const mongoose = require("mongoose");

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  sets: {
    type: Number,
    required: true,
    min: 1,
  },
  reps: {
    type: Number,
    required: true,
    min: 1,
  },
  duration: {
    type: Number,
    min: 0,
  },
  restPeriod: Number, // In seconds
  weight: {
    type: Number,
    min: 0,
  },
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["strength", "cardio", "flexibility", "hiit", "other"],
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    intensity: {
      type: String,
      required: true,
      enum: ["low", "medium", "high"],
    },
    exercises: [ExerciseSchema],
    notes: String,
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["planned", "completed", "cancelled"],
      default: "planned",
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
    },
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

// Update the updatedAt timestamp before saving
WorkoutSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Workout", WorkoutSchema);
