import { createGame } from "./gameEngine.js";

// No 0/O/1/I/L — avoids ambiguity when a room code is typed or read aloud.
const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const ABANDONED_ROOM_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
// CM-207: how long a room survives a disconnect before the server declares
// an auto-resignation. 60s per the locked spec decision.
const DISCONNECT_GRACE_MS = 60 * 1000;

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

export function isSeatConnected(seat) {
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
    // Set once a client submits post-game defining-move analysis (see
    // socket.js's "submitDefiningMoves" handler) — guards the one-per-
    // game LLM call + persistence against both clients submitting.
    reportRequested: false,
  };
  rooms.set(code, room);
  return room;
}

/**
 * Wave 3: a room pre-created for two SPECIFIC, named Google subs before
 * either has a live socket connection — what a challenge accept needs
 * (accept is a REST call; neither player necessarily has an open socket
 * at that moment). Unlike createRoom, nobody is seated yet: `expected`
 * records who's allowed into which seat, and each party claims their own
 * by calling the existing "joinRoom" socket event with this room's code
 * once they connect (see resolveSeatForIdentity + socket.js's generalized
 * joinRoom). Ad hoc rooms (createRoom) never set `expected` and are
 * completely unaffected by anything below.
 */
export function reserveRoom({ fromSub, fromEmail, toSub, toEmail }) {
  const code = generateRoomCode();
  const room = {
    code,
    white: null,
    black: null,
    game: createGame({ white: fromEmail, black: toEmail }),
    ended: false,
    createdAt: Date.now(),
    reportRequested: false,
    expected: {
      w: { sub: fromSub, email: fromEmail },
      b: { sub: toSub, email: toEmail },
    },
  };
  rooms.set(code, room);
  return room;
}

/**
 * Pure decision function — "which seat, if any, does this sub get to
 * claim right now." Exported on its own so it's unit-testable without a
 * live socket or a real Google token. Reconnect-safe: markDisconnected
 * only nulls a seat's socketId, not the seat object, so the same sub can
 * reclaim its seat after a drop; a different sub can never steal it.
 *
 * CM-207: originally only reserved/challenge rooms (`room.expected`) used
 * this path. Generalized so ad hoc rooms (the ordinary "Play a friend"
 * flow) support reconnect too — for those, "expected" is simply whoever
 * already has a seat here (checked against the actual `white`/`black`
 * occupants instead of a separate `expected` record, since ad hoc rooms
 * never have one).
 */
export function resolveSeatForIdentity(room, sub) {
  if (room.expected) {
    if (room.expected.w.sub === sub && !isSeatConnected(room.white)) return "w";
    if (room.expected.b.sub === sub && !isSeatConnected(room.black)) return "b";
    return null;
  }
  if (room.white?.sub === sub && !isSeatConnected(room.white)) return "w";
  if (room.black?.sub === sub && !isSeatConnected(room.black)) return "b";
  return null;
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
 * CM-207: arms a room's 60s auto-resign timer. `onExpire(room)` is
 * socket.js's job to supply — it needs `endGame`, which this module must
 * not import (rooms.js stays pure room-state/matching logic; socket.js
 * orchestrates the actual game-ending consequence, same layering as
 * every other room primitive here).
 */
export function armDisconnectGrace(room, onExpire) {
  room.disconnectGraceUntil = Date.now() + DISCONNECT_GRACE_MS;
  room.disconnectTimer = setTimeout(() => onExpire(room), DISCONNECT_GRACE_MS);
}

/**
 * Cancels a pending auto-resign timer (a reconnect, or both seats going
 * quiet — nobody left to resign in favor of) — must always be called
 * before a room is deleted or re-armed, or a stale timer fires against
 * state that's no longer valid.
 */
export function disarmDisconnectGrace(room) {
  clearTimeout(room.disconnectTimer);
  room.disconnectTimer = null;
  room.disconnectGraceUntil = null;
}

/**
 * In-memory rooms have no other cleanup path since there's no
 * persistence layer to reap them. Two triggers: both seats disconnected
 * (the common case — socket.js's disconnect handler already deletes a
 * room the instant both players have left, this is just a backstop), or
 * a room that's simply been open too long regardless of connection state
 * (e.g. a host waiting alone for hours).
 *
 * A freshly reserveRoom()'d room starts with BOTH seats legitimately null
 * (nobody has connected yet, by design) — that must not read as
 * "abandoned mid-game" the same way two real, previously-occupied seats
 * going quiet does, or a challenge room gets reaped before either party
 * has a chance to join it. Only a room that was ever occupied sweeps
 * immediately on both-quiet; an unclaimed reservation still expires
 * eventually via `tooOld`.
 */
export function sweepAbandonedRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const tooOld = now - room.createdAt > ABANDONED_ROOM_MAX_AGE_MS;
    const everOccupied = room.white !== null || room.black !== null;
    if ((everOccupied && bothSeatsDisconnected(room)) || tooOld) {
      disarmDisconnectGrace(room);
      rooms.delete(code);
    }
  }
}

export function startCleanupSweep() {
  setInterval(sweepAbandonedRooms, CLEANUP_INTERVAL_MS).unref();
}
