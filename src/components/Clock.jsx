import { useEffect, useRef, useState } from "react";

const START_SECONDS = 10 * 60; // 10+0 rapid, fixed for Phase 1
export const INITIAL_TIMES = { w: START_SECONDS, b: START_SECONDS };

function format(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Two independent countdowns, only one ticking at a time based on
 * `activeColor`. Calls onFlagFall(color) exactly once when a side hits 0.
 * `running` lets the parent pause both clocks (e.g. game already over).
 *
 * Time state lives in a ref (timesRef) rather than component state so the
 * 10x/second tick doesn't fight React's render cycle — we trigger a
 * lightweight re-render with a local counter instead of storing the
 * clock values themselves in state.
 */
export default function Clock({ activeColor, running, onFlagFall, timesRef }) {
  const intervalRef = useRef(null);
  const firedRef = useRef(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const t = timesRef.current;
      t[activeColor] = Math.max(0, t[activeColor] - 0.1);
      if (t[activeColor] === 0 && !firedRef.current) {
        firedRef.current = true;
        onFlagFall(activeColor);
      }
      forceRender((n) => n + 1);
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [activeColor, running, onFlagFall, timesRef]);

  return (
    <div className="clock-pair">
      <span className={`clock ${activeColor === "b" ? "clock-active" : ""}`}>
        Black {format(timesRef.current.b)}
      </span>
      <span className={`clock ${activeColor === "w" ? "clock-active" : ""}`}>
        White {format(timesRef.current.w)}
      </span>
    </div>
  );
}
