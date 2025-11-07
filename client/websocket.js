// client/websocket.js

// connect to deployed backend
const socket = io('https://collab-backend-tj3p.onrender.com', {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

// expose globally so other scripts (main.js) can use it safely
window.socket = socket;
window.ROOM_ID = null;
window.USER = { id: crypto.randomUUID(), name: 'User-' + Math.floor(Math.random() * 1000) };

// optional: debug connection
socket.on('connect', () => {
  console.log('socket connected', socket.id);
});
socket.on('connect_error', (err) => {
  console.error('socket connect_error', err);
});
