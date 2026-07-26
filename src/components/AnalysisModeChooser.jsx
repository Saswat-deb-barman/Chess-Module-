import { useAnalysisMode } from "../lib/analysisMode.jsx";

/**
 * One-question, one-time onboarding fork between auth success and the
 * dashboard — shown only while analysisMode is unset for a signed-in
 * user. A tiny, self-contained component: calls setMode() and nothing
 * else, no board/game coupling.
 */
export default function AnalysisModeChooser() {
  const { setMode } = useAnalysisMode();

  return (
    <div className="analysis-mode-chooser">
      <h2>New to chess notation, or fluent in it?</h2>
      <p className="analysis-mode-chooser-sub">
        This just changes how game reports read — you can change it later.
      </p>
      <div className="analysis-mode-chooser-options">
        <button className="start-button" onClick={() => setMode("beginner")}>
          Keep it simple
        </button>
        <button className="flip-button" onClick={() => setMode("advanced")}>
          Show me the numbers
        </button>
      </div>
    </div>
  );
}
