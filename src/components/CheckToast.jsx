import { useEffect, useState } from "react";

const DISPLAY_MS = 2000;

/**
 * CM-204: single-purpose "Check." toast — no generic Toast system exists
 * yet and this cycle doesn't ask for one. The parent remounts this via
 * `key={fen}` each time a *new* position leaves the local player in
 * check, so a fresh 2s timer starts per check rather than one long-lived
 * instance trying to track re-checks itself.
 */
export default function CheckToast() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <div className="check-toast">Check.</div>;
}
