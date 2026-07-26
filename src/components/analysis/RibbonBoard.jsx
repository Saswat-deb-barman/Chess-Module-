import { useState } from "react";
import { getMoveAtPly, getPlyCountFromPgn } from "../../lib/gameLogic.js";
import ReplayBoard from "../chess/ReplayBoard.jsx";
import EvalRibbon from "./EvalRibbon.jsx";

/**
 * Owns the ply cursor once and drives a controlled ReplayBoard + EvalRibbon
 * in sync, so CouncilReportBento and CouncilReport don't each duplicate
 * that state-ownership. The board highlights whatever move sits at the
 * current ply — scrubbing (via the ribbon or the plain scrubber) always
 * keeps the highlighted squares matching the real PGN move (COUNCIL_MODULE_SPEC_V1's
 * "board truth" rule), not a fixed snapshot of the initial critical moment.
 */
export default function RibbonBoard({ pgn, definingMoves = [], evalTrack, initialPly, mode = "beginner" }) {
  const totalPlies = getPlyCountFromPgn(pgn);
  const [plyIndex, setPlyIndex] = useState(initialPly ?? totalPlies - 1);
  const move = getMoveAtPly(pgn, plyIndex);

  return (
    <div className={`ribbon-board ribbon-board--${mode}`}>
      <ReplayBoard
        pgn={pgn}
        plyIndex={plyIndex}
        onPlyChange={setPlyIndex}
        originSquares={move ? [move.from] : []}
        targetSquares={move ? [move.to] : []}
        hideScrubber
      />
      <EvalRibbon
        evalTrack={evalTrack}
        definingMoves={definingMoves}
        totalPlies={totalPlies}
        plyIndex={plyIndex}
        onPlyChange={setPlyIndex}
        mode={mode}
      />
      {move && (
        <p className="ribbon-board-caption">
          {Math.floor(plyIndex / 2) + 1}
          {move.color === "w" ? "." : "…"} {move.san}
        </p>
      )}
    </div>
  );
}
