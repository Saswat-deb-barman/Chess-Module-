import "dotenv/config";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { getPing, getRecap, getCouncilReport, answerQuestion } from "./council.js";
import { migrate, saveGame, listGames, updateGameRecap, updateGameCouncilReport, getGame } from "./db.js";
import { requireAuth, verifyGoogleToken } from "./auth.js";
import { registerSocketHandlers } from "./socket.js";

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
  const { white, black, difficulty, result, pgn, whiteGoogleSub, whiteGoogleEmail, blackGoogleSub, blackGoogleEmail, mode } =
    req.body ?? {};
  const game = await saveGame({
    googleSub: req.identity.sub,
    googleEmail: req.identity.email,
    white,
    black,
    difficulty,
    result,
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
  res.json({ games });
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
