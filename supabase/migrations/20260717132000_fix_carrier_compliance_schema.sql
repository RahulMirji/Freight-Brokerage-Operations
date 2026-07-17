-- Migration: fix_carrier_compliance_schema
-- Version: 20260717132000
-- Description: Adds the missing `company_name` column to `carrier_compliance`.
--              The handle_new_user() trigger tries to insert company_name into
--              carrier_compliance on carrier signup, but the column was never
--              created, causing a 500 Internal Server Error on every carrier
--              signup attempt.

ALTER TABLE public.carrier_compliance
  ADD COLUMN IF NOT EXISTS company_name text;
