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
