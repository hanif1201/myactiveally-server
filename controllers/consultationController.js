const Consultation = require("../models/Consultation");
const User = require("../models/User");
const Instructor = require("../models/Instructor");
const config = require("../config/config");
const stripe = require("stripe")(config.stripeSecretKey);

// Book a consultation with an instructor
exports.bookConsultation = async (req, res) => {
  try {
    const {
      instructorId,
      startTime,
      endTime,
      consultationType,
      focus,
      notes,
      meetingType,
      locationId,
    } = req.body;

    // Validate instructor exists
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return res.status(404).json({ msg: "Instructor not found" });
    }

    // Verify instructor is verified
    if (!instructor.isVerified) {
      return res.status(400).json({ msg: "Instructor is not verified" });
    }

    // Parse dates
    const consultationStart = new Date(startTime);
    const consultationEnd = new Date(endTime);

    if (
      isNaN(consultationStart.getTime()) ||
      isNaN(consultationEnd.getTime())
    ) {
      return res.status(400).json({ msg: "Invalid date format" });
    }

    // Calculate duration in minutes
    const durationMs = consultationEnd.getTime() - consultationStart.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    if (durationMinutes <= 0 || durationMinutes > 240) {
      // Max 4 hours
      return res.status(400).json({ msg: "Invalid consultation duration" });
    }

    // Check instructor availability
    const overlappingConsultation = await Consultation.findOne({
      instructor: instructorId,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        // Starts during existing consultation
        {
          startTime: { $lte: consultationStart },
          endTime: { $gt: consultationStart },
        },
        // Ends during existing consultation
        {
          startTime: { $lt: consultationEnd },
          endTime: { $gte: consultationEnd },
        },
        // Completely contains existing consultation
        {
          startTime: { $gte: consultationStart },
          endTime: { $lte: consultationEnd },
        },
      ],
    });

    if (overlappingConsultation) {
      return res
        .status(400)
        .json({ msg: "Instructor is not available during this time" });
    }

    // Calculate price based on instructor's hourly rate and duration
    const hourlyRate = instructor.hourlyRate;
    const price = Math.round((hourlyRate * durationMinutes) / 60);

    // Calculate platform fee
    const platformFeePercentage = config.platformFeePercentage / 100;
    const platformFee = Math.round(price * platformFeePercentage);
    const totalAmount = price + platformFee;

    // Create a Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100, // Convert to cents
      currency: "usd",
      metadata: {
        instructorId,
        userId: req.user.id,
        consultationType,
        startTime: consultationStart.toISOString(),
        endTime: consultationEnd.toISOString(),
        duration: durationMinutes.toString(),
      },
    });

    // Create a new consultation
    const consultation = new Consultation({
      instructor: instructorId,
      user: req.user.id,
      startTime: consultationStart,
      endTime: consultationEnd,
      duration: durationMinutes,
      consultationType,
      focus,
      price,
      platformFee,
      totalAmount,
      notes,
      meetingType: meetingType || "video",
      location: meetingType === "in_person" ? locationId : null,
      payment: {
        paymentId: paymentIntent.id,
        status: "pending",
      },
    });

    await consultation.save();

    // Increment instructor's active consultations count
    await Instructor.findByIdAndUpdate(instructorId, {
      $inc: { activeConsultations: 1 },
    });

    // Return consultation with payment intent client secret
    res.json({
      consultation,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Error in bookConsultation:", err.message);
    res.status(500).send("Server error");
  }
};

// Get consultation details
exports.getConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findById(consultationId)
      .populate({
        path: "instructor",
        populate: {
          path: "user",
          select: "name profileImage",
        },
      })
      .populate("user", "name profileImage")
      .populate("location", "name address");

    if (!consultation) {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    // Verify user is authorized to view this consultation
    if (
      consultation.user._id.toString() !== req.user.id &&
      consultation.instructor.user._id.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ msg: "Not authorized to view this consultation" });
    }

    res.json(consultation);
  } catch (err) {
    console.error("Error in getConsultation:", err.message);

    // Check if error is due to invalid ObjectId
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    res.status(500).send("Server error");
  }
};

// Update consultation status
exports.updateConsultationStatus = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["confirmed", "completed", "cancelled", "refunded"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    // Check authorization based on the requested status change
    if (status === "confirmed") {
      // Only instructors can confirm consultations
      const instructor = await Instructor.findOne({ user: req.user.id });

      if (
        !instructor ||
        instructor._id.toString() !== consultation.instructor.toString()
      ) {
        return res
          .status(403)
          .json({ msg: "Not authorized to confirm this consultation" });
      }
    } else if (status === "completed") {
      // Both user and instructor can mark as completed
      const isUser = consultation.user.toString() === req.user.id;
      const instructor = await Instructor.findOne({ user: req.user.id });
      const isInstructor =
        instructor &&
        instructor._id.toString() === consultation.instructor.toString();

      if (!isUser && !isInstructor) {
        return res
          .status(403)
          .json({ msg: "Not authorized to complete this consultation" });
      }
    } else if (status === "cancelled") {
      // Both user and instructor can cancel a consultation
      const isUser = consultation.user.toString() === req.user.id;
      const instructor = await Instructor.findOne({ user: req.user.id });
      const isInstructor =
        instructor &&
        instructor._id.toString() === consultation.instructor.toString();

      if (!isUser && !isInstructor) {
        return res
          .status(403)
          .json({ msg: "Not authorized to cancel this consultation" });
      }

      // If already confirmed and about to start, may need special handling
      const now = new Date();
      if (
        consultation.status === "confirmed" &&
        consultation.startTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
      ) {
        // Less than 24 hours before start time, handle cancellation fee if needed
        // This would typically involve partial refund logic
      }
    } else if (status === "refunded") {
      // Only instructors can issue refunds
      const instructor = await Instructor.findOne({ user: req.user.id });

      if (
        !instructor ||
        instructor._id.toString() !== consultation.instructor.toString()
      ) {
        return res
          .status(403)
          .json({ msg: "Not authorized to refund this consultation" });
      }

      // Process refund through Stripe
      if (consultation.payment.paymentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: consultation.payment.paymentId,
            amount: consultation.totalAmount * 100, // Convert to cents
          });

          // Update payment info
          consultation.payment.status = "refunded";
        } catch (stripeErr) {
          console.error("Stripe refund error:", stripeErr);
          return res
            .status(400)
            .json({ msg: "Error processing refund", error: stripeErr.message });
        }
      }
    }

    // Update consultation status
    consultation.status = status;

    // Update instructor stats if status changes to completed or cancelled
    if (status === "completed") {
      await Instructor.findByIdAndUpdate(consultation.instructor, {
        $inc: {
          activeConsultations: -1,
          completedConsultations: 1,
        },
      });
    } else if (status === "cancelled" || status === "refunded") {
      await Instructor.findByIdAndUpdate(consultation.instructor, {
        $inc: {
          activeConsultations: -1,
          cancelledConsultations: 1,
        },
      });
    }

    await consultation.save();

    // Return updated consultation
    const updatedConsultation = await Consultation.findById(consultationId)
      .populate({
        path: "instructor",
        populate: {
          path: "user",
          select: "name profileImage",
        },
      })
      .populate("user", "name profileImage")
      .populate("location", "name address");

    res.json(updatedConsultation);
  } catch (err) {
    console.error("Error in updateConsultationStatus:", err.message);
    res.status(500).send("Server error");
  }
};

// Rate a completed consultation
exports.rateConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { rating, feedback } = req.body;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5" });
    }

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    // Check if consultation is completed
    if (consultation.status !== "completed") {
      return res
        .status(400)
        .json({ msg: "Can only rate completed consultations" });
    }

    // Determine if the user is rating as the client or the instructor
    const isUser = consultation.user.toString() === req.user.id;
    const instructor = await Instructor.findOne({ user: req.user.id });
    const isInstructor =
      instructor &&
      instructor._id.toString() === consultation.instructor.toString();

    if (!isUser && !isInstructor) {
      return res
        .status(403)
        .json({ msg: "Not authorized to rate this consultation" });
    }

    // Update the appropriate rating
    if (isUser) {
      // User rating the instructor
      consultation.rating.user = {
        rating,
        feedback,
        date: new Date(),
      };

      // Update instructor's average rating
      const instructor = await Instructor.findById(consultation.instructor);

      // Calculate new average rating
      const totalRatings = instructor.totalReviews;
      const currentTotalScore = instructor.averageRating * totalRatings;
      const newTotalScore = currentTotalScore + rating;
      const newTotalRatings = totalRatings + 1;
      const newAverageRating = newTotalScore / newTotalRatings;

      // Update instructor
      await Instructor.findByIdAndUpdate(consultation.instructor, {
        averageRating: newAverageRating,
        totalReviews: newTotalRatings,
        $push: {
          reviews: {
            user: req.user.id,
            rating,
            comment: feedback,
            date: new Date(),
          },
        },
      });
    } else {
      // Instructor rating the user
      consultation.rating.instructor = {
        rating,
        feedback,
        date: new Date(),
      };
    }

    await consultation.save();

    res.json(consultation);
  } catch (err) {
    console.error("Error in rateConsultation:", err.message);
    res.status(500).send("Server error");
  }
};

// Add a document to a consultation
exports.addConsultationDocument = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { name, url } = req.body;

    if (!name || !url) {
      return res
        .status(400)
        .json({ msg: "Document name and URL are required" });
    }

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({ msg: "Consultation not found" });
    }

    // Verify user is authorized to add documents
    const isUser = consultation.user.toString() === req.user.id;
    const instructor = await Instructor.findOne({ user: req.user.id });
    const isInstructor =
      instructor &&
      instructor._id.toString() === consultation.instructor.toString();

    if (!isUser && !isInstructor) {
      return res
        .status(403)
        .json({ msg: "Not authorized to add documents to this consultation" });
    }

    // Add document
    consultation.documents.push({
      name,
      url,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    });

    await consultation.save();

    res.json(consultation.documents);
  } catch (err) {
    console.error("Error in addConsultationDocument:", err.message);
    res.status(500).send("Server error");
  }
};

// Get available time slots for an instructor
exports.getInstructorAvailability = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate date range
    const rangeStart = startDate ? new Date(startDate) : new Date();
    let rangeEnd = endDate ? new Date(endDate) : new Date();

    // Default to 14 days from start if not specified
    if (!endDate) {
      rangeEnd.setDate(rangeEnd.getDate() + 14);
    }

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return res.status(400).json({ msg: "Invalid date format" });
    }

    // Get instructor availability
    const instructor = await Instructor.findById(instructorId);

    if (!instructor) {
      return res.status(404).json({ msg: "Instructor not found" });
    }

    // Get existing bookings within date range
    const existingConsultations = await Consultation.find({
      instructor: instructorId,
      status: { $in: ["pending", "confirmed"] },
      startTime: { $gte: rangeStart },
      endTime: { $lte: rangeEnd },
    }).select("startTime endTime");

    // Generate available time slots based on instructor's schedule
    // and existing bookings
    const availableSlots = [];

    // Loop through each day in the range
    const currentDate = new Date(rangeStart);
    while (currentDate <= rangeEnd) {
      const dayOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][currentDate.getDay()];

      // Find the instructor's availability for this day of the week
      const dayAvailability = instructor.availability.find(
        (a) => a.day === dayOfWeek
      );

      if (
        dayAvailability &&
        dayAvailability.slots &&
        dayAvailability.slots.length > 0
      ) {
        // Loop through each slot for this day
        for (const slot of dayAvailability.slots) {
          if (slot.isBooked) continue;

          // Parse start and end times
          const [startHour, startMinute] = slot.startTime
            .split(":")
            .map(Number);
          const [endHour, endMinute] = slot.endTime.split(":").map(Number);

          // Create date objects for this slot
          const slotStart = new Date(currentDate);
          slotStart.setHours(startHour, startMinute, 0, 0);

          const slotEnd = new Date(currentDate);
          slotEnd.setHours(endHour, endMinute, 0, 0);

          // Skip if slot is in the past
          if (slotEnd < new Date()) continue;

          // Check if slot overlaps with any existing consultations
          const isOverlapping = existingConsultations.some((consultation) => {
            return (
              slotStart < consultation.endTime &&
              slotEnd > consultation.startTime
            );
          });

          if (!isOverlapping) {
            availableSlots.push({
              date: currentDate.toISOString().split("T")[0],
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              duration:
                endHour * 60 + endMinute - (startHour * 60 + startMinute),
            });
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json(availableSlots);
  } catch (err) {
    console.error("Error in getInstructorAvailability:", err.message);
    res.status(500).send("Server error");
  }
};

// Stripe webhook for payment events
exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripeWebhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle specific event types
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;

      // Update consultation payment status
      try {
        const consultation = await Consultation.findOne({
          "payment.paymentId": paymentIntent.id,
        });

        if (consultation) {
          consultation.payment.status = "completed";
          consultation.payment.transactionDate = new Date();

          // If consultation was pending, update to confirmed
          if (consultation.status === "pending") {
            consultation.status = "confirmed";
          }

          await consultation.save();
        }
      } catch (err) {
        console.error(
          "Error updating consultation after payment:",
          err.message
        );
      }
      break;

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;

      // Handle failed payment
      try {
        const consultation = await Consultation.findOne({
          "payment.paymentId": failedPayment.id,
        });

        if (consultation) {
          consultation.payment.status = "failed";
          await consultation.save();
        }
      } catch (err) {
        console.error(
          "Error updating consultation after payment failure:",
          err.message
        );
      }
      break;
  }

  res.json({ received: true });
};
