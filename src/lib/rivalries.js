const BASE_URL = import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";

export async function fetchRivalries(idToken, { onUnauthorized } = {}) {
  try {
    const res = await fetch(`${BASE_URL}/me/rivalries`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 401) {
      onUnauthorized?.();
      return [];
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data.rivalries ?? [];
  } catch {
    return [];
  }
}
