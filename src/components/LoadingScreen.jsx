/**
 * Fills the gap App.jsx used to leave blank (`modeGateLoading ? null : …`)
 * while the beginner/advanced mode preference loads on every visit for a
 * signed-in user — the single most common "is anything happening?" moment
 * in the app, since it sits between sign-in and the dashboard actually
 * appearing. An indeterminate bar (no real progress fraction to report,
 * just "something's happening") rather than a spinner — matches the
 * brass-accent-on-felt language the rest of the app already uses.
 */
export default function LoadingScreen({ label = "Loading your dashboard…" }) {
  return (
    <div className="loading-screen">
      <div className="loading-bar">
        <div className="loading-bar-fill" />
      </div>
      <p className="loading-screen-label">{label}</p>
    </div>
  );
}
