const LEVELS = ["easy", "medium", "hard"];
const LABELS = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function DifficultySelector({ value, onChange, disabled }) {
  return (
    <div className="difficulty-selector">
      <label>Bot difficulty</label>
      <div className="difficulty-track">
        {LEVELS.map((level) => (
          <button
            key={level}
            className={`difficulty-option ${value === level ? "active" : ""}`}
            disabled={disabled}
            onClick={() => onChange(level)}
          >
            {LABELS[level]}
          </button>
        ))}
      </div>
      {disabled && (
        <p className="difficulty-hint">Difficulty locks once a game starts — start a new game to change it.</p>
      )}
    </div>
  );
}
