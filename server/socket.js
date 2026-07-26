import {
  createRoom,
  getRoom,
  findRoomBySocketId,
  deleteRoom,
  colorOf,
  markDisconnected,
  bothSeatsDisconnected,
  startCleanupSweep,
  resolveSeatForIdentity,
  isSeatConnected,
} from "./rooms.js";
import { tryMove, getGameOverReason, getResultTag, detectMoment, toFen, toPgn } from "./gameEngine.js";
import { saveGame, updateGameRecap, updateGameCouncilReport } from "./db.js";
import { getPing, getRecap, getCouncilReport } from "./council.js";
import { getLiteratureTile } from "./gemini.js";

/**
 * Milestone 3: the server now holds the authoritative chess.js instance
 * per room (in rooms.js) and re-validates every move — turn ownership by
 * socket identity, then legality via chess.js itself — before broadcasting.
 * A client's own local chess.js (in MultiplayerBoard.jsx) still rejects
 * obviously-illegal drags immediately for responsiveness, but this is the
 * check that actually matters: a tampered or buggy client can no longer
 * force a move the server doesn't agree is legal.
 *
 * Game-over detection (checkmate/draw/resign/timeExpired) also happens
 * here, emitting a single "gameOver" event and saving the finished game
 * directly (same process, no HTTP round-trip) so there's exactly one
 * place server-side that decides "this game just ended and here's who
 * played it." Council commentary is server-triggered too, for the same
 * reason: firing it here (not from either client) means exactly one
 * ping per notable move and one recap per game, never duplicated across
 * both players' connections.
 */
export function registerSocketHandlers(io) {
  startCleanupSweep();

  async function endGame(room, { reason, result }) {
    room.ended = true;
    room.game.header("Result", result);
    const pgn = toPgn(room.game);
    io.to(room.code).emit("gameOver", { reason, result, pgn });

    const viewerSub = room.white?.sub ?? room.black?.sub;

    // Best-effort: a game with no DATABASE_URL configured just doesn't
    // persist, same fail-soft contract as the rest of this app's
    // council/persistence calls — a save failure must never crash the
    // socket handler or affect the game the players just finished.
    let saved = null;
    try {
      saved = await saveGame({
        googleSub: viewerSub,
        googleEmail: room.white?.email ?? room.black?.email,
        white: room.white?.email ?? "Player 1",
        black: room.black?.email ?? "Player 2",
        difficulty: null,
        result,
        reason,
        pgn,
        whiteGoogleSub: room.white?.sub,
        whiteGoogleEmail: room.white?.email,
        blackGoogleSub: room.black?.sub,
        blackGoogleEmail: room.black?.email,
        mode: "friend",
      });
    } catch (err) {
      console.error("Failed to save friend game:", err.message);
    }

    // Recap is an async LLM call resolving after the row is already
    // saved — attached as a follow-up update, same pattern the solo-vs-
    // bot mode already uses (endGame -> saveGame -> recap -> patch).
    getRecap({ pgn }).then(async (message) => {
      if (!message) return;
      io.to(room.code).emit("councilRecap", { message });
      if (!saved) return;
      try {
        await updateGameRecap({ googleSub: viewerSub, gameId: saved.id, recap: message });
      } catch (err) {
        console.error("Failed to attach recap to friend game:", err.message);
      }
    });

    // The deep Council Report needs engine-computed defining moves,
    // which this server has no way to produce itself — running
    // Stockfish's WASM build directly in Node turned out to be
    // unreliable, so the analysis stays client-side (see
    // MultiplayerBoard.jsx, reusing solo mode's browser engine).
    // Retained here for the "submitDefiningMoves" handler below.
    room.savedGameId = saved?.id ?? null;
    room.viewerSub = viewerSub;
    room.finishedResult = result;
  }

  io.on("connection", (socket) => {
    socket.on("createRoom", () => {
      const room = createRoom(socket.id, socket.identity);
      socket.join(room.code);
      socket.emit("roomCreated", { code: room.code });
      socket.emit("playerRole", "w");
    });

    socket.on("joinRoom", (code) => {
      const room = getRoom(code);
      if (!room) return socket.emit("joinError", "Room not found.");

      // Wave 3: a challenge-accept room is reserved for two named subs
      // before either connects — resolveSeatForIdentity is the only path
      // in (rejecting anyone whose sub doesn't match an unclaimed expected
      // seat), a stricter check than the ad hoc path below. Either party
      // may arrive first, so "opponentJoined" only fires once BOTH seats
      // are actually connected, not just "someone just joined."
      if (room.expected) {
        const color = resolveSeatForIdentity(room, socket.identity.sub);
        if (!color) return socket.emit("joinError", "This game isn't for you.");
        room[color === "w" ? "white" : "black"] = {
          socketId: socket.id,
          sub: socket.identity.sub,
          email: socket.identity.email,
        };
        socket.join(room.code);
        socket.emit("playerRole", color);
        if (isSeatConnected(room.white) && isSeatConnected(room.black)) {
          io.to(room.code).emit("opponentJoined");
        }
        return;
      }

      // Ad hoc path — unchanged: any code-holder may claim the open seat.
      if (room.black) return socket.emit("joinError", "Room is already full.");
      room.black = { socketId: socket.id, sub: socket.identity.sub, email: socket.identity.email };
      room.game.header("Black", socket.identity.email);
      socket.join(room.code);
      socket.emit("playerRole", "b");
      io.to(room.code).emit("opponentJoined");
    });

    socket.on("move", (move) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || room.ended) return;

      const color = colorOf(room, socket.id);
      if (!color || room.game.turn() !== color) return; // not your seat, or not your turn

      const applied = tryMove(room.game, move.from, move.to, move.promotion);
      if (!applied) return; // illegal — client's own chess.js should have already prevented this

      socket.to(room.code).emit("move", move);
      io.to(room.code).emit("boardState", toFen(room.game));

      const moment = detectMoment(room.game, applied);
      if (moment) {
        getPing({ moment, san: applied.san }).then((message) => {
          if (message) io.to(room.code).emit("councilPing", { message, side: applied.color });
        });
      }

      const reason = getGameOverReason(room.game);
      if (reason) endGame(room, { reason, result: getResultTag(room.game) });
    });

    socket.on("resign", () => {
      const room = findRoomBySocketId(socket.id);
      if (!room || room.ended) return;
      const color = colorOf(room, socket.id);
      if (!color) return;
      endGame(room, {
        reason: getGameOverReason(room.game, { resignedBy: color }),
        result: getResultTag(room.game, { resignedBy: color }),
      });
    });

    // Trusted report from either connected client that a side's clock
    // hit zero — same trust model as the rest of this casual-friend-game
    // MVP, not a competitive anti-cheat system.
    socket.on("timeExpired", (color) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || room.ended || (color !== "w" && color !== "b")) return;
      const winner = color === "w" ? "b" : "w";
      endGame(room, {
        reason: getGameOverReason(room.game, { flagFallWinner: winner }),
        result: getResultTag(room.game, { flagFallWinner: winner }),
      });
    });

    // Either client may submit — whichever browser's local Stockfish
    // finishes analyzing first (see MultiplayerBoard.jsx). The actually
    // duplicable, actually costly part isn't the local engine analysis
    // (free, client-side) but the LLM call + persistence, so that's the
    // only piece guarded against duplication, same class of fix
    // Milestone 6 already applied to the simple recap.
    socket.on("submitDefiningMoves", async ({ definingMoves, evalTrack } = {}) => {
      const room = findRoomBySocketId(socket.id);
      if (!room || !room.ended || room.reportRequested) return;
      room.reportRequested = true;

      const pgn = toPgn(room.game);
      const [report, literature] = await Promise.all([
        getCouncilReport({ pgn, result: room.finishedResult, definingMoves }),
        getLiteratureTile({ pgn, definingMoves }),
      ]);
      // Each provider's absence degrades independently — a Claude-down
      // game can still surface Gemini's literature tile and vice versa;
      // only collapses to a true null when BOTH came back empty.
      const mergedReport = report || literature ? { ...report, literature } : null;
      io.to(room.code).emit("councilReport", { definingMoves, evalTrack, report: mergedReport });

      if (!room.savedGameId) return;
      try {
        await updateGameCouncilReport({
          googleSub: room.viewerSub,
          gameId: room.savedGameId,
          councilReport: { definingMoves, evalTrack, report: mergedReport },
        });
      } catch (err) {
        console.error("Failed to attach council report to friend game:", err.message);
      }
    });

    socket.on("disconnect", () => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      markDisconnected(room, socket.id);
      socket.to(room.code).emit("opponentDisconnected");
      if (bothSeatsDisconnected(room)) deleteRoom(room.code);
    });
  });
}
