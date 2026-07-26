import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { getPing, getRecap, getCouncilReport, answerQuestion } from "./council.js";
import {
  migrate,
  saveGame,
  listGames,
  getFriendGames,
  updateGameRecap,
  updateGameCouncilReport,
  getGame,
  getUserSettings,
  setUserSettings,
  createChallenge,
  getChallenge,
  listIncomingChallenges,
  listOutgoingChallenges,
  acceptChallenge,
  declineChallenge,
  expireStaleChallenges,
} from "./db.js";
import { requireAuth, verifyGoogleToken } from "./auth.js";
import { registerSocketHandlers } from "./socket.js";
import { reserveRoom } from "./rooms.js";
import { detectPatterns } from "./patternTaxonomy.js";
import { computeMyStats, rankWorthReviewing, computeRivalries } from "./stats.js";

const EXPIRE_CHALLENGES_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function toChallengeDTO(row) {
  if (!row) return null;
  return {
    id: row.id,
    fromUserId: row.from_google_sub,
    fromName: row.from_google_email,
    toUserId: row.to_google_sub,
    toName: row.to_google_email,
    timeControl: row.time_control,
    status: row.status,
    roomCode: row.room_code,
    createdAt: row.created_at,
  };
}

const allowedOrigins = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173,https://chess-module.vercel.app"
).split(",");

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.post("/council/ping", async (req, res) => {
  const { moment, san } = req.body ?? {};
  const message = await getPing({ moment, san });
  res.json({ message });
});

app.post("/council/recap", async (req, res) => {
  const { pgn } = req.body ?? {};
  const message = await getRecap({ pgn });
  res.json({ message });
});

// The deep 5-persona breakdown. Unauthenticated like the other council
// endpoints (commentary isn't gated behind sign-in) — `definingMoves`
// comes pre-computed from the client's own engine analysis
// (src/lib/gameAnalysis.js); this endpoint's only job is the LLM
// narration layer on top of that objective data.
app.post("/council/report", async (req, res) => {
  const { pgn, result, definingMoves } = req.body ?? {};
  const report = await getCouncilReport({ pgn, result, definingMoves });
  res.json({ report });
});

app.post("/games", requireAuth, async (req, res) => {
  const { white, black, difficulty, result, reason, pgn, whiteGoogleSub, whiteGoogleEmail, blackGoogleSub, blackGoogleEmail, mode } =
    req.body ?? {};
  const game = await saveGame({
    googleSub: req.identity.sub,
    googleEmail: req.identity.email,
    white,
    black,
    difficulty,
    result,
    reason,
    pgn,
    whiteGoogleSub,
    whiteGoogleEmail,
    blackGoogleSub,
    blackGoogleEmail,
    mode,
  });
  res.json({ game });
});

app.get("/games", requireAuth, async (req, res) => {
  const games = await listGames(req.identity.sub);
  // Attached on read, not baked into the cached council_report — so a
  // taxonomy improvement in patternTaxonomy.js applies retroactively to
  // every historical game without regenerating anything.
  const withPatterns = games.map((g) => ({ ...g, patterns: detectPatterns(g, req.identity.sub) }));
  // "Worth reviewing" is a ranking mode over this same result set, not a
  // separate query — see server/stats.js's rankWorthReviewing.
  const result = req.query.worthReviewing ? rankWorthReviewing(withPatterns, req.identity.sub) : withPatterns;
  res.json({ games: result });
});

// Wave 1: pure aggregate over already-classified game rows — no new
// schema, no model calls. See server/stats.js for the ranking/trend
// logic and server/patternTaxonomy.js for what a "pattern" is.
app.get("/me/stats", requireAuth, async (req, res) => {
  const games = await listGames(req.identity.sub);
  const stats = computeMyStats(games, req.identity.sub);
  res.json(stats);
});

// Wave 3: rivalries as a pure derived query over finished friend games —
// no opponent table, no new persistence. See server/stats.js's
// computeRivalries and server/db.js's getFriendGames.
app.get("/me/rivalries", requireAuth, async (req, res) => {
  const games = await getFriendGames(req.identity.sub);
  res.json({ rivalries: computeRivalries(games, req.identity.sub) });
});

// Wave 3: the challenge object — the reach-out half of rivalries. No
// "challenge by raw email" here (toGoogleSub must be a real user this
// caller already knows, e.g. from a rivalry row or a past game) — that's
// an invite-a-stranger flow, explicitly out of scope; the cold-invite
// path stays the shareable room link.
app.post("/challenges", requireAuth, async (req, res) => {
  const { toGoogleSub, toGoogleEmail, timeControl } = req.body ?? {};
  if (!toGoogleSub || toGoogleSub === req.identity.sub) {
    return res.status(400).json({ error: "Invalid opponent." });
  }
  const challenge = await createChallenge({
    fromGoogleSub: req.identity.sub,
    fromGoogleEmail: req.identity.email,
    toGoogleSub,
    toGoogleEmail,
    timeControl,
  });
  res.json({ challenge: toChallengeDTO(challenge) });
});

app.get("/me/challenges", requireAuth, async (req, res) => {
  const rows = req.query.direction === "outgoing"
    ? await listOutgoingChallenges(req.identity.sub)
    : await listIncomingChallenges(req.identity.sub);
  res.json({ challenges: rows.map(toChallengeDTO) });
});

// Accept reuses the existing room-code join machinery (rooms.js's
// reserveRoom) rather than building a second one — the accepting and
// challenging users both end up joining this room exactly the way anyone
// joins a shared room-code link (see FriendLobby's initialRoomCode).
app.post("/challenges/:id/accept", requireAuth, async (req, res) => {
  const challenge = await getChallenge(req.params.id);
  if (!challenge || challenge.to_google_sub !== req.identity.sub || challenge.status !== "pending") {
    return res.status(404).json({ error: "Challenge not found or not actionable." });
  }
  const room = reserveRoom({
    fromSub: challenge.from_google_sub,
    fromEmail: challenge.from_google_email,
    toSub: challenge.to_google_sub,
    toEmail: challenge.to_google_email,
  });
  const updated = await acceptChallenge({ id: challenge.id, roomCode: room.code });
  res.json({ challenge: toChallengeDTO(updated) });
});

app.post("/challenges/:id/decline", requireAuth, async (req, res) => {
  const challenge = await getChallenge(req.params.id);
  if (!challenge || challenge.to_google_sub !== req.identity.sub || challenge.status !== "pending") {
    return res.status(404).json({ error: "Challenge not found or not actionable." });
  }
  const updated = await declineChallenge(challenge.id);
  res.json({ challenge: toChallengeDTO(updated) });
});

app.patch("/games/:id", requireAuth, async (req, res) => {
  const { recap, councilReport } = req.body ?? {};
  // Both fields arrive independently and asynchronously (recap is the
  // quick Haiku/Sonnet one-liner, councilReport is the slower 5-persona
  // breakdown that needs client-side engine analysis first) — only patch
  // whichever one the caller actually sent, so an update to one never
  // wipes the other back to null.
  const game = recap !== undefined
    ? await updateGameRecap({ googleSub: req.identity.sub, gameId: req.params.id, recap })
    : await updateGameCouncilReport({ googleSub: req.identity.sub, gameId: req.params.id, councilReport });
  res.json({ game });
});

// Wave 1: the beginner/advanced analysis-mode preference. null means
// "unset" — the frontend's onboarding chooser uses that to decide
// whether to show itself; the "beginner" default is applied only where
// the value is actually consumed (report rendering, drills), not here.
app.get("/me/settings", requireAuth, async (req, res) => {
  const settings = await getUserSettings(req.identity.sub);
  res.json(settings);
});

app.patch("/me/settings", requireAuth, async (req, res) => {
  const { analysisMode } = req.body ?? {};
  const settings = await setUserSettings({ googleSub: req.identity.sub, analysisMode });
  res.json(settings);
});

app.post("/games/:id/ask", requireAuth, async (req, res) => {
  const { question } = req.body ?? {};
  const game = await getGame({ googleSub: req.identity.sub, gameId: req.params.id });
  if (!game) return res.status(404).json({ answer: null });
  // Solo-vs-bot games have no black_google_sub, so this correctly falls
  // through to "w" there — the human is always White in that mode.
  const askingColor = game.black_google_sub === req.identity.sub ? "b" : "w";
  const answer = await answerQuestion({ pgn: game.pgn, recap: game.recap, question, askingColor });
  res.json({ answer });
});

const server = createServer(app);

const io = new Server(server, { cors: { origin: allowedOrigins } });

// io.use only runs once, at handshake time — a token that expires mid-game
// won't disconnect anyone. That's intentional: nobody should get booted
// mid-move over a short casual game, and every /games REST call still
// re-verifies independently regardless of socket state.
io.use(async (socket, next) => {
  const identity = await verifyGoogleToken(socket.handshake.auth?.token);
  if (!identity) return next(new Error("Sign-in required"));
  socket.identity = identity;
  next();
});

registerSocketHandlers(io);

// A sibling interval to rooms.js's in-memory sweep, kept separate since
// rooms.js has no persistence layer at all today and this is a DB sweep —
// prevents pending challenges nobody ever answered from accreting forever
// in the "waiting on you" strip.
setInterval(() => {
  expireStaleChallenges().catch((err) => console.error("Failed to expire stale challenges:", err.message));
}, EXPIRE_CHALLENGES_INTERVAL_MS).unref();

const port = process.env.PORT || 8787;

migrate()
  .catch((err) => console.error("Migration failed:", err.message))
  .finally(() => {
    server.listen(port, () => {
      console.log(`Council server listening on http://localhost:${port}`);
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log("No ANTHROPIC_API_KEY set — council endpoints will respond with null messages.");
      }
      if (!process.env.DATABASE_URL) {
        console.log("No DATABASE_URL set — /games endpoints will respond with empty/null data.");
      }
      if (!process.env.GOOGLE_CLIENT_ID) {
        console.log("No GOOGLE_CLIENT_ID set — /games endpoints will reject all requests as unauthenticated.");
      }
    });
  });
