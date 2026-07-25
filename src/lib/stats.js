const BASE_URL = import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";

export async function fetchMyStats(idToken, { onUnauthorized } = {}) {
  try {
    const res = await fetch(`${BASE_URL}/me/stats`, {
      headers: { Authorization: `Bearer ${idToken}` },
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
