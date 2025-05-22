const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.get("jwtSecret"));

    // Add user from payload
    req.user = decoded.user;

    // Check if user still exists and is active
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    if (!user.isActive || user.accountStatus !== "active") {
      return res.status(401).json({ msg: "User account is not active" });
    }

    req.userDetails = user;
    next();
  } catch (err) {
    console.error("Error in auth middleware:", err.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};
