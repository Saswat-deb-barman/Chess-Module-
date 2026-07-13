import { useEffect, useRef, useState, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { createGame, tryMove, getGameOverReason, getResultTag, toFen, toPgn } from "../lib/gameLogic.js";
import { Engine, parseUciMove } from "../engine/stockfishWorker.js";
import { pingCouncil, recapCouncil, reportCouncil } from "../lib/council.js";
import { analyzeGame } from "../lib/gameAnalysis.js";
import { useBoardWidth } from "../hooks/useBoardWidth.js";
import Clock, { INITIAL_TIMES } from "./Clock.jsx";
import MoveHistory from "./MoveHistory.jsx";
import CouncilPanel from "./CouncilPanel.jsx";
import CouncilReport from "./CouncilReport.jsx";

// Human always plays White in Phase 1 — a color picker is a cheap add
// later but isn't needed to validate the core loop.
const HUMAN_COLOR = "w";

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Which of the (deliberately few) moments the council reacts to, if any.
 * Checked in this order so a checkmating move doesn't also read as a
 * generic "check" — mate implies check, but only the more specific label
 * is worth a reaction.
 */
function detectMoment(game, move) {
  if (game.isCheckmate()) return "checkmate";
  if (game.isCheck()) return "check";
  if (move.captured) return "capture";
  return null;
}

export default function Board({ difficulty, onGameEnd, onRecap, onCouncilReport }) {
  const gameRef = useRef(
    createGame({ white: "Human", black: `Stockfish (${capitalize(difficulty)})` })
  );
  const engineRef = useRef(null);
  const timesRef = useRef({ ...INITIAL_TIMES });
  const unmountedRef = useRef(false);

  const [fen, setFen] = useState(toFen(gameRef.current));
  const [pgn, setPgn] = useState("");
  const [status, setStatus] = useState(null); // null while in progress, string when over
  const [botThinking, setBotThinking] = useState(false);
  const [boardContainerRef, boardWidth] = useBoardWidth();
  const [flipped, setFlipped] = useState(false); // CM-201 test scaffolding: no flip control existed before
  const [councilMessages, setCouncilMessages] = useState([]);
  const [recap, setRecap] = useState(null);
  const [definingMoves, setDefiningMoves] = useState([]);
  const [councilReport, setCouncilReport] = useState(null);
  const [councilAnalyzing, setCouncilAnalyzing] = useState(false);

  // Fire-and-forget: the council is commentary, never gameplay-blocking.
  const firePing = useCallback((game, move) => {
    const moment = detectMoment(game, move);
    if (!moment) return;
    pingCouncil({ moment, san: move.san }).then((message) => {
      if (message) setCouncilMessages((prev) => [...prev, message]);
    });
  }, []);

  useEffect(() => {
    // Reset (not just initialize) — React StrictMode's dev-mode double-
    // invoke runs this effect, its cleanup, then this effect again on the
    // same ref object. Without resetting here, the first cleanup's `true`
    // would permanently poison every later guard in this component,
    // silently swallowing the Council Report result (see runCouncilAnalysis).
    unmountedRef.current = false;
    const engine = new Engine();
    engine.setDifficulty(difficulty);
    engineRef.current = engine;
    return () => {
      unmountedRef.current = true;
      engine.destroy();
    };
    // difficulty is locked once a game starts (enforced in App.jsx), so
    // this effect intentionally only runs once per Board mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Post-game "Council Report": reuses the same engine instance that just
  // played (Skill Level only weakens which move it CHOOSES, not how it
  // SCORES a position — see Engine.analyzePosition — so no strength reset
  // is needed here) to flag defining moves, then asks the 5 personas to
  // narrate them. Guarded against a "New game" click firing before this
  // finishes and terminating the worker mid-analysis (unmountedRef) —
  // that just means the report never lands for a game nobody's looking at
  // anymore, not a crash.
  const runCouncilAnalysis = useCallback(
    async (finishedPgn, resultTag) => {
      if (!engineRef.current) return;
      setCouncilAnalyzing(true);
      try {
        const { definingMoves: flagged } = await analyzeGame(finishedPgn, engineRef.current, { depth: 12 });
        if (unmountedRef.current) return;
        setDefiningMoves(flagged);

        const report = await reportCouncil({ pgn: finishedPgn, result: resultTag, definingMoves: flagged });
        if (unmountedRef.current) return;
        if (report) setCouncilReport(report);
        onCouncilReport?.({ definingMoves: flagged, report });
      } finally {
        if (!unmountedRef.current) setCouncilAnalyzing(false);
      }
    },
    [onCouncilReport]
  );

  const endGame = useCallback((reason, { flagFallWinner, resignedBy } = {}) => {
    const game = gameRef.current;
    const result = getResultTag(game, { flagFallWinner, resignedBy });
    game.header("Result", result);
    const pgn = toPgn(game);
    setPgn(pgn);
    setStatus(reason);
    onGameEnd?.({
      pgn,
      reason,
      result,
      white: "Human",
      black: `Stockfish (${capitalize(difficulty)})`,
      difficulty,
    });
    recapCouncil({ pgn }).then((message) => {
      if (message) {
        setRecap(message);
        onRecap?.(message);
      }
    });
    runCouncilAnalysis(pgn, result);
  }, [onGameEnd, onRecap, difficulty, runCouncilAnalysis]);

  const requestBotMove = useCallback(async () => {
    const game = gameRef.current;
    if (game.isGameOver() || status) return;
    setBotThinking(true);
    try {
      const uci = await engineRef.current.getBestMove(toFen(game));
      const { from, to, promotion } = parseUciMove(uci);
      const move = tryMove(game, from, to, promotion);
      if (move) {
        setFen(toFen(game));
        setPgn(toPgn(game));
        firePing(game, move);
        const reason = getGameOverReason(game);
        if (reason) endGame(reason);
      }
    } finally {
      setBotThinking(false);
    }
  }, [status, endGame, firePing]);

  function onPieceDrop(sourceSquare, targetSquare) {
    const game = gameRef.current;
    if (status || game.turn() !== HUMAN_COLOR || botThinking) return false;

    const move = tryMove(game, sourceSquare, targetSquare);
    if (!move) return false; // triggers react-chessboard's snapback

    setFen(toFen(game));
    setPgn(toPgn(game));
    firePing(game, move);

    const reason = getGameOverReason(game);
    if (reason) {
      endGame(reason);
    } else {
      requestBotMove();
    }
    return true;
  }

  function handleFlagFall(color) {
    // The side whose clock hit zero loses; the other side wins.
    const winner = color === "w" ? "b" : "w";
    endGame(`${winner === "w" ? "White" : "Black"} wins on time`, { flagFallWinner: winner });
  }

  function handleResign() {
    // Only the human can resign in Phase 1 — the bot never quits mid-game.
    endGame("Black wins by resignation", { resignedBy: HUMAN_COLOR });
  }

  const baseOrientation = HUMAN_COLOR === "w" ? "white" : "black";
  const boardOrientation = flipped
    ? (baseOrientation === "white" ? "black" : "white")
    : baseOrientation;

  return (
    <div className="board-screen">
      <Clock
        activeColor={gameRef.current.turn()}
        running={!status}
        onFlagFall={handleFlagFall}
        timesRef={timesRef}
      />
      <div className="board-wrap" ref={boardContainerRef}>
        {boardWidth > 0 && (
          <Chessboard
            key={boardWidth}
            boardWidth={boardWidth}
            position={fen}
            onPieceDrop={onPieceDrop}
            boardOrientation={boardOrientation}
            arePiecesDraggable={!status}
          />
        )}
      </div>
      {botThinking && <p className="bot-thinking">Bot is thinking…</p>}
      {!status && (
        <button className="resign-button" onClick={handleResign}>
          Resign
        </button>
      )}
      <button className="flip-button" onClick={() => setFlipped((f) => !f)}>
        Flip board
      </button>
      {status && <p className="game-status">{status}</p>}
      <MoveHistory pgn={pgn} />
      <CouncilPanel messages={councilMessages} recap={recap} />
      {status && (
        <CouncilReport definingMoves={definingMoves} report={councilReport} loading={councilAnalyzing} />
      )}
    </div>
  );
}
