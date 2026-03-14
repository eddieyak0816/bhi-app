-- Migration: 20260313_create_lab_pdf_uploads.sql
-- Creates the lab_pdf_uploads table for PDF duplicate detection.
-- Stores SHA-256 file hash, accession number, and collection date per user.
-- Run in Supabase Dashboard → SQL Editor.

create table if not exists lab_pdf_uploads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_hash     text not null,           -- SHA-256 hex of the raw PDF bytes
  accession_num text,                    -- Lab accession number extracted by AI (e.g. LW-2026031300482)
  collection_date date,                  -- Specimen collection date extracted by AI
  filename      text,                    -- Original filename (for display only)
  uploaded_at   timestamptz not null default now()
);

-- Index for fast duplicate lookups
create index if not exists lab_pdf_uploads_user_hash    on lab_pdf_uploads(user_id, file_hash);
create index if not exists lab_pdf_uploads_user_accnum  on lab_pdf_uploads(user_id, accession_num);

-- RLS: users can only see and insert their own rows
alter table lab_pdf_uploads enable row level security;

create policy "Users can view their own pdf uploads"
  on lab_pdf_uploads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pdf uploads"
  on lab_pdf_uploads for insert
  with check (auth.uid() = user_id);
