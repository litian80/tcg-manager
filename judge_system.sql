-- Create player_penalties table
CREATE TABLE IF NOT EXISTS player_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL, -- keeping as text to support both UUIDs and potentially other IDs
  judge_user_id UUID NOT NULL REFERENCES auth.users(id),
  round_number INTEGER NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  penalty TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create deck_checks table
CREATE TABLE IF NOT EXISTS deck_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL, -- keeping as text
  judge_user_id UUID NOT NULL REFERENCES auth.users(id),
  round_number INTEGER NOT NULL,
  check_time TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

-- Enable RLS
ALTER TABLE player_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_checks ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON player_penalties TO authenticated;
GRANT ALL ON deck_checks TO authenticated;

-- Policies for player_penalties

-- Judges and Organizers can view penalties for their tournaments
CREATE POLICY "Judges and Organizers can view penalties"
  ON player_penalties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_judges tj
      WHERE tj.tournament_id = player_penalties.tournament_id
      AND tj.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = player_penalties.tournament_id
      AND t.organizer_id = auth.uid()
    )
  );

-- Judges and Organizers can insert penalties
CREATE POLICY "Judges and Organizers can insert penalties"
  ON player_penalties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_judges tj
      WHERE tj.tournament_id = player_penalties.tournament_id
      AND tj.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = player_penalties.tournament_id
      AND t.organizer_id = auth.uid()
    )
  );

-- Policies for deck_checks

-- Judges and Organizers can view deck checks
CREATE POLICY "Judges and Organizers can view deck checks"
  ON deck_checks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournament_judges tj
      WHERE tj.tournament_id = deck_checks.tournament_id
      AND tj.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = deck_checks.tournament_id
      AND t.organizer_id = auth.uid()
    )
  );

-- Judges and Organizers can insert deck checks
CREATE POLICY "Judges and Organizers can insert deck checks"
  ON deck_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_judges tj
      WHERE tj.tournament_id = deck_checks.tournament_id
      AND tj.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = deck_checks.tournament_id
      AND t.organizer_id = auth.uid()
    )
  );
