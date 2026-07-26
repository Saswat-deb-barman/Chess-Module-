const BASE_URL = import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";

/**
 * "Talk to the Council" — a general chess Q&A, not tied to a specific
 * saved game (see src/lib/games.js's askAboutGame for that variant, which
 * this mirrors). Same 401-means-expired-token handling as every other
 * authenticated lib wrapper in this app.
 */
export async function askCouncil(idToken, question, { onUnauthorized } = {}) {
  try {
    const res = await fetch(`${BASE_URL}/council/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ question }),
    });
    if (res.status === 401) {
      onUnauthorized?.();
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data?.answer ?? null;
  } catch {
    return null;
  }
}
