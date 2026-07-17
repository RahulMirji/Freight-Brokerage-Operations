-- Migration: create_loads_table
-- Version: 20260716142300
-- Description: Core freight load entity. Created by shippers, managed by brokers,
--              executed by carriers. Includes the three-way financial split,
--              load lifecycle status, digital signature fields, and RLS policies.

-- ─── Shared utility function (reused across tables) ──────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── Sequence for generating display IDs (L-9100, L-9101, ...) ───────────────

CREATE SEQUENCE public.load_display_id_seq START WITH 9100;

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.loads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id        text UNIQUE NOT NULL DEFAULT ('L-' || nextval('public.load_display_id_seq')::text),
  shipper_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  carrier_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  origin_city       text NOT NULL,
  origin_state      text NOT NULL,
  destination_city  text NOT NULL,
  destination_state text NOT NULL,
  pickup_date       date NOT NULL,
  delivery_date     date NOT NULL,
  weight_lbs        integer NOT NULL CHECK (weight_lbs > 0),
  equipment_type    text NOT NULL CHECK (equipment_type IN ('Reefer', 'Flatbed', 'Dry Van', 'Power Only')),
  description       text,

  -- Three-way financial split: shipper pays, carrier earns, broker keeps the margin
  shipper_price     numeric(10,2) NOT NULL CHECK (shipper_price > 0),
  carrier_rate      numeric(10,2) CHECK (carrier_rate > 0),
  broker_margin     numeric(10,2),                  -- set automatically = shipper_price - carrier_rate

  -- Load lifecycle
  status            text NOT NULL DEFAULT 'posted'
                    CHECK (status IN ('posted', 'booked', 'in_transit', 'delivered', 'completed', 'cancelled')),

  -- Digital rate confirmation signature (set by carrier on Carrier Fleet page)
  carrier_signature text,
  signed_at         timestamptz,

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

COMMENT ON TABLE  public.loads              IS 'Core freight load records. Created by shippers, managed by brokers, executed by carriers.';
COMMENT ON COLUMN public.loads.display_id   IS 'Human-readable load ID shown in UI and contracts (e.g. L-9081).';
COMMENT ON COLUMN public.loads.broker_margin IS 'shipper_price - carrier_rate. Calculated when broker accepts a carrier bid.';
COMMENT ON COLUMN public.loads.carrier_signature IS 'Full name of the carrier signatory on the rate confirmation contract.';



-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────

CREATE TRIGGER loads_set_updated_at
  BEFORE UPDATE ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

-- Shippers see their own loads; brokers see all
CREATE POLICY "loads_select_shipper_and_broker"
  ON public.loads FOR SELECT
  USING (
    auth.uid() = shipper_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );

-- Carriers see posted loads (for bidding) OR loads assigned to them (for dispatch)
CREATE POLICY "loads_select_carrier"
  ON public.loads FOR SELECT
  USING (
    status = 'posted'
    OR auth.uid() = carrier_id
  );

-- Only shippers can create loads (INSERT requires shipper_id = their own uid)
CREATE POLICY "loads_insert_shipper"
  ON public.loads FOR INSERT
  WITH CHECK (
    auth.uid() = shipper_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'shipper'
    )
  );

-- Shippers can cancel own loads; carriers update status/signature; brokers update rates
CREATE POLICY "loads_update"
  ON public.loads FOR UPDATE
  USING (
    auth.uid() = shipper_id
    OR auth.uid() = carrier_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );
