export default function MoveHistory({ pgn }) {
  return (
    <div className="move-history">
      <h3>Moves</h3>
      <pre className="pgn-box">{pgn || "—"}</pre>
      {pgn && (
        <button onClick={() => navigator.clipboard.writeText(pgn)}>
          Copy PGN
        </button>
      )}
    </div>
  );
}
