// The dashboard's top zone — a plain-English read on recent games, or an
// honest onboarding message when there isn't enough history yet
// (server/stats.js's MIN_GAMES_FOR_TRAJECTORY gate). Never fabricates a
// number: the "onboarding" shape carries no trend fields at all.
export default function TrajectoryHeader({ stats, loading }) {
  if (loading) {
    return (
      <div className="trajectory-header trajectory-header--loading">
        <div className="skeleton-bar trajectory-skeleton-line" />
      </div>
    );
  }
  if (!stats) return null;

  if (stats.trajectory.kind === "onboarding") {
    const remaining = stats.gamesAnalyzed === 0 ? "a few" : "a couple more";
    return (
      <div className="trajectory-header trajectory-header--onboarding">
        <p>Play {remaining} more analyzed games and your trajectory shows up here.</p>
      </div>
    );
  }

  return (
    <div className="trajectory-header">
      <p className="trajectory-sentence">{stats.trajectory.sentence}</p>
    </div>
  );
}
