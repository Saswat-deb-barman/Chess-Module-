const BASE_URL = import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";

/**
 * Both council calls resolve to null on any failure (backend not running,
 * no API key configured, network error) rather than throwing — the chess
 * game itself must never block or break on the council being unavailable.
 */
async function post(path, body) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.message ?? null;
  } catch {
    return null;
  }
}

export function pingCouncil({ moment, san }) {
  return post("/council/ping", { moment, san });
}

export function recapCouncil({ pgn }) {
  return post("/council/recap", { pgn });
}

/**
 * The full Chess Council report — 5 personas + per-move captions, built
 * from the client's own engine-computed definingMoves (src/lib/
 * gameAnalysis.js). Same fail-soft contract: resolves to null instead of
 * throwing, since a missing report must never block the post-game screen.
 */
export async function reportCouncil({ pgn, result, definingMoves }) {
  try {
    const res = await fetch(`${BASE_URL}/council/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pgn, result, definingMoves }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.report ?? null;
  } catch {
    return null;
  }
}
