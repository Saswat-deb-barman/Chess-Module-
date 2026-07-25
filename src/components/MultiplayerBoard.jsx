import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { createGame, tryMove, toFen, toPgn, isMyTurn, getPositionAtPly } from "../lib/gameLogic.js";
import { socket } from "../lib/multiplayerSocket.js";
import { Engine } from "../engine/stockfishWorker.js";
import { analyzeGame } from "../lib/gameAnalysis.js";
import { useBoardWidth } from "../hooks/useBoardWidth.js";
import { useLegalTargets } from "../hooks/useLegalTargets.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useCheckAlert } from "../hooks/useCheckAlert.js";
import { buildMoveHighlightStyles } from "./MoveHighlightLayer.jsx";
import { buildPieceSet } from "./chess/pieceSet.jsx";
import TurnIndicator from "./TurnIndicator.jsx";
import CheckToast from "./CheckToast.jsx";
import GameRail from "./GameRail.jsx";
import CouncilPanel from "./CouncilPanel.jsx";
import CouncilReport from "./CouncilReport.jsx";

/**
 * Keeps its own local chess.js instance so onPieceDrop can keep returning
 * a synchronous boolean for react-chessboard's snapback, same contract
 * the solo-vs-bot Board.jsx already has — the opponent's move arrives
 * over the socket and gets applied the same way a bot move is today.
 * The server is authoritative (Milestone 3): "move" is the opponent's
 * move for optimistic replay, "boardState" is the server's own FEN after
 * every validated move — the reconciliation signal if this client's
 * local state ever drifted, not the primary path on every drop.
 *
 * Council commentary is server-triggered (never client-triggered here,
 * unlike solo mode) — "councilPing"/"councilRecap" just arrive over the
 * socket and get appended to local state, reusing the same CouncilPanel
 * component solo mode uses.
 *
 * The deeper Council Report is different: the server has no chess engine
 * of its own (running Stockfish's WASM build directly in Node turned out
 * to be unreliable), so *this* client runs the same browser-side analysis
 * solo mode uses (Engine + analyzeGame) and submits the result to the
 * server. Both players' clients do this independently — that's fine, the
 * analysis itself is free and local — but only the first submission the
 * server accepts triggers the actual LLM call and persistence (see
 * socket.js's "submitDefiningMoves" handler); the result is then
 * broadcast to both clients either way.
 */
const PIECE_SET = buildPieceSet();

export default function MultiplayerBoard({ myColor }) {
  const gameRef = useRef(createGame({ white: "Player 1", black: "Player 2" }));
  const engineRef = useRef(null);
  const unmountedRef = useRef(false);
  const [fen, setFen] = useState(toFen(gameRef.current));
  const [status, setStatus] = useState(null);
  const [boardContainerRef, boardWidth] = useBoardWidth();
  const [flipped, setFlipped] = useState(false); // CM-201 test scaffolding: no flip control existed before
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [previewPly, setPreviewPly] = useState(null); // null = live; a ply index = read-only preview
  const legalTargets = useLegalTargets(gameRef.current, selectedSquare, fen);
  const checkAlert = useCheckAlert(gameRef.current, fen);
  const [councilMessages, setCouncilMessages] = useState([]);
  const [recap, setRecap] = useState(null);
  const [definingMoves, setDefiningMoves] = useState([]);
  const [councilReport, setCouncilReport] = useState(null);
  const [councilAnalyzing, setCouncilAnalyzing] = useState(false);

  useDocumentTitle(isMyTurn(gameRef.current, myColor, status));

  useEffect(() => {
    // Reset (not reinitialize) — React StrictMode's dev-mode double-
    // invoke runs this effect, its cleanup, then this effect again on
    // the same ref object; without resetting here the first cleanup's
    // `true` would permanently poison the guards below (see Board.jsx
    // for where this exact bug was first found and fixed).
    unmountedRef.current = false;
    const engine = new Engine();
    engineRef.current = engine;
    return () => {
      unmountedRef.current = true;
      engine.destroy();
    };
  }, []);

  useEffect(() => {
    function handleOpponentMove(move) {
      const applied = tryMove(gameRef.current, move.from, move.to, move.promotion);
      if (applied) setFen(toFen(gameRef.current));
    }
    function handleBoardState(serverFen) {
      gameRef.current.load(serverFen);
      setFen(serverFen);
    }
    async function handleGameOver({ reason, pgn }) {
      setStatus(reason);
      if (!engineRef.current) return;
      setCouncilAnalyzing(true);
      try {
        const { definingMoves: flagged } = await analyzeGame(pgn, engineRef.current, { depth: 12 });
        if (unmountedRef.current) return;
        setDefiningMoves(flagged);
        socket.emit("submitDefiningMoves", flagged);
      } finally {
        if (!unmountedRef.current) setCouncilAnalyzing(false);
      }
    }
    function handleOpponentDisconnected() {
      setStatus((current) => current ?? "Your opponent disconnected.");
    }
    function handleCouncilPing({ message, side }) {
      setCouncilMessages((prev) => [...prev, { side, text: message }]);
    }
    function handleCouncilRecap({ message }) {
      setRecap(message);
    }
    // Broadcast to both clients regardless of which one's submission the
    // server actually accepted, so the "losing" submitter's UI still
    // gets the canonical result instead of hanging on its own local copy.
    function handleCouncilReport({ definingMoves: flagged, report }) {
      setDefiningMoves(flagged);
      setCouncilReport(report);
    }

    socket.on("move", handleOpponentMove);
    socket.on("boardState", handleBoardState);
    socket.on("gameOver", handleGameOver);
    socket.on("opponentDisconnected", handleOpponentDisconnected);
    socket.on("councilPing", handleCouncilPing);
    socket.on("councilRecap", handleCouncilRecap);
    socket.on("councilReport", handleCouncilReport);
    return () => {
      socket.off("move", handleOpponentMove);
      socket.off("boardState", handleBoardState);
      socket.off("gameOver", handleGameOver);
      socket.off("opponentDisconnected", handleOpponentDisconnected);
      socket.off("councilPing", handleCouncilPing);
      socket.off("councilRecap", handleCouncilRecap);
      socket.off("councilReport", handleCouncilReport);
    };
  }, []);

  // Selection can survive past a game-ending event that doesn't route
  // through applyMove (opponent disconnect, server-declared game over) —
  // clear it so a stale highlight can't linger once the game is over.
  useEffect(() => {
    if (status) setSelectedSquare(null);
  }, [status]);

  // Single move-application choke point — both onPieceDrop (drag) and
  // onSquareClick (click) call this, so the two paths can never diverge
  // (CM-203: "click-move and drag-move produce identical move objects").
  function applyMove(sourceSquare, targetSquare) {
    const game = gameRef.current;
    const move = tryMove(game, sourceSquare, targetSquare);
    if (!move) return null;

    setFen(toFen(game));
    socket.emit("move", { from: sourceSquare, to: targetSquare, promotion: "q" });
    return move;
  }

  function onPieceDrop(sourceSquare, targetSquare) {
    if (status || gameRef.current.turn() !== myColor) return false;
    const move = applyMove(sourceSquare, targetSquare);
    if (!move) return false; // triggers react-chessboard's snapback
    setSelectedSquare(null);
    return true;
  }

  function onSquareClick(square, piece) {
    if (!isMyTurn(gameRef.current, myColor, status)) return;

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      const isLegalTarget = legalTargets.some((move) => move.to === square);
      if (isLegalTarget) {
        applyMove(selectedSquare, square);
        setSelectedSquare(null);
        return;
      }
    }

    const isOwnPiece = piece && piece[0] === myColor;
    setSelectedSquare(isOwnPiece ? square : null);
  }

  // The server is authoritative for the actual result (same reasoning as
  // every other end-of-game path) — this just reports the intent and
  // waits for the real "gameOver" event to set status.
  function handleResign() {
    socket.emit("resign");
  }

  const baseOrientation = myColor === "w" ? "white" : "black";
  const boardOrientation = flipped
    ? (baseOrientation === "white" ? "black" : "white")
    : baseOrientation;

  const activeColor = gameRef.current.turn();
  const isPreviewing = previewPly !== null;
  const displayFen = isPreviewing ? getPositionAtPly(gameRef.current, previewPly) : fen;

  return (
    <div className="board-screen">
      {!status && (
        <TurnIndicator activeColor={activeColor} myColor={myColor} opponentLabel="opponent" />
      )}
      <div
        className={`board-wrap ${activeColor === myColor && !status ? "board-wrap--active-turn" : ""}`}
        ref={boardContainerRef}
      >
        {boardWidth > 0 && (
          <Chessboard
            key={boardWidth}
            boardWidth={boardWidth}
            position={displayFen}
            onPieceDrop={isPreviewing ? () => false : onPieceDrop}
            onSquareClick={isPreviewing ? () => {} : onSquareClick}
            customSquareStyles={
              isPreviewing ? {} : buildMoveHighlightStyles(selectedSquare, legalTargets, checkAlert.checkedKingSquare)
            }
            customPieces={PIECE_SET}
            customDarkSquareStyle={{ backgroundColor: "var(--sq-dark)" }}
            customLightSquareStyle={{ backgroundColor: "var(--sq-light)" }}
            boardOrientation={boardOrientation}
            arePiecesDraggable={!status && !isPreviewing}
          />
        )}
        {!isPreviewing && checkAlert.checkedColor === myColor && !checkAlert.isCheckmate && (
          <CheckToast key={fen} />
        )}
      </div>
      {!status && (
        <button className="resign-button" onClick={handleResign}>
          Resign
        </button>
      )}
      <button className="flip-button" onClick={() => setFlipped((f) => !f)}>
        Flip board
      </button>
      {status && <p className="game-status">{status}</p>}
      <GameRail
        game={gameRef.current}
        fen={fen}
        pgn={toPgn(gameRef.current)}
        previewPly={previewPly}
        onSelectPly={setPreviewPly}
        onBackToLive={() => setPreviewPly(null)}
      />
      <CouncilPanel messages={councilMessages} recap={recap} />
      {status && (
        <CouncilReport definingMoves={definingMoves} report={councilReport} loading={councilAnalyzing} />
      )}
    </div>
  );
}
