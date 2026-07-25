/**
 * Display-only mirror of server/patternTaxonomy.js's PATTERNS labels —
 * no detection logic here, just the id -> label strings the frontend
 * needs to render a pattern id it received from the server. Same
 * frontend/backend duplication precedent as gameEngine.js mirroring
 * gameLogic.js elsewhere in this codebase; keep in sync by hand if
 * labels change server-side.
 */
export const PATTERN_LABELS = {
  hanging_pieces: "Hanging pieces",
  wandering_queen: "Wandering queen / stalemate traps",
  lost_won_on_time: "Losing won positions on time",
  king_shelter: "Dismantled king shelter",
};
