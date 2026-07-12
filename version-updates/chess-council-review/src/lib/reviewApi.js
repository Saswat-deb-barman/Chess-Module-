const BASE_URL = import.meta.env.VITE_REVIEW_API_URL ?? "http://localhost:8788";

/**
 * Fail-soft, same contract chess-mvp core's council client uses: resolves
 * to null instead of throwing on any failure (server not running, no API
 * key configured, network error), so the review UI can always fall back
 * to showing just the engine-flagged defining moves.
 */
export async function fetchReport({ pgn, result, definingMoves }) {
  try {
    const res = await fetch(`${BASE_URL}/report`, {
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
