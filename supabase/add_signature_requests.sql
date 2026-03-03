-- Run this in your Supabase SQL Editor
-- Creates the signature_requests table for e-signature functionality

CREATE TABLE IF NOT EXISTS signature_requests (
  id              bigserial PRIMARY KEY,
  token           uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  call_id         bigint REFERENCES calls(id) ON DELETE SET NULL,
  client_name     text,
  client_email    text,
  document_title  text NOT NULL,
  document_data   jsonb DEFAULT '{}',
  signature_data  text,           -- base64 PNG of the drawn signature
  signer_name     text,
  signer_ip       text,
  signed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS: service role can read/write, no public select (sign-get/submit use service role key)
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API uses service role key)
CREATE POLICY "service_role_all" ON signature_requests
  FOR ALL USING (true) WITH CHECK (true);
