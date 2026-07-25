const GLYPHS = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

const PIECE_NAMES = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };
const COLOR_NAMES = { w: "white", b: "black" };

// Every piece gets an aria-label ("white knight on f3").
function pieceAriaLabel(code, square) {
  const color = COLOR_NAMES[code[0]];
  const piece = PIECE_NAMES[code[1]];
  return `${color} ${piece} on ${square}`;
}

/**
 * Ported from version-updates/chess-app-ui-ux (the Green Room kit) as-is.
 * Styled Unicode glyphs rather than vector piece art — a deliberate
 * choice, not a placeholder. A real customPieces map react-chessboard
 * consumes directly, so swapping in real artwork later means replacing
 * this one file, nothing else.
 */
export function buildPieceSet() {
  const set = {};
  for (const [code, glyph] of Object.entries(GLYPHS)) {
    const isWhite = code[0] === "w";
    set[code] = ({ squareWidth, isDragging, square }) => (
      <div
        role="img"
        aria-label={square ? pieceAriaLabel(code, square) : undefined}
        style={{
          fontSize: squareWidth * 0.72,
          lineHeight: 1,
          color: isWhite ? "var(--paper-50)" : "var(--felt-950)",
          textShadow: isWhite ? "0 1px 2px rgba(0,0,0,.5)" : "0 1px 1px rgba(255,255,255,.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          opacity: isDragging ? 0 : 1,
          userSelect: "none",
        }}
      >
        {glyph}
      </div>
    );
  }
  return set;
}
