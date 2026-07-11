import { createContext, useContext, useState } from "react";
import { GoogleOAuthProvider, googleLogout } from "@react-oauth/google";

const STORAGE_KEY = "chess-mvp-auth";
const AuthContext = createContext(null);

// Cosmetic only — the id token's signature/expiry is verified server-side
// on every request. This just reads the email out for the UI, so a
// full JWT-decode dependency isn't worth adding.
function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

function userFromToken(token) {
  try {
    const { email, sub } = decodeJwtPayload(token);
    return { email, sub };
  } catch {
    return null;
  }
}

function AuthState({ children }) {
  const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const [idToken, setIdToken] = useState(stored);
  const [user, setUser] = useState(stored ? userFromToken(stored) : null);

  function signIn(token) {
    localStorage.setItem(STORAGE_KEY, token);
    setIdToken(token);
    setUser(userFromToken(token));
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    setIdToken(null);
    setUser(null);
    googleLogout();
  }

  return (
    <AuthContext.Provider value={{ user, idToken, signIn, signOut, enabled: true }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Sign-in is entirely optional — no GOOGLE_CLIENT_ID means auth is just
 * unavailable and the app runs guest-only, same as before Stage 2 existed.
 */
export function AuthProvider({ children }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <AuthContext.Provider value={{ user: null, idToken: null, signIn: () => {}, signOut: () => {}, enabled: false }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthState>{children}</AuthState>
    </GoogleOAuthProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
