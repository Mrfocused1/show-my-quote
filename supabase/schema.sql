-- Show My Quote — Supabase schema
-- Run this in the Supabase SQL editor (project: show-my-quote, region: Europe West)

-- ─────────────────────────────────────────────────────────────────────────────
-- businesses
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  niche       text,
  created_at  timestamptz not null default now()
);

alter table businesses enable row level security;

-- Service-role key bypasses RLS automatically; no policies needed for now.

-- ─────────────────────────────────────────────────────────────────────────────
-- contacts
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references businesses(id) on delete cascade,
  name         text,
  phone        text,
  email        text,
  event_type   text,
  created_at   timestamptz not null default now()
);

alter table contacts enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- calls
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists calls (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references businesses(id) on delete set null,
  contact_id   uuid references contacts(id) on delete set null,
  call_sid     text unique,        -- SignalWire CallSid
  session      text,               -- short session code used for Pusher channel
  direction    text default 'inbound' check (direction in ('inbound','outbound')),
  from_number  text,
  transcript   jsonb,              -- array of { speaker, text } objects
  duration     integer,            -- seconds
  status       text default 'completed',
  created_at   timestamptz not null default now()
);

alter table calls enable row level security;

create index if not exists calls_business_id_idx on calls(business_id);
create index if not exists calls_session_idx     on calls(session);

-- ─────────────────────────────────────────────────────────────────────────────
-- quotes
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists quotes (
  id            uuid primary key default gen_random_uuid(),
  call_id       uuid references calls(id) on delete set null,
  business_id   uuid references businesses(id) on delete set null,
  contact_id    uuid references contacts(id) on delete set null,
  fields        jsonb,             -- field definitions array
  field_values  jsonb,             -- { fieldKey: value } map
  status        text default 'draft' check (status in ('draft','sent','won','lost')),
  created_at    timestamptz not null default now()
);

alter table quotes enable row level security;

create index if not exists quotes_call_id_idx     on quotes(call_id);
create index if not exists quotes_business_id_idx on quotes(business_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- sms_messages
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists sms_messages (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references businesses(id) on delete set null,
  direction    text not null check (direction in ('inbound','outbound')),
  to_number    text,
  from_number  text,
  body         text,
  sid          text,               -- SignalWire message SID
  created_at   timestamptz not null default now()
);

alter table sms_messages enable row level security;

create index if not exists sms_business_id_idx on sms_messages(business_id);
