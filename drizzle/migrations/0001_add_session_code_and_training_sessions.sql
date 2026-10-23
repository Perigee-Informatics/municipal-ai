ALTER TABLE public.assessment_results ADD COLUMN session_code TEXT;

CREATE TABLE public.training_sessions (
  code TEXT PRIMARY KEY,
  client TEXT,
  location TEXT,
  session_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.training_sessions TO anon;
GRANT ALL ON public.training_sessions TO service_role;
GRANT ALL ON public.assessment_results TO service_role;

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select training_sessions"
ON public.training_sessions
FOR SELECT
TO anon
USING (true);