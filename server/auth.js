import { OAuth2Client } from "google-auth-library";

const client = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

/**
 * Verifies a Google ID token sent from the frontend and returns the
 * caller's identity, or null if the token is missing/invalid/expired.
 * No sessions or cookies — every request re-verifies its own token,
 * which keeps the backend stateless.
 */
export async function verifyGoogleToken(idToken) {
  if (!client || !idToken) return null;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const identity = await verifyGoogleToken(idToken);
  if (!identity) return res.status(401).json({ error: "Sign-in required" });
  req.identity = identity;
  next();
}
