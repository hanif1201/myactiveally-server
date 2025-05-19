const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const chatController = require("../controllers/chatController");

// @route   GET api/chat
// @desc    Get all chats for a user
// @access  Private
router.get("/", auth, chatController.getUserChats);

// @route   POST api/chat
// @desc    Create a new chat
// @access  Private
router.post("/", auth, chatController.createChat);

// @route   GET api/chat/:chatId
// @desc    Get chat messages
// @access  Private
router.get("/:chatId", auth, chatController.getChatMessages);

// @route   POST api/chat/:chatId/messages
// @desc    Send a message
// @access  Private
router.post("/:chatId/messages", auth, chatController.sendMessage);

// @route   PUT api/chat/:chatId/read
// @desc    Mark messages as read
// @access  Private
router.put("/:chatId/read", auth, chatController.markAsRead);

// @route   DELETE api/chat/:chatId
// @desc    Delete a chat
// @access  Private
router.delete("/:chatId", auth, chatController.deleteChat);

module.exports = router;
