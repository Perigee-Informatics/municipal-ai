ALTER TABLE public.training_sessions ADD COLUMN test text;
ALTER TABLE public.training_sessions ADD CONSTRAINT training_sessions_test_check CHECK (test IS NULL OR test IN ('pre','post'));