// controllers/aiController.js - AI workout generation
const { Configuration, OpenAIApi } = require("openai");
const config = require("../config/config");
const User = require("../models/User");
const Workout = require("../models/Workout");

// Configure OpenAI
const openaiConfig = new Configuration({
  apiKey: config.openaiApiKey,
});
const openai = new OpenAIApi(openaiConfig);

// Generate a workout plan based on user preferences
exports.generateWorkoutPlan = async (req, res) => {
  try {
    const { goal, fitnessLevel, duration, frequency, equipment, limitations } =
      req.body;

    // Validate required fields
    if (!goal || !fitnessLevel || !duration || !frequency) {
      return res
        .status(400)
        .json({ msg: "Missing required workout parameters" });
    }

    // Get user profile for additional context
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Build prompt for OpenAI
    const prompt = `
    Create a detailed workout plan with the following parameters:
    
    Goal: ${goal}
    Fitness Level: ${fitnessLevel}
    Duration: ${duration} weeks
    Frequency: ${frequency} workouts per week
    Available Equipment: ${equipment || "minimal"}
    ${limitations ? `Limitations/Injuries: ${limitations}` : ""}
    
    User Profile:
    Age: ${user.age || "Not specified"}
    Gender: ${user.gender || "Not specified"}
    Current Fitness Level: ${user.fitnessLevel || "Not specified"}
    Preferred Workout Types: ${
      user.preferredWorkouts
        ? user.preferredWorkouts.join(", ")
        : "Not specified"
    }
    
    Please create a complete workout plan that includes:
    1. A name for the program
    2. An overall description of the program
    3. A weekly schedule with specific workouts for each day
    4. For each workout day, include:
       - Warm-up exercises
       - Main workout exercises with sets, reps, and rest periods
       - Cool-down stretches
       - Total duration estimate
    5. Include specific exercise names, not generic descriptions
    
    FORMAT THE RESPONSE AS JSON with the following structure:
    {
      "name": "Program Name",
      "description": "Program description",
      "level": "beginner/intermediate/advanced/expert",
      "goal": "primary goal",
      "duration": { "value": number, "unit": "weeks" },
      "frequency": number,
      "equipment": ["required equipment"],
      "schedule": [
        {
          "name": "Day 1: Focus Area",
          "dayNumber": 1,
          "focus": "focus area",
          "warmup": {
            "duration": minutes,
            "description": "warmup description",
            "exercises": [
              {
                "name": "Exercise Name",
                "sets": number,
                "reps": "rep count or range",
                "notes": "optional notes"
              }
            ]
          },
          "mainWorkout": {
            "exercises": [
              {
                "name": "Exercise Name",
                "sets": number,
                "reps": "rep count or range",
                "restPeriod": seconds,
                "weight": "weight description",
                "notes": "optional notes"
              }
            ],
            "format": "straight_sets/circuit/etc",
            "notes": "optional notes"
          },
          "cooldown": {
            "duration": minutes,
            "description": "cooldown description",
            "exercises": [
              {
                "name": "Stretch Name",
                "duration": seconds,
                "notes": "optional notes"
              }
            ]
          },
          "duration": total_minutes,
          "intensity": "low/moderate/high/very_high",
          "notes": "optional notes"
        }
      ],
      "notes": "Program notes and tips"
    }
    `;

    // Call OpenAI API
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a certified fitness trainer specializing in creating personalized workout plans.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    // Extract the workout plan from the response
    let workoutPlan;
    try {
      const content = completion.data.choices[0].message.content;
      // Extract JSON from the response (in case there's any additional text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workoutPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract valid JSON from the AI response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return res.status(500).json({ msg: "Error generating workout plan" });
    }

    // Save the workout to the database
    const newWorkout = new Workout({
      name: workoutPlan.name,
      creator: req.user.id,
      isAiGenerated: true,
      description: workoutPlan.description,
      level: workoutPlan.level,
      goal: workoutPlan.goal,
      duration: workoutPlan.duration,
      frequency: workoutPlan.frequency,
      schedule: workoutPlan.schedule,
      equipment: workoutPlan.equipment,
      notes: workoutPlan.notes,
    });

    await newWorkout.save();

    res.json(newWorkout);
  } catch (err) {
    console.error("Error in generateWorkoutPlan:", err.message);
    res
      .status(500)
      .json({ msg: "Error generating workout plan", error: err.message });
  }
};

// Generate workout questions based on user profile
exports.getWorkoutQuestions = async (req, res) => {
  try {
    // Get user profile for contextual questions
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate questions based on profile completeness
    const questions = [
      {
        id: "goal",
        question: "What is your primary fitness goal?",
        type: "select",
        options: [
          "weight_loss",
          "muscle_gain",
          "strength",
          "endurance",
          "flexibility",
          "general_fitness",
        ],
        default:
          user.fitnessGoals && user.fitnessGoals.length > 0
            ? user.fitnessGoals[0]
            : "general_fitness",
      },
      {
        id: "fitnessLevel",
        question: "What is your current fitness level?",
        type: "select",
        options: ["beginner", "intermediate", "advanced", "expert"],
        default: user.fitnessLevel || "beginner",
      },
      {
        id: "duration",
        question: "How many weeks would you like this workout plan to last?",
        type: "select",
        options: ["4", "8", "12", "16"],
        default: "8",
      },
      {
        id: "frequency",
        question: "How many days per week can you work out?",
        type: "select",
        options: ["2", "3", "4", "5", "6"],
        default: "3",
      },
      {
        id: "equipment",
        question: "What equipment do you have access to?",
        type: "multiselect",
        options: [
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
        default: ["minimal"],
      },
      {
        id: "limitations",
        question: "Do you have any injuries or limitations?",
        type: "text",
        placeholder: "E.g., knee injury, back pain, etc. Leave blank if none.",
      },
    ];

    res.json(questions);
  } catch (err) {
    console.error("Error in getWorkoutQuestions:", err.message);
    res.status(500).send("Server error");
  }
};

// Get exercise recommendations
exports.getExerciseRecommendations = async (req, res) => {
  try {
    const { targetMuscles, equipment, difficulty, count } = req.body;

    // Validate required fields
    if (
      !targetMuscles ||
      !Array.isArray(targetMuscles) ||
      targetMuscles.length === 0
    ) {
      return res.status(400).json({ msg: "Target muscles are required" });
    }

    // Build prompt for OpenAI
    const prompt = `
    Recommend ${count || 5} exercises for the following parameters:
    
    Target Muscle Groups: ${targetMuscles.join(", ")}
    Available Equipment: ${equipment ? equipment.join(", ") : "minimal"}
    Difficulty Level: ${difficulty || "intermediate"}
    
    FORMAT THE RESPONSE AS JSON with the following structure:
    [
      {
        "name": "Exercise Name",
        "targetMuscles": ["primary_muscle", "secondary_muscle"],
        "equipment": ["required_equipment"],
        "description": "Brief description of the exercise",
        "difficulty": "beginner/intermediate/advanced",
        "sets": recommended_sets,
        "reps": "recommended_reps (range or specific)",
        "restPeriod": seconds_between_sets,
        "tips": "Form tips or advice"
      }
    ]
    `;

    // Call OpenAI API
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a certified fitness trainer specializing in exercise prescription.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract the exercise recommendations from the response
    let exercises;
    try {
      const content = completion.data.choices[0].message.content;
      // Extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        exercises = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract valid JSON from the AI response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return res
        .status(500)
        .json({ msg: "Error generating exercise recommendations" });
    }

    res.json(exercises);
  } catch (err) {
    console.error("Error in getExerciseRecommendations:", err.message);
    res
      .status(500)
      .json({
        msg: "Error generating exercise recommendations",
        error: err.message,
      });
  }
};

// Analyze workout and provide feedback
exports.analyzeWorkout = async (req, res) => {
  try {
    const { workoutId } = req.params;

    // Find the workout
    const workout = await Workout.findById(workoutId);

    if (!workout) {
      return res.status(404).json({ msg: "Workout not found" });
    }

    // Get user profile
    const user = await User.findById(req.user.id);

    // Build prompt for OpenAI
    const prompt = `
    Analyze this workout plan for a ${user.age || "adult"} ${
      user.gender || "person"
    } with fitness level ${
      user.fitnessLevel || workout.level
    } and provide feedback:
    
    Workout Name: ${workout.name}
    Goal: ${workout.goal}
    Level: ${workout.level}
    Duration: ${workout.duration.value} ${workout.duration.unit}
    Frequency: ${workout.frequency} workouts per week
    
    Analyze this workout for:
    1. Effectiveness for the stated goal
    2. Balance across muscle groups
    3. Progression structure
    4. Recovery time
    5. Any potential issues or improvements
    
    FORMAT THE RESPONSE AS JSON with the following structure:
    {
      "overallRating": 1-10 score,
      "goalAlignment": {
        "rating": 1-10 score,
        "comments": "Analysis of goal alignment"
      },
      "balance": {
        "rating": 1-10 score,
        "comments": "Analysis of muscle group balance"
      },
      "progression": {
        "rating": 1-10 score,
        "comments": "Analysis of progression structure"
      },
      "recovery": {
        "rating": 1-10 score,
        "comments": "Analysis of recovery periods"
      },
      "suggestions": [
        "Suggestion 1",
        "Suggestion 2",
        "Suggestion 3"
      ],
      "summary": "Overall summary of the workout plan"
    }
    `;

    // Call OpenAI API
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a certified fitness trainer specializing in analyzing workout programs.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract the analysis from the response
    let analysis;
    try {
      const content = completion.data.choices[0].message.content;
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract valid JSON from the AI response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return res.status(500).json({ msg: "Error analyzing workout" });
    }

    res.json(analysis);
  } catch (err) {
    console.error("Error in analyzeWorkout:", err.message);
    res
      .status(500)
      .json({ msg: "Error analyzing workout", error: err.message });
  }
};

// Generate nutrition advice
exports.getNutritionAdvice = async (req, res) => {
  try {
    const {
      goal,
      dietaryRestrictions,
      preferredFoods,
      dislikedFoods,
      mealCount,
    } = req.body;

    // Validate required fields
    if (!goal) {
      return res.status(400).json({ msg: "Fitness goal is required" });
    }

    // Get user profile
    const user = await User.findById(req.user.id);

    // Build prompt for OpenAI
    const prompt = `
    Generate nutrition advice for a ${user.age || "adult"} ${
      user.gender || "person"
    } with the following parameters:
    
    Fitness Goal: ${goal}
    Dietary Restrictions: ${dietaryRestrictions || "None"}
    Preferred Foods: ${preferredFoods || "Not specified"}
    Disliked Foods: ${dislikedFoods || "Not specified"}
    Meals Per Day: ${mealCount || 3}
    
    Please provide:
    1. General nutrition guidelines for this fitness goal
    2. Macronutrient recommendations (protein, carbs, fats)
    3. Sample meal plan for one day
    4. Food suggestions to include and avoid
    5. Timing recommendations (pre/post workout, etc.)
    
    FORMAT THE RESPONSE AS JSON with the following structure:
    {
      "guidelines": [
        "Guideline 1",
        "Guideline 2",
        "Guideline 3"
      ],
      "macronutrients": {
        "protein": "recommendation",
        "carbohydrates": "recommendation",
        "fats": "recommendation"
      },
      "mealPlan": [
        {
          "meal": "Breakfast",
          "options": [
            {
              "name": "Meal name",
              "description": "Meal description",
              "ingredients": ["ingredient 1", "ingredient 2"],
              "macros": {
                "protein": "amount",
                "carbs": "amount",
                "fats": "amount",
                "calories": "amount"
              }
            }
          ]
        }
      ],
      "recommendedFoods": [
        "Food 1",
        "Food 2"
      ],
      "foodsToAvoid": [
        "Food 1",
        "Food 2"
      ],
      "timing": {
        "preWorkout": "advice",
        "postWorkout": "advice",
        "generalTiming": "advice"
      },
      "supplements": [
        {
          "name": "Supplement name",
          "benefit": "Benefit description",
          "recommendation": "Usage recommendation"
        }
      ]
    }
    `;

    // Call OpenAI API
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a certified nutritionist specializing in fitness nutrition.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Extract the nutrition advice from the response
    let nutritionAdvice;
    try {
      const content = completion.data.choices[0].message.content;
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        nutritionAdvice = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract valid JSON from the AI response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return res.status(500).json({ msg: "Error generating nutrition advice" });
    }

    res.json(nutritionAdvice);
  } catch (err) {
    console.error("Error in getNutritionAdvice:", err.message);
    res
      .status(500)
      .json({ msg: "Error generating nutrition advice", error: err.message });
  }
};
