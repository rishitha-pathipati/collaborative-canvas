// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const RoomManager = require("./rooms");
const DrawingState = require("./drawing-state");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("../client"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));

const roomManager = new RoomManager();
const drawingState = new DrawingState();

io.on("connection", (socket) => {
  console.log("🔌 New client:", socket.id);

  socket.on("join", ({ roomId, username, userId }) => {
    roomManager.addUser(roomId, socket.id, username);
    socket.join(roomId);
    console.log(`👤 ${username} joined ${roomId}`);

    const strokes = drawingState.getReplayStrokes(roomId);
    socket.emit("replay", strokes);
    io.to(roomId).emit("user-list", roomManager.getUserList(roomId));
  });

  socket.on("draw", ({ roomId, userId, points, color, width }) => {
    const op = drawingState.addStroke(roomId, { points, color, width, userId });
    io.to(roomId).emit("op", op);
  });

  socket.on("clear", ({ roomId, userId }) => {
    const op = drawingState.addClear(roomId, { userId });
    io.to(roomId).emit("op", op);
  });

  socket.on("undo", ({ roomId, targetOpId, userId }) => {
    const op = drawingState.addUndo(roomId, { targetOpId, userId });
    io.to(roomId).emit("op", op);
  });

  socket.on("disconnect", () => {
    const leftRoom = roomManager.removeUser(socket.id);
    if (leftRoom) {
      io.to(leftRoom).emit("user-list", roomManager.getUserList(leftRoom));
      console.log(`❌ User left ${leftRoom}`);
    }
  });
});


