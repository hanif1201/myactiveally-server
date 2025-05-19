// routes/ai.js - AI workout generation routes
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const aiController = require("../controllers/aiController");
const auth = require("../middleware/auth");
const validation = require("../middleware/validation");

// @route   POST api/ai/workout-plan
// @desc    Generate a personalized workout plan
// @access  Private
router.post("/workout-plan", auth, aiController.generateWorkoutPlan);

// @route   POST api/ai/nutrition-plan
// @desc    Generate a personalized nutrition plan
// @access  Private
router.post("/nutrition-plan", auth, aiController.generateNutritionPlan);

// @route   POST api/ai/fitness-advice
// @desc    Get AI-powered fitness advice
// @access  Private
router.post("/fitness-advice", auth, aiController.getFitnessAdvice);

// @route   GET api/ai/workout-questions
// @desc    Generate workout questions based on user profile
// @access  Private
router.get("/workout-questions", auth, aiController.getWorkoutQuestions);

// @route   POST api/ai/exercise-recommendations
// @desc    Get exercise recommendations
// @access  Private
router.post(
  "/exercise-recommendations",
  [
    auth,
    check("targetMuscles", "Target muscles are required").isArray(),
    validation,
  ],
  aiController.getExerciseRecommendations
);

// @route   GET api/ai/workouts/:workoutId/analyze
// @desc    Analyze workout and provide feedback
// @access  Private
router.get("/workouts/:workoutId/analyze", auth, aiController.analyzeWorkout);

// @route   POST api/ai/nutrition-advice
// @desc    Generate nutrition advice
// @access  Private
router.post(
  "/nutrition-advice",
  [auth, check("goal", "Fitness goal is required").not().isEmpty(), validation],
  aiController.getNutritionAdvice
);

module.exports = router;
