// server.js - Main entry point for Gym Buddy API
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const config = require("config");
const connectDB = require("./config/db");
const {
  notFound,
  errorHandler,
  handleDuplicateKeyError,
  handleValidationError,
  handleJWTError,
} = require("./middleware/error");

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketio(server, {
  cors: {
    origin: config.get("clientURL"),
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Define API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/gyms", require("./routes/gyms"));
app.use("/api/matches", require("./routes/matches"));
app.use("/api/consultations", require("./routes/consultations"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/workouts", require("./routes/workouts"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/call", require("./routes/call"));

// Basic route
app.get("/", (req, res) => {
  res.json({ msg: "Welcome to Gym Buddy API" });
});

// Error handling middleware
app.use(notFound);
app.use(handleDuplicateKeyError);
app.use(handleValidationError);
app.use(handleJWTError);
app.use(errorHandler);

// Start server
const PORT = config.get("port");
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server }; // For testing
