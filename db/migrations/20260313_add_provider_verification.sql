-- Migration: add provider verification fields to user_lab_results
-- Supports: self-entered, provider-verified, and PDF-extracted results.
-- verifier_signature stores a freeform attestation string (typed full name).

alter table user_lab_results
  add column if not exists verification_type text not null default 'self'
    check (verification_type in ('self', 'provider', 'pdf')),
  add column if not exists verifier_name text,
  add column if not exists verifier_credential text,
  add column if not exists verifier_npi text,
  add column if not exists verifier_signature text,
  add column if not exists verified_at date;

comment on column user_lab_results.verification_type is
  'self = user entered, provider = clinician/nurse attested, pdf = AI-extracted from lab PDF';
comment on column user_lab_results.verifier_npi is
  'National Provider Identifier (10-digit NPI) of the attesting clinician';
comment on column user_lab_results.verifier_signature is
  'Typed full-name attestation by the verifying provider';
