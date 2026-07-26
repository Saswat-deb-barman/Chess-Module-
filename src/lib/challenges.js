const BASE_URL = import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";

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

export async function listChallenges(idToken, direction, { onUnauthorized } = {}) {
  const data = await request(`/me/challenges?direction=${direction}`, { idToken, onUnauthorized });
  return data?.challenges ?? [];
}

export async function createChallenge(idToken, { toGoogleSub, toGoogleEmail, timeControl }, { onUnauthorized } = {}) {
  const data = await request("/challenges", {
    method: "POST",
    body: { toGoogleSub, toGoogleEmail, timeControl },
    idToken,
    onUnauthorized,
  });
  return data?.challenge ?? null;
}

export async function acceptChallenge(idToken, id, { onUnauthorized } = {}) {
  const data = await request(`/challenges/${id}/accept`, { method: "POST", idToken, onUnauthorized });
  return data?.challenge ?? null;
}

export async function declineChallenge(idToken, id, { onUnauthorized } = {}) {
  const data = await request(`/challenges/${id}/decline`, { method: "POST", idToken, onUnauthorized });
  return data?.challenge ?? null;
}
