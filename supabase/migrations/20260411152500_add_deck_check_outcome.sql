ALTER TABLE deck_checks ADD COLUMN outcome TEXT NOT NULL DEFAULT 'Passed';
ALTER TABLE deck_checks ADD CONSTRAINT chk_outcome CHECK (outcome IN ('Passed', 'Failed'));
