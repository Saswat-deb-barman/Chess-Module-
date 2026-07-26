import { useMemo } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../lib/auth.jsx";
import { pickLoginReplay } from "../lib/loginReplays.js";
import { listLoginBackgrounds } from "../lib/loginBackgrounds.js";
import DecorativeReplayBoard from "./chess/DecorativeReplayBoard.jsx";

// Picked once per mount, alongside the replay PGN below — the live board
// is always in the pool as its own entry, so an empty
// src/assets/login-backgrounds/ folder means this always resolves to the
// board, exactly LoginScreen's behavior before that folder existed.
function pickBackground(replayPgn) {
  const pool = [{ type: "board", pgn: replayPgn }, ...listLoginBackgrounds()];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * The front door (LOGIN_SPEC_V1) — the real screen for the cold invited
 * friend, replacing the bare sign-in button + landing message. Renders
 * only when Google auth is configured AND the visitor isn't signed in
 * (App.jsx's existing `!canPlay`); guest-only dev mode never reaches
 * this, same as before.
 *
 * Reuses useAuth() + <GoogleLogin> directly rather than wrapping
 * SignInButton, which is shaped for the post-login top-corner auth bar —
 * a different job. `?room=` swaps the kicker to acknowledge the invite
 * (§1/§5); the headline/dek/button stay identical in both states.
 */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const hasRoomCode = new URLSearchParams(window.location.search).has("room");
  // Picked once per mount, not on every render — a re-render mid-visit
  // shouldn't yank the board to a different game.
  const replayPgn = useMemo(() => pickLoginReplay(), []);
  const background = useMemo(() => pickBackground(replayPgn), [replayPgn]);

  return (
    <div className="login-screen">
      <div className="login-screen-board-layer">
        {background.type === "board" && (
          <div className="login-screen-board-inner">
            <DecorativeReplayBoard pgn={background.pgn} />
          </div>
        )}
        {background.type === "image" && <img className="login-screen-media" src={background.url} alt="" />}
        {background.type === "video" && (
          <video className="login-screen-media" src={background.url} autoPlay loop muted playsInline />
        )}
      </div>
      <div className="login-screen-scrim" />
      <div className="login-screen-vignette" />

      <div className="login-screen-content">
        <div className="login-screen-brand">
          Chess <span className="login-screen-brand-sub">by Alchemist</span>
        </div>

        <div className="login-screen-card">
          <p className="login-screen-kicker">
            {hasRoomCode ? "You've been invited to a game" : "A private room for six friends"}
          </p>
          <h1 className="login-screen-headline">
            Pull up a chair. The game&rsquo;s already <em>warm</em>.
          </h1>
          <p className="login-screen-dek">
            Play the people you actually know. When it ends, five coaches tell you what really
            happened on the board.
          </p>
          <div className="login-screen-signin">
            <GoogleLogin
              onSuccess={(credentialResponse) => signIn(credentialResponse.credential)}
              onError={() => console.error("Google sign-in failed")}
            />
          </div>
          <p className="login-screen-fineprint">
            One tap, only when you&rsquo;re ready to play. Watch a game first if you like.
          </p>
        </div>

        <p className="login-screen-pullquote">
          &ldquo;Nobody here is trying to be Magnus. We just like beating each other.&rdquo;
          <span className="login-screen-pullquote-attr">how it started</span>
        </p>
      </div>
    </div>
  );
}
