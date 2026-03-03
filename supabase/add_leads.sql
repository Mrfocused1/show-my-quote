-- Run this in your Supabase SQL Editor
-- Creates the leads table for the Lead Generation CRM

CREATE TABLE IF NOT EXISTS leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   text NOT NULL,
  phone           text,
  email           text,
  website         text,
  address         text,
  city            text,
  state           text DEFAULT 'TX',
  rating          numeric,
  reviews_count   integer DEFAULT 0,
  category        text,
  google_place_id text,
  source          text DEFAULT 'google_maps',
  status          text DEFAULT 'new',
  notes           text,
  ai_research     jsonb,
  contact_id      uuid,
  last_contacted_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON leads
  FOR ALL USING (true) WITH CHECK (true);
