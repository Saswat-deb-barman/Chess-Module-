import { useState } from "react";
import MoveList from "./MoveList.jsx";
import RailToggle from "./RailToggle.jsx";

const STORAGE_KEY = "chess-by-alchemist-rail-collapsed";
const MOBILE_BREAKPOINT_PX = 600;

// No stored preference yet: expanded on desktop, collapsed on mobile —
// read once at mount, not reactive to later window resizes.
function getDefaultCollapsed() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
}

/**
 * CM-205: single tabbed rail — this cycle only builds the Moves tab
 * (Talk/ChatPanel is friend-mode chat, a separate ticket). Copy-PGN
 * lives here now instead of the old standalone MoveHistory.jsx.
 */
export default function GameRail({ game, fen, pgn, previewPly, onSelectPly, onBackToLive }) {
  const [collapsed, setCollapsed] = useState(getDefaultCollapsed);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className={`game-rail ${collapsed ? "game-rail--collapsed" : ""}`}>
      <RailToggle collapsed={collapsed} onToggle={toggle} />
      {!collapsed && (
        <div className="game-rail-body">
          <h3>Moves</h3>
          <MoveList game={game} fen={fen} previewIndex={previewPly} onSelectPly={onSelectPly} isLive={previewPly === null} />
          {previewPly !== null && (
            <button className="back-to-live-button" onClick={onBackToLive}>
              Back to live
            </button>
          )}
          {pgn && (
            <button className="copy-pgn-button" onClick={() => navigator.clipboard.writeText(pgn)}>
              Copy PGN
            </button>
          )}
        </div>
      )}
    </div>
  );
}
