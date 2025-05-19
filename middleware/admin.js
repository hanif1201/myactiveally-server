// middleware/admin.js - Admin role middleware
const User = require("../models/User");

module.exports = async function (req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized" });
    }

    next();
  } catch (err) {
    console.error("Error in admin middleware:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
