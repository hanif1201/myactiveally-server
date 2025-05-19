const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't return password in queries by default
    },
    userType: {
      type: String,
      enum: ["user", "instructor"],
      default: "user",
    },
    profileImage: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      min: 16,
      max: 100,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      address: {
        type: String,
        default: "",
      },
    },
    fitnessLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "professional"],
      default: "beginner",
    },
    fitnessGoals: [
      {
        type: String,
        enum: [
          "weight_loss",
          "muscle_gain",
          "endurance",
          "strength",
          "flexibility",
          "toning",
          "general_fitness",
        ],
      },
    ],
    preferredWorkouts: [
      {
        type: String,
        enum: [
          "cardio",
          "weight_lifting",
          "yoga",
          "pilates",
          "crossfit",
          "functional",
          "hiit",
          "swimming",
          "running",
          "cycling",
          "other",
        ],
      },
    ],
    availability: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
        startTime: String, // Format: "HH:MM"
        endTime: String, // Format: "HH:MM"
      },
    ],
    preferredGender: {
      type: String,
      enum: ["male", "female", "any"],
      default: "any",
    },
    preferredAgeMin: {
      type: Number,
      min: 16,
      max: 100,
      default: 18,
    },
    preferredAgeMax: {
      type: Number,
      min: 16,
      max: 100,
      default: 100,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accountStatus: {
      type: String,
      enum: ["pending", "active", "suspended", "deleted"],
      default: "pending",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    favoritedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    favoriteGyms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gym",
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

// Create index for location-based queries
UserSchema.index({ location: "2dsphere" });

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
