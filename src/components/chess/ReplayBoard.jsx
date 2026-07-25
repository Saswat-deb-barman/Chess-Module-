import { useState } from "react";
import { getPositionAtPlyFromPgn, getPlyCountFromPgn } from "../../lib/gameLogic.js";
import BoardSurface from "./BoardSurface.jsx";

/**
 * Read-only, ply-scrubbable replay of a finished, static PGN — the first
 * real consumer of BoardSurface. Not wired to any live game state; the
 * position is purely derived from the PGN + a local ply cursor. Starts
 * at the final position (plyIndex = last ply), since that's the more
 * useful default for reviewing a finished game.
 *
 * `decorative` boards (future: login front door) ignore `plyIndex` state
 * entirely and expect a caller-driven autoplay loop instead — that timer
 * lands with the first decorative consumer, not here.
 */
export default function ReplayBoard({ pgn, decorative = false }) {
  const totalPlies = getPlyCountFromPgn(pgn);
  const [plyIndex, setPlyIndex] = useState(totalPlies - 1);

  const position = getPositionAtPlyFromPgn(pgn, plyIndex);

  return (
    <div className="replay-board">
      <BoardSurface
        position={position}
        arePiecesDraggable={false}
        decorative={decorative}
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
