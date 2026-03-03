-- Migration: add is_public consent flag to profiles table
alter table profiles add column if not exists is_public boolean not null default false;
