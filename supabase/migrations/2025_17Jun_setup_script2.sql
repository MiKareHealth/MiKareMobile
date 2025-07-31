-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;
