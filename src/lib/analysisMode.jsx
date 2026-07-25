import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth.jsx";

const BASE_URL = import.meta.env.VITE_COUNCIL_URL ?? "http://localhost:8787";
const AnalysisModeContext = createContext(null);

async function fetchSettings(idToken, onUnauthorized) {
  try {
    const res = await fetch(`${BASE_URL}/me/settings`, {
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

async function patchSettings(idToken, analysisMode, onUnauthorized) {
  try {
    const res = await fetch(`${BASE_URL}/me/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ analysisMode }),
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

/**
 * App-wide beginner/advanced preference — mirrors lib/auth.jsx's shape.
 * `mode` stays null while loading OR genuinely unset (no /me/settings
 * row yet, i.e. the onboarding chooser hasn't run) — callers that need
 * a display default apply `mode ?? "beginner"` themselves, so this
 * provider stays an honest read of what's actually stored rather than
 * silently defaulting on their behalf.
 */
export function AnalysisModeProvider({ children }) {
  const { idToken, signOut } = useAuth();
  const [mode, setModeState] = useState(null);
  const [loading, setLoading] = useState(Boolean(idToken));

  useEffect(() => {
    if (!idToken) {
      setModeState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSettings(idToken, signOut).then((data) => {
      if (cancelled) return;
      setModeState(data?.analysisMode ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [idToken, signOut]);

  const setMode = useCallback(
    (next) => {
      setModeState(next); // optimistic — the chooser shouldn't wait on a round trip
      if (idToken) patchSettings(idToken, next, signOut);
    },
    [idToken, signOut]
  );

  return <AnalysisModeContext.Provider value={{ mode, setMode, loading }}>{children}</AnalysisModeContext.Provider>;
}

export function useAnalysisMode() {
  return useContext(AnalysisModeContext);
}
