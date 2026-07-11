import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { createGame, tryMove, toFen } from "../lib/gameLogic.js";
import { socket } from "../lib/multiplayerSocket.js";
import CouncilPanel from "./CouncilPanel.jsx";

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
 */
export default function MultiplayerBoard({ myColor }) {
  const gameRef = useRef(createGame({ white: "Player 1", black: "Player 2" }));
  const [fen, setFen] = useState(toFen(gameRef.current));
  const [status, setStatus] = useState(null);
  const [councilMessages, setCouncilMessages] = useState([]);
  const [recap, setRecap] = useState(null);

  useEffect(() => {
    function handleOpponentMove(move) {
      const applied = tryMove(gameRef.current, move.from, move.to, move.promotion);
      if (applied) setFen(toFen(gameRef.current));
    }
    function handleBoardState(serverFen) {
      gameRef.current.load(serverFen);
      setFen(serverFen);
    }
    function handleGameOver({ reason }) {
      setStatus(reason);
    }
    function handleOpponentDisconnected() {
      setStatus((current) => current ?? "Your opponent disconnected.");
    }
    function handleCouncilPing({ message }) {
      setCouncilMessages((prev) => [...prev, message]);
    }
    function handleCouncilRecap({ message }) {
      setRecap(message);
    }

    socket.on("move", handleOpponentMove);
    socket.on("boardState", handleBoardState);
    socket.on("gameOver", handleGameOver);
    socket.on("opponentDisconnected", handleOpponentDisconnected);
    socket.on("councilPing", handleCouncilPing);
    socket.on("councilRecap", handleCouncilRecap);
    return () => {
      socket.off("move", handleOpponentMove);
      socket.off("boardState", handleBoardState);
      socket.off("gameOver", handleGameOver);
      socket.off("opponentDisconnected", handleOpponentDisconnected);
      socket.off("councilPing", handleCouncilPing);
      socket.off("councilRecap", handleCouncilRecap);
    };
  }, []);

  function onPieceDrop(sourceSquare, targetSquare) {
    const game = gameRef.current;
    if (status || game.turn() !== myColor) return false;

    const move = tryMove(game, sourceSquare, targetSquare);
    if (!move) return false; // triggers react-chessboard's snapback

    setFen(toFen(game));
    socket.emit("move", { from: sourceSquare, to: targetSquare, promotion: "q" });
    return true;
  }

  // The server is authoritative for the actual result (same reasoning as
  // every other end-of-game path) — this just reports the intent and
  // waits for the real "gameOver" event to set status.
  function handleResign() {
    socket.emit("resign");
  }

  return (
    <div className="board-screen">
      <div className="board-wrap">
        <Chessboard
          position={fen}
          onPieceDrop={onPieceDrop}
          boardOrientation={myColor === "w" ? "white" : "black"}
          arePiecesDraggable={!status}
        />
      </div>
      {!status && (
        <button className="resign-button" onClick={handleResign}>
          Resign
        </button>
      )}
      {status && <p className="game-status">{status}</p>}
      <CouncilPanel messages={councilMessages} recap={recap} />
    </div>
  );
}
