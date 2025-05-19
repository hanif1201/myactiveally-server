// utils/aiWorkout.js - AI workout generation utilities
const { Configuration, OpenAIApi } = require("openai");
const config = require("../config/config");

// Configure OpenAI
const openaiConfig = new Configuration({
  apiKey: config.openaiApiKey,
});
const openai = new OpenAIApi(openaiConfig);

// Generate workout plan based on user parameters
exports.generateWorkoutPlan = async (params) => {
  try {
    const {
      goal,
      fitnessLevel,
      duration,
      frequency,
      equipment,
      limitations,
      userProfile,
    } = params;

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
    Age: ${userProfile?.age || "Not specified"}
    Gender: ${userProfile?.gender || "Not specified"}
    Current Fitness Level: ${userProfile?.fitnessLevel || "Not specified"}
    Preferred Workout Types: ${
      userProfile?.preferredWorkouts
        ? userProfile.preferredWorkouts.join(", ")
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
    const content = completion.data.choices[0].message.content;

    // Extract JSON from the response (in case there's any additional text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not extract valid JSON from the AI response");
    }
  } catch (err) {
    console.error("Error in generateWorkoutPlan:", err.message);
    throw err;
  }
};

// Generate exercise recommendations
exports.getExerciseRecommendations = async (params) => {
  try {
    const { targetMuscles, equipment, difficulty, count } = params;

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
    const content = completion.data.choices[0].message.content;

    // Extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not extract valid JSON from the AI response");
    }
  } catch (err) {
    console.error("Error in getExerciseRecommendations:", err.message);
    throw err;
  }
};

// Analyze workout and provide feedback
exports.analyzeWorkout = async (workout, userProfile) => {
  try {
    // Build prompt for OpenAI
    const prompt = `
    Analyze this workout plan for a ${userProfile?.age || "adult"} ${
      userProfile?.gender || "person"
    } with fitness level ${
      userProfile?.fitnessLevel || workout.level
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
    const content = completion.data.choices[0].message.content;

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not extract valid JSON from the AI response");
    }
  } catch (err) {
    console.error("Error in analyzeWorkout:", err.message);
    throw err;
  }
};

// Generate nutrition advice
exports.getNutritionAdvice = async (params) => {
  try {
    const {
      goal,
      dietaryRestrictions,
      preferredFoods,
      dislikedFoods,
      mealCount,
      userProfile,
    } = params;

    // Build prompt for OpenAI
    const prompt = `
    Generate nutrition advice for a ${userProfile?.age || "adult"} ${
      userProfile?.gender || "person"
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
    const content = completion.data.choices[0].message.content;

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not extract valid JSON from the AI response");
    }
  } catch (err) {
    console.error("Error in getNutritionAdvice:", err.message);
    throw err;
  }
};

// Generate personalized workout questions based on user profile
exports.generateWorkoutQuestions = (userProfile) => {
  // Base questions that are always included
  const baseQuestions = [
    {
      id: "goal",
      question: "What is your primary fitness goal?",
      type: "select",
      options: [
        { value: "weight_loss", label: "Weight Loss" },
        { value: "muscle_gain", label: "Muscle Gain" },
        { value: "strength", label: "Strength" },
        { value: "endurance", label: "Endurance" },
        { value: "flexibility", label: "Flexibility" },
        { value: "general_fitness", label: "General Fitness" },
      ],
      default:
        userProfile?.fitnessGoals && userProfile.fitnessGoals.length > 0
          ? userProfile.fitnessGoals[0]
          : "general_fitness",
    },
    {
      id: "fitnessLevel",
      question: "What is your current fitness level?",
      type: "select",
      options: [
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
        { value: "expert", label: "Expert" },
      ],
      default: userProfile?.fitnessLevel || "beginner",
    },
    {
      id: "duration",
      question: "How many weeks would you like this workout plan to last?",
      type: "select",
      options: [
        { value: "4", label: "4 Weeks" },
        { value: "8", label: "8 Weeks" },
        { value: "12", label: "12 Weeks" },
        { value: "16", label: "16 Weeks" },
      ],
      default: "8",
    },
    {
      id: "frequency",
      question: "How many days per week can you work out?",
      type: "select",
      options: [
        { value: "2", label: "2 Days" },
        { value: "3", label: "3 Days" },
        { value: "4", label: "4 Days" },
        { value: "5", label: "5 Days" },
        { value: "6", label: "6 Days" },
      ],
      default: "3",
    },
  ];

  // Equipment question with default based on user profile
  const equipmentQuestion = {
    id: "equipment",
    question: "What equipment do you have access to?",
    type: "multiselect",
    options: [
      { value: "none", label: "None (Bodyweight Only)" },
      { value: "minimal", label: "Minimal Home Equipment" },
      { value: "resistance_bands", label: "Resistance Bands" },
      { value: "dumbbells", label: "Dumbbells" },
      { value: "barbell", label: "Barbell and Weights" },
      { value: "kettlebells", label: "Kettlebells" },
      { value: "machines", label: "Weight Machines" },
      { value: "cardio_equipment", label: "Cardio Equipment" },
      { value: "full_gym", label: "Full Gym Access" },
    ],
    default: ["minimal"],
  };

  // Limitations/injuries question
  const limitationsQuestion = {
    id: "limitations",
    question: "Do you have any injuries or limitations?",
    type: "text",
    placeholder: "E.g., knee injury, back pain, etc. Leave blank if none.",
  };

  // Additional questions based on goal
  const goalSpecificQuestions = [];

  if (userProfile?.fitnessGoals?.includes("weight_loss")) {
    goalSpecificQuestions.push({
      id: "targetWeightLoss",
      question: "What is your target weight loss per week?",
      type: "select",
      options: [
        { value: "slow", label: "0.5 lb (gradual, sustainable approach)" },
        { value: "moderate", label: "1 lb (balanced approach)" },
        { value: "aggressive", label: "2 lb (more intensive approach)" },
      ],
      default: "moderate",
    });
  }

  if (userProfile?.fitnessGoals?.includes("muscle_gain")) {
    goalSpecificQuestions.push({
      id: "targetMuscleGroups",
      question: "Which muscle groups would you like to focus on?",
      type: "multiselect",
      options: [
        { value: "chest", label: "Chest" },
        { value: "back", label: "Back" },
        { value: "shoulders", label: "Shoulders" },
        { value: "arms", label: "Arms" },
        { value: "legs", label: "Legs" },
        { value: "core", label: "Core" },
        { value: "full_body", label: "Full Body (balanced)" },
      ],
      default: ["full_body"],
    });
  }

  // Combine all questions
  return [
    ...baseQuestions,
    equipmentQuestion,
    ...goalSpecificQuestions,
    limitationsQuestion,
  ];
};
