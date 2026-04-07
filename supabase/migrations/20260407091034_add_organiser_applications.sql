-- Migration to add organiser applications table and logic

CREATE TABLE public.organiser_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  league_url  TEXT NOT NULL,
  association TEXT NOT NULL,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast "pending first" admin queries
CREATE INDEX idx_organiser_apps_status ON public.organiser_applications(status, created_at);
-- Index for user's own applications
CREATE INDEX idx_organiser_apps_user ON public.organiser_applications(user_id, created_at DESC);

-- Constraint: Only one pending application per user at a time
CREATE UNIQUE INDEX idx_one_pending_per_user
  ON public.organiser_applications(user_id)
  WHERE status = 'pending';

-- Auto-update updated_at timestamp
-- Note: update_updated_at_column() should exist since it's standard, but if it doesn't we define it:
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organiser_applications_updated_at
  BEFORE UPDATE ON public.organiser_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.organiser_applications ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own applications
CREATE POLICY "Users view own applications" 
ON public.organiser_applications FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Users can insert their own applications
CREATE POLICY "Users insert own applications" 
ON public.organiser_applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Users can withdraw ONLY their own pending applications
CREATE POLICY "Users withdraw own pending applications" 
ON public.organiser_applications FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'withdrawn');

-- 4. Admins have full access
CREATE POLICY "Admins full access" 
ON public.organiser_applications FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
