const { v4: uuidv4 } = require("uuid");

class DrawingState {
  constructor() {
    this.rooms = new Map();
  }

  _ensure(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { seq: 0, ops: [] });
    }
    return this.rooms.get(roomId);
  }

  _makeOp(room, type, payload = {}, userId = null) {
    room.seq += 1;
    const op = {
      seq: room.seq,
      opId: uuidv4(),
      type,
      payload,
      userId,
      ts: Date.now(),
    };
    room.ops.push(op);
    return op;
  }

  addStroke(roomId, { points, color = "#000", width = 3, userId }) {
    const room = this._ensure(roomId);
    const payload = { points, color, width };
    return this._makeOp(room, "stroke", payload, userId);
  }

  addClear(roomId, { userId }) {
    const room = this._ensure(roomId);
    return this._makeOp(room, "clear", {}, userId);
  }

  addUndo(roomId, { targetOpId, userId }) {
    const room = this._ensure(roomId);
    return this._makeOp(room, "undo", { targetOpId }, userId);
  }

  getReplayStrokes(roomId) {
    const room = this._ensure(roomId);
    const undone = new Set();
    let lastClear = -1;

    for (const op of room.ops) {
      if (op.type === "clear") lastClear = op.seq;
      if (op.type === "undo") undone.add(op.payload.targetOpId);
    }

    const strokes = [];
    for (const op of room.ops) {
      if (op.seq <= lastClear) continue;
      if (op.type === "stroke" && !undone.has(op.opId)) {
        strokes.push(op);
      }
    }
    return strokes;
  }
}

module.exports = DrawingState;
