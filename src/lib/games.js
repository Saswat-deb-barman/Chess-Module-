const BASE_URL = import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";

/**
 * A 401 here almost always means the Google ID token expired (they last
 * ~1hr, with no silent refresh — see HANDOFF.md). The UI has no other way
 * to notice that: `user` is derived from decoding the stored token, not
 * from checking its expiry, so it'd otherwise keep showing "signed in"
 * indefinitely. onUnauthorized lets the caller (App.jsx) react by
 * signing out for real, which brings back the Sign-In button.
 */
async function request(path, { method = "GET", body, idToken, onUnauthorized } = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      onUnauthorized?.();
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveGame(
  idToken,
  { white, black, difficulty, result, pgn, whiteGoogleSub, whiteGoogleEmail, blackGoogleSub, blackGoogleEmail, mode },
  { onUnauthorized } = {}
) {
  const data = await request("/games", {
    method: "POST",
    body: { white, black, difficulty, result, pgn, whiteGoogleSub, whiteGoogleEmail, blackGoogleSub, blackGoogleEmail, mode },
    idToken,
    onUnauthorized,
  });
  return data?.game ?? null;
}

export async function listGames(idToken, { onUnauthorized } = {}) {
  const data = await request("/games", { idToken, onUnauthorized });
  return data?.games ?? [];
}

export async function updateGameRecap(idToken, gameId, recap, { onUnauthorized } = {}) {
  const data = await request(`/games/${gameId}`, { method: "PATCH", body: { recap }, idToken, onUnauthorized });
  return data?.game ?? null;
}

export async function askAboutGame(idToken, gameId, question, { onUnauthorized } = {}) {
  const data = await request(`/games/${gameId}/ask`, { method: "POST", body: { question }, idToken, onUnauthorized });
  return data?.answer ?? null;
}
