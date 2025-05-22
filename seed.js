const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("config");
const User = require("./models/User");

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.get("mongoURI"));
    console.log("MongoDB Connected...");

    // Clear existing data
    await User.deleteMany({});
    console.log("Cleared existing data...");

    // Create admin user
    const adminUser = new User({
      name: "Admin User",
      email: "admin@example.com",
      password: "adminpassword",
      role: "admin",
      isActive: true,
      accountStatus: "active",
    });

    await adminUser.save();
    console.log("Admin user created...");

    // Create regular user
    const regularUser = new User({
      name: "Regular User",
      email: "user@example.com",
      password: "userpassword",
      role: "user",
      isActive: true,
      accountStatus: "active",
    });

    await regularUser.save();
    console.log("Regular user created...");

    console.log("Database seeded successfully!");
    process.exit();
  } catch (err) {
    console.error("Error seeding database:", err.message);
    process.exit(1);
  }
};

seedDatabase();
