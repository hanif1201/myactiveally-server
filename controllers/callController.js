const User = require("../models/User");

// Generate a unique room ID for the call
const generateRoomId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Initialize a call
exports.initiateCall = async (req, res) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ msg: "Receiver ID is required" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ msg: "Receiver not found" });
    }

    // Generate a unique room ID
    const roomId = generateRoomId();

    // In a real application, you would store the call information in a database
    // and implement a signaling server for WebRTC

    res.json({
      roomId,
      receiver: {
        id: receiver._id,
        name: receiver.name,
        profileImage: receiver.profileImage,
      },
    });
  } catch (err) {
    console.error("Error in initiateCall:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// End a call
exports.endCall = async (req, res) => {
  try {
    const { roomId } = req.params;

    // In a real application, you would update the call status in the database
    // and notify the other participant through WebSocket

    res.json({ msg: "Call ended successfully" });
  } catch (err) {
    console.error("Error in endCall:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
