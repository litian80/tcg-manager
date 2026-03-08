-- 20250308000000_judge_self_select.sql
-- Allow judges to view their own assignments so they can authorize actions

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tournament_judges' 
        AND policyname = 'Judges can view their own assignment'
    ) THEN
        CREATE POLICY "Judges can view their own assignment"
        ON tournament_judges
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END
$$;
