const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("config");
const User = require("../models/User");
const Instructor = require("../models/Instructor");

// Register a new user
exports.register = async (req, res) => {
  const { name, email, password, userType } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      userType: userType || "user", // Default to regular user
    });

    // Save user to database
    await user.save();

    // If user type is instructor, create instructor profile
    if (userType === "instructor") {
      const instructor = new Instructor({
        user: user._id,
      });
      await instructor.save();
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        userType: user.userType,
      },
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiration },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error("Error in register:", err.message);
    res.status(500).send("Server error");
  }
};

// Login user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Check if account is active
    if (!user.isActive || user.accountStatus !== "active") {
      return res.status(401).json({ msg: "Account is not active" });
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        userType: user.userType,
      },
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiration },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error("Error in login:", err.message);
    res.status(500).send("Server error");
  }
};

// Get authenticated user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error("Error in getUser:", err.message);
    res.status(500).send("Server error");
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Get user
    const user = await User.findById(req.user.id).select("+password");

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    console.error("Error in changePassword:", err.message);
    res.status(500).send("Server error");
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    // Create new token
    const payload = {
      user: {
        id: req.user.id,
        userType: req.userDetails.userType,
      },
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiration },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error("Error in refreshToken:", err.message);
    res.status(500).send("Server error");
  }
};

// Forgot password - Request reset
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Generate random reset token
    const resetToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    // Update user with reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // TODO: Send email with reset token
    // This would typically involve using a mail service

    res.json({ msg: "Password reset email sent" });
  } catch (err) {
    console.error("Error in forgotPassword:", err.message);
    res.status(500).send("Server error");
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired reset token" });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: "Password has been reset" });
  } catch (err) {
    console.error("Error in resetPassword:", err.message);
    res.status(500).send("Server error");
  }
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Admin Login Request:", { email, password });

    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Check if user is an admin
    if (user.role !== "admin") {
      console.log("User is not an admin");
      return res.status(403).json({ msg: "Access denied" });
    }

    // Validate password using the model's method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Invalid password");
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
      },
    };

    // Sign token
    jwt.sign(
      payload,
      config.get("jwtSecret"),
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        console.log("Admin Login Response:", { token });
        res.json({ token });
      }
    );
  } catch (err) {
    console.error("Error in adminLogin:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
