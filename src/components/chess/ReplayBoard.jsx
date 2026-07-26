import { useState } from "react";
import { getPositionAtPlyFromPgn, getPlyCountFromPgn } from "../../lib/gameLogic.js";
import { buildAnalysisHighlightStyles } from "../AnalysisHighlightLayer.jsx";
import BoardSurface from "./BoardSurface.jsx";

/**
 * Read-only, ply-scrubbable replay of a finished, static PGN — the first
 * real consumer of BoardSurface. Not wired to any live game state; the
 * position is purely derived from the PGN + a local ply cursor. Starts
 * at `initialPly` if given (e.g. a report's critical moment), otherwise
 * the final position — the more useful default for reviewing a finished
 * game generically.
 *
 * `decorative` boards (future: login front door) ignore `plyIndex` state
 * entirely and expect a caller-driven autoplay loop instead — that timer
 * lands with the first decorative consumer, not here.
 */
export default function ReplayBoard({ pgn, decorative = false, initialPly, originSquares, targetSquares, dangerSquares }) {
  const totalPlies = getPlyCountFromPgn(pgn);
  const [plyIndex, setPlyIndex] = useState(initialPly ?? totalPlies - 1);

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
      {!decorative && totalPlies > 0 && (
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
