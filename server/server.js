const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["https://collaborative-canvas-eta.vercel.app", "*"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket','polling']
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  // ... your existing handlers (join, draw, etc.)
});

app.get('/', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
