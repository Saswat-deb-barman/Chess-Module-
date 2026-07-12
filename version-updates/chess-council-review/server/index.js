import "dotenv/config";
import express from "express";
import cors from "cors";
import { getCouncilReport } from "./council.js";

const app = express();
// Wide open by default for local dev / early iteration — lock this down
// to the deployed frontend's real origin before this goes live, same
// reminder chess-mvp core's own HANDOFF.md carries for its server.
app.use(cors());
app.use(express.json({ limit: "2mb" })); // a full PGN + defining-moves list is small, but generous headroom over the default 100kb

app.post("/report", async (req, res) => {
  const { pgn, result, definingMoves } = req.body ?? {};
  if (!pgn) return res.status(400).json({ report: null, error: "pgn is required" });
  const report = await getCouncilReport({ pgn, result, definingMoves });
  res.json({ report });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY) });
});

const port = process.env.PORT || 8788;
app.listen(port, () => {
  console.log(`Chess Council Review server listening on http://localhost:${port}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("No ANTHROPIC_API_KEY set — /report will respond with a null report.");
  }
});
