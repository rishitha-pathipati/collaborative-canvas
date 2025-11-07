
---

## 🏗️ 2️⃣ ARCHITECTURE.md — (They check this for technical depth)

💡 This explains **how your app works internally**  
(architecture, data flow, undo/redo logic, etc.)  

---

### ✅ Final ARCHITECTURE.md content
You can use this **as-is**, no changes needed except your name at the bottom.

---

```markdown
# ⚙️ Architecture – Collaborative Canvas

## 🎯 Objective
To build a **real-time, multi-user drawing system** using raw web technologies (no frameworks) that supports synchronized drawing, global undo/redo, and eraser functionality.

---

## 🧩 Components Overview

### 1️⃣ Frontend (`client/`)
- **HTML5 Canvas**  
  Captures mouse/pointer events and renders drawings using native canvas APIs.
- **Socket.io Client**  
  Sends drawing data (`points`, `color`, `width`) and receives updates from the server.
- **UI Controls**  
  - Color picker  
  - Brush size slider  
  - Undo / Redo / Eraser / Clear buttons  
  - Room ID input + Join button  
- **Cursor Indicators**  
  Broadcasts normalized cursor coordinates for all users.

---

### 2️⃣ Backend (`server/`)
- **Express Server**  
  Serves static frontend files.
- **Socket.io WebSocket Server**  
  Handles connections, rooms, and event broadcasting.
- **Drawing State Manager (`drawing-state.js`)**  
  - Maintains operation log per room (`ops[]`)  
  - Each op = `{ seq, opId, type, payload, userId, ts }`  
  - Supports global undo/redo and eraser actions.

---

## 🔁 Data Flow (Draw / Undo / Redo)
1. User draws on canvas → emits `draw` event `{points, color, width}`  
2. Server:
   - Assigns `seq` and `opId`
   - Adds to op-log for that room  
   - Broadcasts `"op"` event to all users in that room  
3. All clients:
   - Receive the op  
   - Append it to
