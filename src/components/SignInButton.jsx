import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../lib/auth.jsx";

export default function SignInButton() {
  const { user, signIn, signOut, enabled } = useAuth();

  if (!enabled) return null; // no GOOGLE_CLIENT_ID configured — guest-only mode

  if (user) {
    return (
      <div className="auth-bar">
        <span className="auth-email">{user.email}</span>
        <button className="auth-signout" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="auth-bar">
      <GoogleLogin
        onSuccess={(credentialResponse) => signIn(credentialResponse.credential)}
        onError={() => console.error("Google sign-in failed")}
      />
    </div>
  );
}
