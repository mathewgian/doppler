CREATE TABLE public.aircraft_archive_days (
 day date PRIMARY KEY,
 archive_url text NOT NULL,
 row_count bigint NOT NULL,
 completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.aircraft_archive_days TO service_role;
ALTER TABLE public.aircraft_archive_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages completed archive days" ON public.aircraft_archive_days FOR ALL TO service_role USING (true) WITH CHECK (true);
COMMENT ON TABLE public.aircraft_archive_days IS 'Only mark complete after full daily archive extraction and verified position loading; partial rows do not establish coverage.';