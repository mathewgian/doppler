CREATE TABLE public.aircraft_archive_positions (
  source text NOT NULL DEFAULT 'adsb.lol',
  icao24 text NOT NULL,
  observed_at timestamptz NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  altitude_m double precision,
  ground_speed_mps double precision,
  track_deg double precision,
  callsign text,
  position_source text,
  archive_url text NOT NULL,
  PRIMARY KEY (source, icao24, observed_at),
  CONSTRAINT valid_position CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);
GRANT ALL ON public.aircraft_archive_positions TO service_role;
ALTER TABLE public.aircraft_archive_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage archive positions" ON public.aircraft_archive_positions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX aircraft_archive_positions_time ON public.aircraft_archive_positions (observed_at);
COMMENT ON TABLE public.aircraft_archive_positions IS 'ADSB.lol historical positions. ODbL 1.0; attribution ADSB.lol and contributing feeders. Service-only import, no public write access.';