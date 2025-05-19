const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

const PlannedWorkoutSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  location: {
    type: String,
  },
  status: {
    type: String,
    enum: ["proposed", "confirmed", "completed", "cancelled"],
    default: "proposed",
  },
  notes: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MatchSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    matchScore: {
      type: Number, // Calculated based on matching algorithm
      min: 0,
      max: 100,
      default: 0,
    },
    compatibilityFactors: {
      locationProximity: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      fitnessGoals: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      workoutPreferences: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      availabilityOverlap: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      experienceLevel: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    messages: [MessageSchema],
    lastMessageTimestamp: {
      type: Date,
      default: null,
    },
    plannedWorkouts: [PlannedWorkoutSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    matchedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: function () {
        // Default expiration of 7 days if not responded to
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      },
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
MatchSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Update lastMessageTimestamp when a new message is added
MatchSchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.lastMessageTimestamp = Date.now();
  }
  next();
});

module.exports = mongoose.model("Match", MatchSchema);
