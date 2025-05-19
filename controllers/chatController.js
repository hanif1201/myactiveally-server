const Chat = require("../models/Chat");
const User = require("../models/User");

// Get all chats for a user
exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
      isActive: true,
    })
      .populate("participants", "name profileImage")
      .sort({ lastMessage: -1 });

    res.json(chats);
  } catch (err) {
    console.error("Error in getUserChats:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findById(chatId)
      .populate("participants", "name profileImage")
      .populate("messages.sender", "name profileImage");

    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    // Check if user is a participant
    if (!chat.participants.some((p) => p._id.toString() === req.user.id)) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Paginate messages
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const messages = chat.messages.slice(startIndex, endIndex);

    res.json({
      chat,
      messages,
      currentPage: page,
      totalPages: Math.ceil(chat.messages.length / limit),
    });
  } catch (err) {
    console.error("Error in getChatMessages:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = "text" } = req.body;

    if (!content) {
      return res.status(400).json({ msg: "Message content is required" });
    }

    let chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    // Check if user is a participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Add new message
    chat.messages.push({
      sender: req.user.id,
      content,
      type,
    });

    chat.lastMessage = Date.now();
    await chat.save();

    // Populate sender info
    chat = await Chat.findById(chatId)
      .populate("participants", "name profileImage")
      .populate("messages.sender", "name profileImage");

    res.json(chat);
  } catch (err) {
    console.error("Error in sendMessage:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create a new chat
exports.createChat = async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ msg: "Participant ID is required" });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ msg: "Participant not found" });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [req.user.id, participantId] },
      isActive: true,
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // Create new chat
    const chat = new Chat({
      participants: [req.user.id, participantId],
      messages: [],
    });

    await chat.save();

    // Populate participant info
    const populatedChat = await Chat.findById(chat._id).populate(
      "participants",
      "name profileImage"
    );

    res.json(populatedChat);
  } catch (err) {
    console.error("Error in createChat:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    // Check if user is a participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Mark all unread messages as read
    chat.messages.forEach((message) => {
      if (message.sender.toString() !== req.user.id && !message.read) {
        message.read = true;
      }
    });

    await chat.save();
    res.json(chat);
  } catch (err) {
    console.error("Error in markAsRead:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// Delete a chat
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    // Check if user is a participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // Soft delete by setting isActive to false
    chat.isActive = false;
    await chat.save();

    res.json({ msg: "Chat deleted successfully" });
  } catch (err) {
    console.error("Error in deleteChat:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
