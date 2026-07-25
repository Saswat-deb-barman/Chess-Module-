import pg from "pg";

const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;

/**
 * One table, no migration framework. Started as "save the finished
 * game's PGN (and later, its council recap) against whoever played it"
 * for solo-vs-bot; the white_google_sub/black_google_sub columns extend
 * that to real 2-player games, where the row needs to be visible to
 * *both* players independently rather than just one "viewer." Runs on
 * every boot; CREATE TABLE / ADD COLUMN IF NOT EXISTS makes this safe to
 * repeat against a table that already exists from before any of these
 * columns existed.
 */
export async function migrate() {
  if (!pool) return;
  await pool.query(`
    create table if not exists games (
      id serial primary key,
      google_sub text not null,
      google_email text,
      white text not null,
      black text not null,
      difficulty text not null,
      result text not null,
      pgn text not null,
      played_at timestamptz not null default now()
    );
    create index if not exists games_google_sub_idx on games (google_sub);
    alter table games add column if not exists recap text;
    alter table games add column if not exists white_google_sub text;
    alter table games add column if not exists white_google_email text;
    alter table games add column if not exists black_google_sub text;
    alter table games add column if not exists black_google_email text;
    alter table games add column if not exists mode text default 'bot';
    alter table games alter column difficulty drop not null;
    create index if not exists games_white_google_sub_idx on games (white_google_sub);
    create index if not exists games_black_google_sub_idx on games (black_google_sub);
    -- Chess Council module: the structured 5-persona report + engine-
    -- flagged defining moves, kept separate from the short "recap" text
    -- column above (recap stays the quick one-liner; council_report is
    -- the deep breakdown). jsonb, not a new table — same one-table
    -- philosophy as the rest of this schema.
    alter table games add column if not exists council_report jsonb;
    -- Wave 1: the human-readable end reason ("Checkmate", "White wins by
    -- resignation", "White wins on time"...) — already computed client-
    -- side (App.jsx's res.reason) and shown in the post-game UI, but
    -- never actually persisted until now. The stored result column is
    -- only the PGN tag ("1-0"/"0-1"/"1/2-1/2"/"*"), which can't
    -- distinguish checkmate from a timeout from a resignation — exactly
    -- the distinction the lost_won_on_time pattern (patternTaxonomy.js)
    -- needs. Historical rows have result_reason = null; detectPatterns
    -- treats that as "no signal for this pattern," never a crash.
    alter table games add column if not exists result_reason text;
    -- Wave 1: the beginner/advanced analysis-mode preference. Nullable,
    -- no default — "no row yet" / "analysis_mode is null" is a distinct
    -- state from "explicitly beginner," which is exactly what the
    -- one-time onboarding chooser needs to know whether to show itself.
    -- No users table exists (identity is purely the verified Google
    -- token's {sub, email}); this is keyed by the same google_sub every
    -- ownership check above already uses.
    create table if not exists user_settings (
      google_sub text primary key,
      analysis_mode text,
      updated_at timestamptz not null default now()
    );
  `);
}

export async function saveGame({
  googleSub,
  googleEmail,
  white,
  black,
  difficulty,
  result,
  reason,
  pgn,
  whiteGoogleSub,
  whiteGoogleEmail,
  blackGoogleSub,
  blackGoogleEmail,
  mode = "bot",
}) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `insert into games
       (google_sub, google_email, white, black, difficulty, result, result_reason, pgn,
        white_google_sub, white_google_email, black_google_sub, black_google_email, mode)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     returning id, white, black, difficulty, result, result_reason, pgn, recap, council_report, played_at, mode,
               white_google_sub, black_google_sub`,
    [
      googleSub,
      googleEmail,
      white,
      black,
      difficulty ?? null,
      result,
      reason ?? null,
      pgn,
      whiteGoogleSub ?? null,
      whiteGoogleEmail ?? null,
      blackGoogleSub ?? null,
      blackGoogleEmail ?? null,
      mode,
    ]
  );
  return rows[0];
}

// Every ownership check below matches on google_sub (the legacy single-
// viewer column, kept for old solo-bot rows saved before these identity
// columns existed) OR white_google_sub OR black_google_sub — a friend-mode
// row has two real players, and both need to pass this check for their
// own copy of the game, not just whichever one the legacy column
// happened to be set to.

/**
 * The council recap arrives asynchronously, after the game (and its
 * initial row) is already saved — this attaches it once it's ready.
 */
export async function updateGameRecap({ googleSub, gameId, recap }) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `update games set recap = $1
     where id = $2 and (google_sub = $3 or white_google_sub = $3 or black_google_sub = $3)
     returning id, white, black, difficulty, result, result_reason, pgn, recap, council_report, played_at, mode,
               white_google_sub, black_google_sub`,
    [recap, gameId, googleSub]
  );
  return rows[0] ?? null;
}

/**
 * Same arrives-later pattern as updateGameRecap, for the fuller Chess
 * Council report (5 personas + defining moves). Stored as jsonb, so the
 * object is JSON.stringify'd before binding — pg does not auto-serialize
 * plain JS objects passed as query params, even into a jsonb column.
 */
export async function updateGameCouncilReport({ googleSub, gameId, councilReport }) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `update games set council_report = $1
     where id = $2 and (google_sub = $3 or white_google_sub = $3 or black_google_sub = $3)
     returning id, white, black, difficulty, result, result_reason, pgn, recap, council_report, played_at, mode,
               white_google_sub, black_google_sub`,
    [JSON.stringify(councilReport), gameId, googleSub]
  );
  return rows[0] ?? null;
}

/**
 * Fetches one game, scoped to googleSub — used to build context for the
 * per-game chat endpoint, and doubles as the ownership check (a bad id
 * or a game neither side of googleSub played comes back null).
 */
export async function getGame({ googleSub, gameId }) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `select id, white, black, difficulty, result, result_reason, pgn, recap, council_report, played_at, mode,
            white_google_sub, black_google_sub
     from games where id = $1 and (google_sub = $2 or white_google_sub = $2 or black_google_sub = $2)`,
    [gameId, googleSub]
  );
  return rows[0] ?? null;
}

/**
 * Wave 1: analysisMode preference. `analysisMode: null` means "no row
 * yet, unset" — the frontend's onboarding chooser reads this to decide
 * whether to show itself. Never defaulted to "beginner" here; the
 * default is applied only where the value is *consumed*, so this stays
 * an honest read of what the user actually chose (or didn't).
 */
export async function getUserSettings(googleSub) {
  if (!pool) return { analysisMode: null };
  const { rows } = await pool.query(`select analysis_mode from user_settings where google_sub = $1`, [googleSub]);
  return { analysisMode: rows[0]?.analysis_mode ?? null };
}

export async function setUserSettings({ googleSub, analysisMode }) {
  if (!pool) return { analysisMode: null };
  const { rows } = await pool.query(
    `insert into user_settings (google_sub, analysis_mode, updated_at)
     values ($1, $2, now())
     on conflict (google_sub) do update set analysis_mode = $2, updated_at = now()
     returning analysis_mode`,
    [googleSub, analysisMode]
  );
  return { analysisMode: rows[0]?.analysis_mode ?? null };
}

export async function listGames(googleSub) {
  if (!pool) return [];
  const { rows } = await pool.query(
    `select id, white, black, difficulty, result, result_reason, pgn, recap, council_report, played_at, mode,
            white_google_sub, black_google_sub
     from games where google_sub = $1 or white_google_sub = $1 or black_google_sub = $1
     order by played_at desc
     limit 50`,
    [googleSub]
  );
  return rows;
}
