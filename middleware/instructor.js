const User = require("../models/User");

module.exports = async function (req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.role !== "instructor") {
      return res.status(403).json({ msg: "Not authorized" });
    }

    if (!user.isActive) {
      return res.status(403).json({ msg: "Account is inactive" });
    }

    next();
  } catch (err) {
    console.error("Error in instructor middleware:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
