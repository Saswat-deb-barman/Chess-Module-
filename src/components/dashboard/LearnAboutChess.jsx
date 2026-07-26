import { useState } from "react";
import { pickChessFact } from "../../lib/chessFacts.js";

/**
 * Works identically for a brand-new user and a 500-game veteran — no
 * fetch, no auth check, just a curated fact cycled client-side. Part of
 * the dashboard rewrite's "learn" section, which exists specifically so
 * the dashboard isn't boring before there's any game history yet.
 */
export default function LearnAboutChess() {
  const [{ index, fact }, setPicked] = useState(() => pickChessFact());

  return (
    <div className="learn-about-chess">
      <h3 className="learn-about-chess-title">{fact.title}</h3>
      <p className="learn-about-chess-body">{fact.body}</p>
      <button className="learn-about-chess-next-button" onClick={() => setPicked(pickChessFact(index))}>
        Next fact
      </button>
    </div>
  );
}
