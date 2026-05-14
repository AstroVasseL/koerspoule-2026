-- Add FirstCycling rider ID to the riders table for fast result lookups
ALTER TABLE riders ADD COLUMN IF NOT EXISTS firstcycling_id integer;

-- Cache table: stores fetched 2026 season results per rider (TTL handled in edge function)
CREATE TABLE IF NOT EXISTS rider_results_cache (
  firstcycling_id  integer      NOT NULL,
  season           integer      NOT NULL DEFAULT 2026,
  rider_name       text         NOT NULL DEFAULT '',
  rider_team       text         NOT NULL DEFAULT '',
  rider_nationality text        NOT NULL DEFAULT '',
  results          jsonb        NOT NULL DEFAULT '[]'::jsonb,
  cached_at        timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (firstcycling_id, season)
);

-- Allow anyone to read the cache (public data); only the service role can write
ALTER TABLE rider_results_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read rider results cache"
  ON rider_results_cache FOR SELECT USING (true);