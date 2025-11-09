// client/main.js
// UI wiring and socket listeners

// elements
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');
const userListEl = document.getElementById('userList');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');

// join handler
joinBtn.addEventListener('click', () => {
  const roomId = (roomInput.value || '').trim() || 'default-room';
  window.ROOM_ID = roomId;
  if (!window.socket || !window.socket.connected) {
    alert('Socket not connected yet. Wait a moment and try again.');
    return;
  }
  window.socket.emit('join', { roomId, userId: window.USER.id, name: window.USER.name });
  // ask for state
  window.socket.emit('request-state', { roomId });
});

// socket listeners
window.socket.on('users', (usersArray) => {
  if (!usersArray || usersArray.length === 0) userListEl.textContent = '-';
  else userListEl.textContent = usersArray.map(u => u.name || u.id).join(', ');
});

window.socket.on('initial-state', ({ ops }) => {
  // redraw full canvas
  if (window._collabCanvas) window._collabCanvas.replayOps(ops || []);
});

window.socket.on('draw', (op) => {
  // draw single op from other user
  if (window._collabCanvas && op) window._collabCanvas.drawSegment(op.from, op.to, op.color, op.width);
});

// undo/redo buttons
undoBtn.addEventListener('click', () => {
  if (!window.ROOM_ID) return alert('Join a room first');
  window.socket.emit('undo', { roomId: window.ROOM_ID });
});

clearBtn.addEventListener('click', () => {
  // clear local and request server to reset (simple approach)
  if (!window.ROOM_ID) return alert('Join a room first');
  // remove all ops on server by doing repeated undo OR reinitialize
  // Simpler: request server to set empty ops by emitting redo/undo until empty is complex.
  // We'll request server-side state then clear client and emit a special "clear" -> implement simply:
  window.socket.emit('clear-room', { roomId: window.ROOM_ID }); // server may ignore if not supported
  // locally clear canvas
  if (window._collabCanvas) window._collabCanvas.clear();
});

// support server-sent clear-room (optional)
window.socket.on('clear-room', () => {
  if (window._collabCanvas) window._collabCanvas.clear();
});
