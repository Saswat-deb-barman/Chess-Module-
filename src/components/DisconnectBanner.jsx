import { useEffect, useState } from "react";

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * CM-207: purely cosmetic countdown — the server's own 60s timer is the
 * real authority on when the auto-resign actually fires; this just ticks
 * a display value against the `until` timestamp it was handed.
 */
export default function DisconnectBanner({ until }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="disconnect-banner">
      Opponent disconnected. Auto-resign in {formatCountdown(until - now)}.
    </div>
  );
}
