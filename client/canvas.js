// canvas.js - integrated drawing + authoritative ops + remote cursors
const canvas = document.getElementById('draw');
const ctx = canvas.getContext('2d', { alpha: false });
const wrapper = document.getElementById('canvasWrapper');
const cursorsContainer = document.getElementById('cursors');

let dpr = window.devicePixelRatio || 1;
function resizeCanvas(){
  const rect = wrapper.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  redrawFromReplay();
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas,50);

// drawing state
let drawing = false, currentPoints = [];
let brushColor = '#1e40af', brushSize = 4;

// authoritative ops and derived strokes
const allOps = [];            // server op log (as received)
let replayStrokes = [];      // strokes to draw after applying undo/clear
const pendingStrokes = [];   // optimistic local strokes not yet matched

// helper: get pointer pos relative to wrapper
function getPos(ev){
  const r = wrapper.getBoundingClientRect();
  return { x: (ev.clientX ?? ev.touches?.[0]?.clientX) - r.left, y: (ev.clientY ?? ev.touches?.[0]?.clientY) - r.top };
}

// draw points polyline
function drawStrokePoints(points, color, width, ctxRef = ctx){
  if (!points || points.length === 0) return;
  ctxRef.lineJoin = 'round'; ctxRef.lineCap = 'round';
  ctxRef.strokeStyle = color; ctxRef.lineWidth = width;
  ctxRef.beginPath();
  ctxRef.moveTo(points[0].x, points[0].y);
  for (let i=1;i<points.length;i++) ctxRef.lineTo(points[i].x, points[i].y);
  ctxRef.stroke();
}

// pointer events (optimistic drawing)
canvas.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  drawing = true; currentPoints = []; const p = getPos(e); currentPoints.push(p);
});

canvas.addEventListener('pointermove', (e)=>{
  const p = getPos(e);
  if (drawing) {
    currentPoints.push(p);
    drawStrokePoints(currentPoints.slice(-2), brushColor, brushSize);
  }
  throttleEmitCursor(p.x, p.y);
});

canvas.addEventListener('pointerup', (e)=>{
  if (!drawing) return;
  drawing = false;
  const stroke = { tempId: crypto.randomUUID(), points: currentPoints.slice(), color: brushColor, width: brushSize };
  pendingStrokes.push(stroke);
  // send coalesced stroke
  if (window.socket && window.ROOM_ID) {
    window.socket.emit('draw', { roomId: window.ROOM_ID, userId: window.USER.id, points: stroke.points, color: stroke.color, width: stroke.width });
  }
  currentPoints = [];
});
canvas.addEventListener('pointercancel', ()=>{ drawing=false; currentPoints=[]; });

// rebuild replay from allOps
function computeReplayFromAllOps(){
  const undone = new Set(); let lastClear = -1;
  for (const op of allOps){
    if (op.type === 'clear') lastClear = op.seq;
    else if (op.type === 'undo' && op.payload?.targetOpId) undone.add(op.payload.targetOpId);
    else if (op.type === 'redo' && op.payload?.targetOpId) undone.delete(op.payload.targetOpId);
  }
  const result = [];
  for (const op of allOps){
    if (op.seq <= lastClear) continue;
    if (op.type === 'stroke' && !undone.has(op.opId)) result.push(op);
  }
  replayStrokes = result;
}

// redraw canvas from replay + optimistic pending
function redrawFromReplay(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (const s of replayStrokes){
    const pts = s.payload?.points ?? s.points ?? [];
    const color = s.payload?.color ?? s.color; const width = s.payload?.width ?? s.width;
    drawStrokePoints(pts, color, width);
  }
  // draw pending strokes not yet matched
  for (const p of pendingStrokes){
    const matched = replayStrokes.some(rs => comparePointsArray(rs.payload?.points ?? rs.points, p.points));
    if (!matched) drawStrokePoints(p.points, p.color, p.width);
  }
}

// simple comparison (same length + close points)
function comparePointsArray(a=[], b=[]){
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const tol = 2.0;
  for (let i=0;i<a.length;i++){
    if (Math.abs((a[i].x||0) - (b[i].x||0)) > tol || Math.abs((a[i].y||0)-(b[i].y||0)) > tol) return false;
  }
  return true;
}

// handle op from server (append and redraw)
function handleOpFromServer(op){
  allOps.push(op);
  computeReplayFromAllOps();
  // remove matched pending strokes
  for (let i=pendingStrokes.length-1;i>=0;i--){
    const p = pendingStrokes[i];
    const matched = replayStrokes.some(rs => comparePointsArray(rs.payload?.points ?? rs.points, p.points));
    if (matched) pendingStrokes.splice(i,1);
  }
  redrawFromReplay();
}
window.onOp = handleOpFromServer;

// handle replay (initial)
function handleReplayFromServer(ops){
  allOps.length = 0;
  for (const s of (ops||[])) allOps.push(s);
  computeReplayFromAllOps();
  pendingStrokes.length = 0;
  redrawFromReplay();
}
window.onReplay = handleReplayFromServer;

// clear action
function clearLocalAndNotify(){
  if (window.socket && window.ROOM_ID) window.socket.emit('clear', { roomId: window.ROOM_ID, userId: window.USER.id });
}
window.clearLocalAndNotify = clearLocalAndNotify;

// undo last global: request server to undo last replay stroke
function undoLastGlobal(){
  if (replayStrokes.length === 0) return;
  const last = replayStrokes[replayStrokes.length-1];
  if (!last || !last.opId) return;
  if (window.socket && window.ROOM_ID) window.socket.emit('undo', { roomId: window.ROOM_ID, targetOpId: last.opId, userId: window.USER.id });
}
window.undoLastGlobal = undoLastGlobal;

// set brush
function setBrush(color,size){ brushColor = color; brushSize = size; }
window.setBrush = setBrush;

// ---------- Remote cursors ---------- //
const remoteCursors = new Map();
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function createCursorElement(userId, name, color){
  const el = document.createElement('div'); el.className='remote-cursor';
  el.style.position='absolute'; el.style.left='0px'; el.style.top='0px';
  el.innerHTML = `<div class="cursor-dot" style="background:${color||'#333'};"></div><div class="cursor-label">${escapeHtml(name)}</div>`;
  cursorsContainer.appendChild(el);
  return el;
}

function handleRemoteCursor(data){
  const { userId, xNorm, yNorm, name, color } = data;
  const r = wrapper.getBoundingClientRect();
  const x = Math.round((xNorm||0) * r.width);
  const y = Math.round((yNorm||0) * r.height);

  let rec = remoteCursors.get(userId);
  if (!rec){
    const el = createCursorElement(userId, name || 'User', color || '#333');
    rec = { el, lastTs: Date.now() }; remoteCursors.set(userId, rec);
  } else { rec.lastTs = Date.now(); }
  rec.el.style.left = x + 'px'; rec.el.style.top = y + 'px';
}
window.onRemoteCursor = handleRemoteCursor;

// cursor emitting (throttle)
let lastCursorEmit = 0;
function emitCursor(x,y){
  if (!window.socket || !window.ROOM_ID) return;
  const rect = wrapper.getBoundingClientRect();
  const xNorm = Math.max(0, Math.min(1, x / rect.width));
  const yNorm = Math.max(0, Math.min(1, y / rect.height));
  window.socket.emit('cursor', { roomId: window.ROOM_ID, userId: window.USER.id, xNorm, yNorm, name: window.USER.name, color: brushColor });
}
function throttleEmitCursor(x,y){
  const now = performance.now();
  if (now - lastCursorEmit > 60){ lastCursorEmit = now; emitCursor(x,y); }
}

// cleanup stale cursors
setInterval(()=>{
  const now = Date.now();
  for (const [id, rec] of Array.from(remoteCursors.entries())){
    if (now - rec.lastTs > 5000){ rec.el.remove(); remoteCursors.delete(id); }
  }
},2000);
