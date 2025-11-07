// client/main.js

// get DOM elements
const joinBtn = document.getElementById('join-btn');
const roomInput = document.getElementById('room-input');

// join handler
async function joinRoom() {
  const roomId = roomInput.value.trim();
  if (!roomId) {
    alert('Enter room id');
    return;
  }
  window.ROOM_ID = roomId;

  // make sure socket exists and is connected (wait if needed)
  const s = window.socket;
  if (!s) {
    console.error('socket not available');
    return;
  }

  s.emit('join', { roomId, userId: window.USER.id, name: window.USER.name });
  console.log('joined room', roomId);
}

// hook button
joinBtn.addEventListener('click', joinRoom);

// listen for incoming drawing events (example event: 'draw')
window.socket?.on('draw', (op) => {
  // implement replay logic: draw op on canvas
  console.log('received draw op', op);
  // replayOp(op);   <-- call your existing drawing code here
});
