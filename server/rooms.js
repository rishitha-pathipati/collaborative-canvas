// rooms.js
class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { users: new Map() });
    }
    return this.rooms.get(roomId);
  }

  addUser(roomId, socketId, username) {
    const room = this.getRoom(roomId);
    room.users.set(socketId, username);
  }

  removeUser(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.has(socketId)) {
        room.users.delete(socketId);
        if (room.users.size === 0) this.rooms.delete(roomId);
        return roomId;
      }
    }
    return null;
  }

  getUserList(roomId) {
    const room = this.getRoom(roomId);
    return Array.from(room.users.values());
  }
}

module.exports = RoomManager;
