const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("./config");

// Store active users and their socket IDs
const activeUsers = new Map();

// Store active calls
const activeCalls = new Map();

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: config.clientURL,
      methods: ["GET", "POST"],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.user.id;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.userId);

    // Add user to active users
    activeUsers.set(socket.userId, socket.id);

    // Handle chat messages
    socket.on("send_message", async (data) => {
      const { chatId, content, type } = data;
      const receiverSocketId = activeUsers.get(data.receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", {
          chatId,
          senderId: socket.userId,
          content,
          type,
          timestamp: new Date(),
        });
      }
    });

    // Handle typing status
    socket.on("typing", (data) => {
      const { chatId, receiverId } = data;
      const receiverSocketId = activeUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user_typing", {
          chatId,
          userId: socket.userId,
        });
      }
    });

    // Handle video call signaling
    socket.on("call_user", (data) => {
      const { receiverId, signalData, roomId } = data;
      const receiverSocketId = activeUsers.get(receiverId);

      if (receiverSocketId) {
        // Store call information
        activeCalls.set(roomId, {
          callerId: socket.userId,
          receiverId,
          status: "pending",
        });

        io.to(receiverSocketId).emit("incoming_call", {
          signal: signalData,
          from: socket.userId,
          roomId,
        });
      }
    });

    // Handle call acceptance
    socket.on("accept_call", (data) => {
      const { signal, roomId } = data;
      const call = activeCalls.get(roomId);

      if (call) {
        const callerSocketId = activeUsers.get(call.callerId);
        if (callerSocketId) {
          io.to(callerSocketId).emit("call_accepted", {
            signal,
            roomId,
          });
        }
        call.status = "active";
        activeCalls.set(roomId, call);
      }
    });

    // Handle call rejection
    socket.on("reject_call", (data) => {
      const { roomId } = data;
      const call = activeCalls.get(roomId);

      if (call) {
        const callerSocketId = activeUsers.get(call.callerId);
        if (callerSocketId) {
          io.to(callerSocketId).emit("call_rejected", { roomId });
        }
        activeCalls.delete(roomId);
      }
    });

    // Handle call end
    socket.on("end_call", (data) => {
      const { roomId } = data;
      const call = activeCalls.get(roomId);

      if (call) {
        const otherUserId =
          call.callerId === socket.userId ? call.receiverId : call.callerId;
        const otherUserSocketId = activeUsers.get(otherUserId);

        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("call_ended", { roomId });
        }
        activeCalls.delete(roomId);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.userId);
      activeUsers.delete(socket.userId);

      // End any active calls
      for (const [roomId, call] of activeCalls.entries()) {
        if (
          call.callerId === socket.userId ||
          call.receiverId === socket.userId
        ) {
          const otherUserId =
            call.callerId === socket.userId ? call.receiverId : call.callerId;
          const otherUserSocketId = activeUsers.get(otherUserId);

          if (otherUserSocketId) {
            io.to(otherUserSocketId).emit("call_ended", { roomId });
          }
          activeCalls.delete(roomId);
        }
      }
    });
  });

  return io;
};

module.exports = initializeSocket;
