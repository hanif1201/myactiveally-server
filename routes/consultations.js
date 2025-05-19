// routes/consultations.js - Consultation routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const consultationController = require("../controllers/consultationController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");
const Consultation = require("../models/Consultation");
const User = require("../models/User");

// @route   GET api/consultations
// @desc    Get all consultations for a user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const consultations = await Consultation.find({
      $or: [{ client: req.user.id }, { instructor: req.user.id }],
    })
      .populate("client", "name email")
      .populate("instructor", "name email")
      .sort({ date: -1 });
    res.json(consultations);
  } catch (err) {
    console.error("Error in GET /api/consultations:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/consultations/:id
// @desc    Get consultation by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate("client", "name email")
      .populate("instructor", "name email");

    if (!consultation) {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    // Check if user is part of the consultation
    if (
      consultation.client._id.toString() !== req.user.id &&
      consultation.instructor._id.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    res.json(consultation);
  } catch (err) {
    console.error("Error in GET /api/consultations/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Consultation not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   POST api/consultations
// @desc    Create a consultation request
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { instructorId, date, time, duration, type, notes } = req.body;

    // Check if instructor exists and is active
    const instructor = await User.findOne({
      _id: instructorId,
      role: "instructor",
      isActive: true,
    });

    if (!instructor) {
      return res.status(404).json({ msg: "Instructor not found or inactive" });
    }

    const newConsultation = new Consultation({
      client: req.user.id,
      instructor: instructorId,
      date,
      time,
      duration,
      type,
      notes,
      status: "pending",
    });

    const consultation = await newConsultation.save();

    // Populate user details
    await consultation.populate("client", "name email");
    await consultation.populate("instructor", "name email");

    res.json(consultation);
  } catch (err) {
    console.error("Error in POST /api/consultations:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   PUT api/consultations/:id
// @desc    Update consultation status
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { status, notes } = req.body;

    let consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    // Check if user is the instructor
    if (consultation.instructor.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Build update object
    const updateFields = {};
    if (status) updateFields.status = status;
    if (notes) updateFields.notes = notes;

    consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    )
      .populate("client", "name email")
      .populate("instructor", "name email");

    res.json(consultation);
  } catch (err) {
    console.error("Error in PUT /api/consultations/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Consultation not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   DELETE api/consultations/:id
// @desc    Cancel a consultation
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    // Check if user is part of this consultation
    if (
      consultation.client.toString() !== req.user.id &&
      consultation.instructor.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Only allow cancellation if status is pending
    if (consultation.status !== "pending") {
      return res
        .status(400)
        .json({ msg: "Cannot cancel a consultation that is not pending" });
    }

    await consultation.remove();
    res.json({ msg: "Consultation cancelled" });
  } catch (err) {
    console.error("Error in DELETE /api/consultations/:id:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Consultation not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
});

// @route   GET api/consultations/instructor/:instructorId
// @desc    Get all consultations for an instructor
// @access  Private
router.get("/instructor/:instructorId", auth, async (req, res) => {
  try {
    const consultations = await Consultation.find({
      instructor: req.params.instructorId,
    })
      .populate("client", "name email")
      .populate("instructor", "name email")
      .sort({ date: -1 });

    res.json(consultations);
  } catch (err) {
    console.error(
      "Error in GET /api/consultations/instructor/:instructorId:",
      err.message
    );
    res.status(500).json({ msg: "Server error" });
  }
});

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
