// main.js - Clean version (no duplicate variables)
document.getElementById('joinBtn').addEventListener('click', () => {
  const room = document.getElementById('roomInput').value.trim() || 'default-room';
  window.ROOM_ID = room;
  window.USER = window.USER || { id: crypto.randomUUID(), name: 'User-' + Math.floor(Math.random() * 1000) };
  joinRoom(room);
  document.getElementById('joinBtn').disabled = true;
  document.getElementById('roomInput').disabled = true;
});

const colorPickerEl = document.getElementById('colorPicker');
const brushSizeEl = document.getElementById('brushSize');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');

colorPickerEl.addEventListener('change', (e) => {
  window.setBrush(e.target.value, parseInt(brushSizeEl.value, 10));
});

brushSizeEl.addEventListener('input', (e) => {
  window.setBrush(colorPickerEl.value, parseInt(e.target.value, 10));
});

undoBtn.addEventListener('click', () => window.undoLastGlobal());
clearBtn.addEventListener('click', () => window.clearLocalAndNotify());

window.onUserList = (users) => {
  document.getElementById('userList').textContent = users.join(', ');
};

