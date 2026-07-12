import { useState } from "react";
import { Chess } from "chess.js";
import { Engine } from "./engine/stockfishEngine.js";
import { analyzeGame } from "./lib/gameAnalysis.js";
import { computeCouncilScore } from "./lib/councilScore.js";
import { fetchReport } from "./lib/reviewApi.js";
import CouncilScore from "./components/CouncilScore.jsx";
import CouncilReport from "./components/CouncilReport.jsx";

function extractResult(pgn) {
  const match = pgn.match(/\[Result\s+"([^"]*)"\]/);
  return match?.[1] ?? null;
}

export default function App() {
  const [pgnInput, setPgnInput] = useState("");
  // Which side's Council Score gets computed — the report itself (defining
  // moves + persona prose) covers the whole game regardless, but a score
  // is inherently about one player, so this needs to be picked rather
  // than assumed (a pasted PGN could be either color, unlike core
  // chess-mvp where the human is always White in solo mode).
  const [perspective, setPerspective] = useState("w");
  const [status, setStatus] = useState("idle"); // idle | analyzing | narrating | done | error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [plies, setPlies] = useState([]);
  const [definingMoves, setDefiningMoves] = useState([]);
  const [report, setReport] = useState(null);

  const busy = status === "analyzing" || status === "narrating";
  const result = extractResult(pgnInput);
  const score = plies.length ? computeCouncilScore({ plies, perspective, result }) : null;

  async function handleAnalyze(e) {
    e.preventDefault();
    setError(null);
    setReport(null);
    setDefiningMoves([]);
    setPlies([]);

    const pgn = pgnInput.trim();
    if (!pgn) return;

    // Validate before spinning up the engine — a bad paste should fail
    // fast with a clear message, not a silent hang.
    try {
      new Chess().loadPgn(pgn);
    } catch {
      setError("That doesn't look like a valid PGN — check it pasted completely.");
      return;
    }

    setStatus("analyzing");
    const engine = new Engine();
    try {
      await engine.ready;
      const { plies: allPlies, definingMoves: flagged } = await analyzeGame(pgn, engine, {
        depth: 12,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setPlies(allPlies);
      setDefiningMoves(flagged);

      setStatus("narrating");
      const councilReport = await fetchReport({ pgn, result: extractResult(pgn), definingMoves: flagged });
      setReport(councilReport);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setError("Analysis failed — see console for details.");
      setStatus("error");
    } finally {
      engine.destroy();
      setProgress(null);
    }
  }

  return (
    <main className="review-app">
      <h1>Chess Council — Game Review</h1>
      <p className="review-intro">
        Paste any finished game's PGN — from chess-mvp, chess.com, wherever — and get the engine-flagged
        defining moves plus the council's five-persona breakdown. Standalone tool, not wired into any
        specific game source.
      </p>

      <form onSubmit={handleAnalyze} className="review-form">
        <textarea
          value={pgnInput}
          onChange={(e) => setPgnInput(e.target.value)}
          placeholder="Paste PGN here…"
          rows={10}
          disabled={busy}
        />

        <div className="perspective-picker">
          <span className="perspective-picker-label">Score for:</span>
          <label>
            <input
              type="radio"
              name="perspective"
              value="w"
              checked={perspective === "w"}
              onChange={() => setPerspective("w")}
              disabled={busy}
            />
            White
          </label>
          <label>
            <input
              type="radio"
              name="perspective"
              value="b"
              checked={perspective === "b"}
              onChange={() => setPerspective("b")}
              disabled={busy}
            />
            Black
          </label>
        </div>

        <button type="submit" disabled={!pgnInput.trim() || busy}>
          {status === "analyzing"
            ? progress
              ? `Analyzing move ${progress.done}/${progress.total}…`
              : "Analyzing…"
            : status === "narrating"
              ? "Council is writing…"
              : "Review game"}
        </button>
      </form>

      {error && <p className="review-error">{error}</p>}

      <CouncilScore score={score} />
      <CouncilReport definingMoves={definingMoves} report={report} loading={status === "narrating"} />
    </main>
  );
}
