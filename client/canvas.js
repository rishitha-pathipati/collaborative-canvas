// client/canvas.js
// Canvas helpers and drawing logic. Exposes window._collabCanvas for other modules.

(function(){
  const canvas = document.getElementById('draw');
  const wrapper = document.getElementById('canvasWrapper');
  if (!canvas) {
    console.error('Canvas element #draw not found');
    return;
  }
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    renderBackground();
  }

  function renderBackground() {
    // optional: fill with black background like your UI
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  // drawing state
  let drawing = false;
  let last = null;

  function getPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
    const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function drawSegment(from, to, color, width) {
    if (!from || !to) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  // replay ops array
  function replayOps(ops = []) {
    // clear and redraw bg
    ctx.clearRect(0,0,canvas.width,canvas.height);
    renderBackground();
    for (const op of ops) {
      drawSegment(op.from, op.to, op.color, op.width);
    }
  }

  // local emit when drawing (other tab will receive)
  function startCapture(e) {
    e.preventDefault();
    drawing = true;
    last = getPointer(e);
  }
  function moveCapture(e) {
    if (!drawing) return;
    const p = getPointer(e);
    // draw locally
    const color = document.getElementById('colorPicker').value || '#1e40af';
    const width = parseInt(document.getElementById('brushSize').value || '4', 10);
    drawSegment(last, p, color, width);
    // emit op
    if (window.socket && window.ROOM_ID) {
      const op = { from: last, to: p, color, width, userId: window.USER.id };
      window.socket.emit('draw', { roomId: window.ROOM_ID, op });
    }
    last = p;
  }
  function endCapture(e) {
    drawing = false;
    last = null;
  }

  // setup events
  canvas.addEventListener('mousedown', startCapture);
  canvas.addEventListener('mousemove', moveCapture);
  canvas.addEventListener('mouseup', endCapture);
  canvas.addEventListener('mouseleave', endCapture);
  canvas.addEventListener('touchstart', startCapture, { passive:false });
  canvas.addEventListener('touchmove', moveCapture, { passive:false });
  canvas.addEventListener('touchend', endCapture);

  window.addEventListener('resize', resize);
  // initialize
  setTimeout(resize, 50);

  // expose API
  window._collabCanvas = {
    drawSegment,
    replayOps,
    clear: () => { ctx.clearRect(0,0,canvas.width,canvas.height); renderBackground(); }
  };
})();
