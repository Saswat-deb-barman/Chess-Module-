import { useState } from "react";
import { getPositionAtPlyFromPgn, getPlyCountFromPgn } from "../../lib/gameLogic.js";
import { buildAnalysisHighlightStyles } from "../AnalysisHighlightLayer.jsx";
import BoardSurface from "./BoardSurface.jsx";

/**
 * Read-only, ply-scrubbable replay of a finished, static PGN — the first
 * real consumer of BoardSurface. Not wired to any live game state; the
 * position is purely derived from the PGN + a ply cursor. Starts at
 * `initialPly` if given (e.g. a report's critical moment), otherwise the
 * final position — the more useful default for reviewing a finished game
 * generically.
 *
 * `decorative` boards (future: login front door) ignore `plyIndex` state
 * entirely and expect a caller-driven autoplay loop instead — that timer
 * lands with the first decorative consumer, not here.
 *
 * Controlled/uncontrolled hybrid: pass `plyIndex`/`onPlyChange` to let a
 * parent (e.g. RibbonBoard) own the cursor and drive this board and a
 * sibling eval ribbon in sync; omit both and this manages its own state
 * exactly as before — every existing caller is unaffected. `hideScrubber`
 * lets a controlling parent that already provides its own navigation
 * (RibbonBoard's eval ribbon) suppress this board's plain range input,
 * so the two don't stack as redundant controls.
 */
export default function ReplayBoard({
  pgn,
  decorative = false,
  initialPly,
  originSquares,
  targetSquares,
  dangerSquares,
  plyIndex: controlledPlyIndex,
  onPlyChange,
  hideScrubber = false,
}) {
  const totalPlies = getPlyCountFromPgn(pgn);
  const [internalPlyIndex, setInternalPlyIndex] = useState(initialPly ?? totalPlies - 1);
  const isControlled = controlledPlyIndex !== undefined;
  const plyIndex = isControlled ? controlledPlyIndex : internalPlyIndex;

  function setPlyIndex(next) {
    if (isControlled) onPlyChange?.(next);
    else setInternalPlyIndex(next);
  }

  const position = getPositionAtPlyFromPgn(pgn, plyIndex);
  const customSquareStyles =
    originSquares || targetSquares || dangerSquares
      ? buildAnalysisHighlightStyles(originSquares, targetSquares, dangerSquares)
      : undefined;

  return (
    <div className="replay-board">
      <BoardSurface
        position={position}
        arePiecesDraggable={false}
        decorative={decorative}
        customSquareStyles={customSquareStyles}
      />
      {!decorative && !hideScrubber && totalPlies > 0 && (
        <input
          type="range"
          className="replay-board-scrubber"
          min={0}
          max={totalPlies - 1}
          value={plyIndex}
          onChange={(e) => setPlyIndex(Number(e.target.value))}
          aria-label="Move"
        />
      )}
    </div>
  );
}
