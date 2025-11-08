// client/websocket.js
const SOCKET_URL = 'https://collab-backend-tj3p.onrender.com';

try {
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true
  });

  window.socket = socket;
  window.ROOM_ID = null;
  window.USER = { id: crypto.randomUUID(), name: 'User-' + Math.floor(Math.random() * 1000) };

  socket.on('connect', () => console.log('socket connected', socket.id));
  socket.on('connect_error', (err) => console.error('socket connect_error', err));
} catch (err) {
  console.error('websocket init error', err);
}
