// routes/consultations.js - Consultation routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const consultationController = require("../controllers/consultationController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");

// @route   POST api/consultations
// @desc    Book a consultation with an instructor
// @access  Private
router.post(
  "/",
  [
    auth,
    check("instructorId", "Instructor ID is required").not().isEmpty(),
    check("startTime", "Start time is required").not().isEmpty(),
    check("endTime", "End time is required").not().isEmpty(),
    check("consultationType", "Consultation type is required").isIn([
      "one_time",
      "recurring",
      "package",
    ]),
    check("focus", "Focus area is required").isIn([
      "general_fitness",
      "weight_loss",
      "muscle_gain",
      "nutrition",
      "injury_recovery",
      "sport_specific",
      "other",
    ]),
    validation,
  ],
  consultationController.bookConsultation
);

// @route   GET api/consultations/:consultationId
// @desc    Get consultation details
// @access  Private
router.get("/:consultationId", auth, consultationController.getConsultation);

// @route   PUT api/consultations/:consultationId/status
// @desc    Update consultation status
// @access  Private
router.put(
  "/:consultationId/status",
  [
    auth,
    check("status", "Status is required").isIn([
      "confirmed",
      "completed",
      "cancelled",
      "refunded",
    ]),
    validation,
  ],
  consultationController.updateConsultationStatus
);

// @route   POST api/consultations/:consultationId/rate
// @desc    Rate a completed consultation
// @access  Private
router.post(
  "/:consultationId/rate",
  [
    auth,
    check("rating", "Rating must be between 1 and 5").isInt({ min: 1, max: 5 }),
    validation,
  ],
  consultationController.rateConsultation
);

// @route   POST api/consultations/:consultationId/documents
// @desc    Add a document to a consultation
// @access  Private
router.post(
  "/:consultationId/documents",
  [
    auth,
    check("name", "Document name is required").not().isEmpty(),
    check("url", "Document URL is required").not().isEmpty(),
    validation,
  ],
  consultationController.addConsultationDocument
);

// @route   GET api/consultations/instructors/:instructorId/availability
// @desc    Get available time slots for an instructor
// @access  Private
router.get(
  "/instructors/:instructorId/availability",
  auth,
  consultationController.getInstructorAvailability
);

// @route   POST api/consultations/webhook
// @desc    Stripe webhook for payment events
// @access  Public
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  consultationController.handleStripeWebhook
);

module.exports = router;
