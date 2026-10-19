CREATE TABLE IF NOT EXISTS usage_days (
  day date PRIMARY KEY,
  finds integer NOT NULL DEFAULT 0,
  searches integer NOT NULL DEFAULT 0,
  stopped_finds integer NOT NULL DEFAULT 0,
  stopped_households integer NOT NULL DEFAULT 0
);
