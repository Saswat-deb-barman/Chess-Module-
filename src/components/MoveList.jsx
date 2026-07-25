import { useEffect, useRef } from "react";

/**
 * CM-205: numbered SAN move pairs read straight from chess.js's own
 * `history({verbose:true})` — not a PGN-text reparse — so ply index,
 * color, and SAN all come from the one source of truth `applyMove`
 * already writes to. Clicking a past ply doesn't touch the live game;
 * it just reports the chosen ply index up to the parent (see
 * getPositionAtPly in gameLogic.js for how that becomes a board position).
 */
export default function MoveList({ game, fen, previewIndex, onSelectPly, isLive }) {
  const listRef = useRef(null);
  const verboseHistory = game.history({ verbose: true });

  const pairs = [];
  for (let i = 0; i < verboseHistory.length; i += 2) {
    pairs.push({ number: i / 2 + 1, white: verboseHistory[i], black: verboseHistory[i + 1] });
  }

  const currentPly = previewIndex ?? verboseHistory.length - 1;

  useEffect(() => {
    if (isLive) {
      listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, isLive]);

  if (verboseHistory.length === 0) {
    return <p className="move-list-empty">No moves yet.</p>;
  }

  return (
    <div className="move-list" ref={listRef}>
      {pairs.map((pair) => {
        const whitePly = (pair.number - 1) * 2;
        const blackPly = whitePly + 1;
        return (
          <div className="move-list-row" key={pair.number}>
            <span className="move-list-number">{pair.number}.</span>
            <button
              className={`move-list-ply ${currentPly === whitePly ? "move-list-ply--current" : ""}`}
              onClick={() => onSelectPly(whitePly)}
            >
              {pair.white.san}
            </button>
            {pair.black && (
              <button
                className={`move-list-ply ${currentPly === blackPly ? "move-list-ply--current" : ""}`}
                onClick={() => onSelectPly(blackPly)}
              >
                {pair.black.san}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
