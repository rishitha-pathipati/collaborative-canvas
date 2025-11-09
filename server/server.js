// server/server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

// Allow CORS from your Vercel app
const io = new Server(server, {
  cors: {
    origin: [
      "https://collaborative-canvas-eta.vercel.app", // your frontend
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
  },
});

app.use(cors());

// --- SOCKET HANDLERS ---
const rooms = {};

io.on("connection", (socket) => {
  console.log("✅ New connection:", socket.id);

  socket.on("join", ({ roomId, userId, name }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = { users: {}, ops: [] };
    rooms[roomId].users[userId] = name;
    console.log(`${name} joined room ${roomId}`);
    io.to(roomId).emit("users", Object.values(rooms[roomId].users));
  });

  socket.on("draw", ({ roomId, op }) => {
    if (rooms[roomId]) {
      rooms[roomId].ops.push(op);
      socket.to(roomId).emit("draw", op);
    }
  });

  socket.on("undo", ({ roomId }) => {
    if (rooms[roomId]?.ops.length > 0) {
      rooms[roomId].ops.pop();
      io.to(roomId).emit("undo");
    }
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      for (const [userId, name] of Object.entries(room.users)) {
        if (socket.id === userId) delete room.users[userId];
      }
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Server is live 🚀");
});

// --- Render uses PORT env variable ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
