const Instructor = require("../models/Instructor");

module.exports = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    // Check if user exists and is an instructor
    const instructor = await Instructor.findOne({ user: req.user.id });

    if (!instructor) {
      return res
        .status(403)
        .json({ msg: "Access denied. Instructor role required" });
    }

    req.instructor = instructor;
    next();
  } catch (err) {
    console.error("Error in instructor middleware:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
