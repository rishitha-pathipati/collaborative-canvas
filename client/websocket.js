// websocket.js
// Connect to your live backend on Render
const socket = io('https://collab-backend-tj3p.onrender.com', {
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

window.socket = socket;
window.ROOM_ID = null;
window.USER = { id: crypto.randomUUID(), name: 'User-' + Math.floor(Math.random() * 1000) };

function joinRoom(roomId) {
  window.ROOM_ID = roomId || 'default-room';
  socket.emit('join', { roomId: window.ROOM_ID, username: window.USER.name, userId: window.USER.id });
}

socket.on('replay', (strokes) => { if (typeof window.onReplay === 'function') window.onReplay(strokes); });
socket.on('op', (op) => { if (typeof window.onOp === 'function') window.onOp(op); });
socket.on('user-list', (users) => { if (typeof window.onUserList === 'function') window.onUserList(users); });
socket.on('cursor', (data) => { if (typeof window.onRemoteCursor === 'function') window.onRemoteCursor(data); });

window.joinRoom = joinRoom;
