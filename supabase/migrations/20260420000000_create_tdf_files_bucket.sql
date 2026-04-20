-- Create a private storage bucket for original TDF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tdf-files', 'tdf-files', false, 1048576, ARRAY['text/xml', 'application/xml', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow authenticated users to upload TDF files
CREATE POLICY "Authenticated users can upload TDF files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tdf-files');

-- RLS: Allow authenticated users to read TDF files
CREATE POLICY "Authenticated users can read TDF files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tdf-files');

-- RLS: Allow authenticated users to update/overwrite TDF files
CREATE POLICY "Authenticated users can update TDF files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tdf-files');
