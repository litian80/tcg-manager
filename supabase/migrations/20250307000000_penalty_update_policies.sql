-- Enable UPDATE and DELETE for player_penalties

CREATE POLICY "Judges and Organizers can update penalties"
  ON player_penalties
  FOR UPDATE
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
      AND (
          t.organizer_popid IN (SELECT pokemon_player_id FROM profiles WHERE id = auth.uid())
          OR 
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  )
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
      AND (
          t.organizer_popid IN (SELECT pokemon_player_id FROM profiles WHERE id = auth.uid())
          OR 
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

CREATE POLICY "Judges and Organizers can delete penalties"
  ON player_penalties
  FOR DELETE
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
      AND (
          t.organizer_popid IN (SELECT pokemon_player_id FROM profiles WHERE id = auth.uid())
          OR 
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );
