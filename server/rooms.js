import { createGame } from "./gameEngine.js";

// No 0/O/1/I/L — avoids ambiguity when a room code is typed or read aloud.
const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ABANDONED_ROOM_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
      ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function isSeatConnected(seat) {
  return !!seat?.socketId;
}

/**
 * The creator is registered as white immediately, not left as a bare
 * placeholder — otherwise a freshly-created, still-open room would look
 * "abandoned" (both seats empty) to sweepAbandonedRooms() before anyone
 * has even had a chance to join.
 */
export function createRoom(creatorSocketId, identity) {
  const code = generateRoomCode();
  const room = {
    code,
    white: { socketId: creatorSocketId, sub: identity.sub, email: identity.email },
    black: null,
    game: createGame({ white: identity.email }),
    ended: false,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

/**
 * "w" if socketId is currently connected as this room's white seat, "b"
 * for black, null if it's neither (spectators aren't a supported concept
 * — joinRoom already rejects a third connection to a full room).
 */
export function colorOf(room, socketId) {
  if (room.white?.socketId === socketId) return "w";
  if (room.black?.socketId === socketId) return "b";
  return null;
}

export function getRoom(code) {
  return rooms.get(code) ?? null;
}

export function deleteRoom(code) {
  rooms.delete(code);
}

export function findRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.white?.socketId === socketId || room.black?.socketId === socketId) return room;
  }
  return null;
}

/**
 * Marks a seat's connection as gone without discarding who was sitting
 * in it — sub/email need to survive a disconnect, since the game (and
 * its persistence, keyed to both players' identities) can still end
 * afterward via the remaining player resigning or a clock running out.
 * Only clearing socketId, not the whole seat object, is what makes that
 * still attributable to the right player.
 */
export function markDisconnected(room, socketId) {
  if (room.white?.socketId === socketId) room.white.socketId = null;
  if (room.black?.socketId === socketId) room.black.socketId = null;
}

export function bothSeatsDisconnected(room) {
  return !isSeatConnected(room.white) && !isSeatConnected(room.black);
}

/**
 * In-memory rooms have no other cleanup path since there's no
 * persistence layer to reap them. Two triggers: both seats disconnected
 * (the common case — socket.js's disconnect handler already deletes a
 * room the instant both players have left, this is just a backstop), or
 * a room that's simply been open too long regardless of connection state
 * (e.g. a host waiting alone for hours).
 */
export function sweepAbandonedRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const tooOld = now - room.createdAt > ABANDONED_ROOM_MAX_AGE_MS;
    if (bothSeatsDisconnected(room) || tooOld) rooms.delete(code);
  }
}

export function startCleanupSweep() {
  setInterval(sweepAbandonedRooms, CLEANUP_INTERVAL_MS).unref();
}
