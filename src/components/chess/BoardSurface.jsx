import { Chessboard } from "react-chessboard";
import { useBoardWidth } from "../../hooks/useBoardWidth.js";
import { buildPieceSet } from "./pieceSet.jsx";

const PIECE_SET = buildPieceSet();

/**
 * The presentational board-rendering shell — the exact
 * `<div className="board-wrap"><Chessboard .../></div>` block Board.jsx
 * and MultiplayerBoard.jsx already duplicate byte-for-byte. New surfaces
 * (replay, decorative, analysis) consume this directly. The two live,
 * CM-201-sensitive board files deliberately keep their own inline copies
 * for now rather than being refactored onto this mid-cycle — see the
 * Wave 1 plan's decision #1. Reuses useBoardWidth (the CM-201
 * ResizeObserver + remount-key fix) and buildPieceSet exactly as they do.
 *
 * `decorative` is ambient-only wiring here (aria-hidden, pointer-events
 * off) — the actual .board-wrap--decorative CSS (freezing under
 * prefers-reduced-motion) lands in the phase that adds the first real
 * decorative consumer.
 */
export default function BoardSurface({
  position,
  onPieceDrop = () => false,
  onSquareClick = () => {},
  customSquareStyles = {},
  boardOrientation = "white",
  arePiecesDraggable = false,
  decorative = false,
  className = "",
}) {
  const [boardContainerRef, boardWidth] = useBoardWidth();

  return (
    <div
      className={`board-wrap${decorative ? " board-wrap--decorative" : ""}${className ? ` ${className}` : ""}`}
      ref={boardContainerRef}
      aria-hidden={decorative ? "true" : undefined}
      style={decorative ? { pointerEvents: "none" } : undefined}
    >
      {boardWidth > 0 && (
        <Chessboard
          key={boardWidth}
          boardWidth={boardWidth}
          position={position}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={customSquareStyles}
          customPieces={PIECE_SET}
          customDarkSquareStyle={{ backgroundColor: "var(--sq-dark)" }}
          customLightSquareStyle={{ backgroundColor: "var(--sq-light)" }}
          boardOrientation={boardOrientation}
          arePiecesDraggable={arePiecesDraggable}
        />
      )}
    </div>
  );
}
