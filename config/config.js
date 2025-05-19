module.exports = {
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret",
  jwtExpiration: "24h",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // Default radius for nearby gym searches (in kilometers)
  defaultSearchRadius: 10,
  // Platform fee percentage for instructor consultations
  platformFeePercentage: 10,
  // Maximum allowed image upload size in bytes (5MB)
  maxImageSize: 5 * 1024 * 1024,
  // Email settings (for future implementation)
  emailFrom: "noreply@gymbuddy.com",
  // App environment
  nodeEnv: process.env.NODE_ENV || "development",
};
