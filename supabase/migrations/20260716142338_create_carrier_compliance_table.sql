-- Migration: create_carrier_compliance_table
-- Version: 20260716142338
-- Description: One compliance record per carrier profile, storing DOT/MC numbers,
--              insurance limits, W9 status, and safety rating.
--              Auto-created by trigger when a carrier profile is inserted.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.carrier_compliance (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id           uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mc_number            text,
  dot_number           text,
  insurance_status     text NOT NULL DEFAULT 'pending'
                       CHECK (insurance_status IN ('compliant', 'non_compliant', 'pending')),
  insurance_expiration date,
  cargo_limit          numeric(12,2) CHECK (cargo_limit >= 0),   -- cargo coverage in USD
  auto_limit           numeric(12,2) CHECK (auto_limit >= 0),    -- auto liability in USD (min $1M required)
  w9_status            text NOT NULL DEFAULT 'pending_review'
                       CHECK (w9_status IN ('verified', 'missing', 'pending_review')),
  safety_rating        text CHECK (safety_rating IN ('Satisfactory', 'Conditional', 'Unsatisfactory')),
  updated_at           timestamptz DEFAULT now()
);

COMMENT ON TABLE  public.carrier_compliance                IS 'DOT/MC/insurance/W9 compliance record per carrier. One row per carrier profile. Auto-created on carrier signup.';
COMMENT ON COLUMN public.carrier_compliance.cargo_limit    IS 'Cargo insurance coverage limit in USD.';
COMMENT ON COLUMN public.carrier_compliance.auto_limit     IS 'Auto liability coverage limit in USD. Minimum $1,000,000 required to haul loads.';
COMMENT ON COLUMN public.carrier_compliance.carrier_id     IS 'FK to profiles. UNIQUE ensures one compliance record per carrier.';

-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────

CREATE TRIGGER compliance_set_updated_at
  BEFORE UPDATE ON public.carrier_compliance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Trigger: auto-create compliance row when a carrier profile is created ───

CREATE OR REPLACE FUNCTION public.handle_new_carrier_compliance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only creates a compliance row for users with role = 'carrier'
  IF NEW.role = 'carrier' THEN
    INSERT INTO public.carrier_compliance (carrier_id)
    VALUES (NEW.id)
    ON CONFLICT (carrier_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_carrier_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_carrier_compliance();

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.carrier_compliance ENABLE ROW LEVEL SECURITY;

-- Carriers see and edit their own compliance record
CREATE POLICY "compliance_select_carrier"
  ON public.carrier_compliance FOR SELECT
  USING (auth.uid() = carrier_id);

CREATE POLICY "compliance_update_carrier"
  ON public.carrier_compliance FOR UPDATE
  USING (auth.uid() = carrier_id);

-- Brokers can view all compliance records (Broker Compliance page)
CREATE POLICY "compliance_select_broker"
  ON public.carrier_compliance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );

-- Brokers can override insurance_status (e.g. after manual document review)
CREATE POLICY "compliance_update_broker"
  ON public.carrier_compliance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );
