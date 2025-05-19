import { io } from "socket.io-client";
import Peer from "simple-peer";

class SocketClient {
  constructor() {
    this.socket = null;
    this.peer = null;
    this.onMessageCallback = null;
    this.onTypingCallback = null;
    this.onCallCallback = null;
    this.onCallAcceptedCallback = null;
    this.onCallRejectedCallback = null;
    this.onCallEndedCallback = null;
  }

  connect(token) {
    this.socket = io(process.env.REACT_APP_API_URL, {
      auth: { token },
    });

    this.setupListeners();
  }

  setupListeners() {
    this.socket.on("receive_message", (data) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(data);
      }
    });

    this.socket.on("user_typing", (data) => {
      if (this.onTypingCallback) {
        this.onTypingCallback(data);
      }
    });

    this.socket.on("incoming_call", (data) => {
      if (this.onCallCallback) {
        this.onCallCallback(data);
      }
    });

    this.socket.on("call_accepted", (data) => {
      if (this.onCallAcceptedCallback) {
        this.onCallAcceptedCallback(data);
      }
    });

    this.socket.on("call_rejected", (data) => {
      if (this.onCallRejectedCallback) {
        this.onCallRejectedCallback(data);
      }
    });

    this.socket.on("call_ended", (data) => {
      if (this.onCallEndedCallback) {
        this.onCallEndedCallback(data);
      }
    });
  }

  // Chat methods
  sendMessage(data) {
    this.socket.emit("send_message", data);
  }

  sendTypingStatus(data) {
    this.socket.emit("typing", data);
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  onTyping(callback) {
    this.onTypingCallback = callback;
  }

  // Video call methods
  initiateCall(data) {
    this.peer = new Peer({
      initiator: true,
      trickle: false,
      stream: data.stream,
    });

    this.peer.on("signal", (signalData) => {
      this.socket.emit("call_user", {
        receiverId: data.receiverId,
        signalData,
        roomId: data.roomId,
      });
    });

    this.peer.on("stream", (stream) => {
      if (data.onStream) {
        data.onStream(stream);
      }
    });
  }

  acceptCall(data) {
    this.peer = new Peer({
      initiator: false,
      trickle: false,
      stream: data.stream,
    });

    this.peer.on("signal", (signal) => {
      this.socket.emit("accept_call", {
        signal,
        roomId: data.roomId,
      });
    });

    this.peer.on("stream", (stream) => {
      if (data.onStream) {
        data.onStream(stream);
      }
    });

    this.peer.signal(data.signal);
  }

  rejectCall(roomId) {
    this.socket.emit("reject_call", { roomId });
  }

  endCall(roomId) {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.socket.emit("end_call", { roomId });
  }

  onCall(callback) {
    this.onCallCallback = callback;
  }

  onCallAccepted(callback) {
    this.onCallAcceptedCallback = callback;
  }

  onCallRejected(callback) {
    this.onCallRejectedCallback = callback;
  }

  onCallEnded(callback) {
    this.onCallEndedCallback = callback;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.peer) {
      this.peer.destroy();
    }
  }
}

export default new SocketClient();
