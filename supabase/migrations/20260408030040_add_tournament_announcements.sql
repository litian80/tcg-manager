-- Add active_announcement_id to tournaments table
ALTER TABLE tournaments ADD COLUMN active_announcement_id UUID;

-- Create tournament_announcements table
CREATE TABLE IF NOT EXISTS tournament_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    banner_text VARCHAR(200) NOT NULL,
    details_text TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    target_audience TEXT[] DEFAULT ARRAY['all'],
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_target_audience CHECK (
      target_audience <@ ARRAY['all', 'participants', 'spectators', 'organizers', 'staff']::text[]
    )
);

-- Foreign key linking tournaments back to their active announcement
-- (To be added after table creation to avoid circular dependency)
ALTER TABLE tournaments 
  ADD CONSTRAINT fk_active_announcement 
  FOREIGN KEY (active_announcement_id) 
  REFERENCES tournament_announcements(id) 
  ON DELETE SET NULL;

-- Create composite index for efficient queries on active announcements
CREATE INDEX idx_tournament_announcements_active 
  ON tournament_announcements(tournament_id, is_active) 
  WHERE is_active = true;

-- Index for quickly grabbing all announcements for a tournament
CREATE INDEX idx_tournament_announcements_tournament 
  ON tournament_announcements(tournament_id);

-- Index for sorting by created_at (useful for the organizer dashboard history)
CREATE INDEX idx_tournament_announcements_created 
  ON tournament_announcements(created_at DESC);

-- Enable RLS
ALTER TABLE tournament_announcements ENABLE ROW LEVEL SECURITY;

-- 1. Only active announcements are publicly visible
CREATE POLICY "Public can view active announcements" ON tournament_announcements
  FOR SELECT USING (is_active = true);

-- 2. Only organizers or admins can insert/update/delete/select all
CREATE POLICY "Organizer can manage announcements" ON tournament_announcements
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = tournament_announcements.tournament_id
      AND (t.organizer_popid = p.pokemon_player_id OR p.role = 'admin')
    )
  );

-- Database function for atomic activation
CREATE OR REPLACE FUNCTION set_tournament_announcement_active(
  p_announcement_id UUID,
  p_tournament_id UUID
) RETURNS void AS $$
DECLARE
  v_check_tournament UUID;
BEGIN
  -- Advisory lock to prevent race conditions (locking the tournament)
  PERFORM pg_advisory_xact_lock(hashtext('tournament_' || p_tournament_id));
  
  -- Verify announcement belongs to tournament
  SELECT tournament_id INTO v_check_tournament
  FROM tournament_announcements
  WHERE id = p_announcement_id;
  
  IF v_check_tournament IS NULL THEN
    RAISE EXCEPTION 'Announcement not found';
  END IF;
  
  IF v_check_tournament != p_tournament_id THEN
    RAISE EXCEPTION 'Announcement does not belong to specified tournament';
  END IF;

  -- Deactivate all old active announcements for this tournament
  UPDATE tournament_announcements
  SET is_active = false
  WHERE tournament_id = p_tournament_id 
    AND is_active = true
    AND id != p_announcement_id;

  -- Set new announcement to active
  UPDATE tournament_announcements
  SET is_active = true
  WHERE id = p_announcement_id;

  -- Update pointer on tournaments table
  UPDATE tournaments
  SET active_announcement_id = p_announcement_id
  WHERE id = p_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to completely deactivate announcements
CREATE OR REPLACE FUNCTION set_tournament_announcement_inactive(
  p_tournament_id UUID
) RETURNS void AS $$
BEGIN
  -- Advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('tournament_' || p_tournament_id));
  
  -- Deactivate all active announcements for this tournament
  UPDATE tournament_announcements
  SET is_active = false
  WHERE tournament_id = p_tournament_id 
    AND is_active = true;

  -- Remove pointer on tournaments table
  UPDATE tournaments
  SET active_announcement_id = NULL
  WHERE id = p_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
