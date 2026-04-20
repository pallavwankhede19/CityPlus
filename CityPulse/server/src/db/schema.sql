CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS signals (
  intersection_id TEXT PRIMARY KEY,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_signals_location_gist
  ON signals
  USING GIST (location);
