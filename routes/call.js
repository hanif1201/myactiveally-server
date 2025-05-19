const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const callController = require("../controllers/callController");

// @route   POST api/call
// @desc    Initiate a video call
// @access  Private
router.post("/", auth, callController.initiateCall);

// @route   DELETE api/call/:roomId
// @desc    End a video call
// @access  Private
router.delete("/:roomId", auth, callController.endCall);

module.exports = router;
