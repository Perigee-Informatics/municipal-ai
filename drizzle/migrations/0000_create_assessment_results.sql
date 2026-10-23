CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test text NOT NULL,
  code text NOT NULL,
  gender text,
  age_group text,
  education text,
  answers jsonb,
  score integer,
  max_score integer,
  seconds integer,
  submitted_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.assessment_results TO anon;
GRANT ALL ON public.assessment_results TO service_role;

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert"
ON public.assessment_results
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon select"
ON public.assessment_results
FOR SELECT
TO anon
USING (true);