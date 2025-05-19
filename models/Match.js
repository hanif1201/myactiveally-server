const mongoose = require("mongoose");

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
    messages: [
      {
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
      },
    ],
    lastMessageTimestamp: {
      type: Date,
      default: null,
    },
    plannedWorkouts: [
      {
        date: Date,
        location: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Gym",
        },
        status: {
          type: String,
          enum: ["proposed", "confirmed", "completed", "cancelled"],
          default: "proposed",
        },
        proposer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        workout: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Workout",
        },
      },
    ],
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", MatchSchema);
