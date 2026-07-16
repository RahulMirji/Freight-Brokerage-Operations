-- Migration: create_bids_table
-- Version: 20260716142317
-- Description: Carrier bids on posted loads. Only one bid per carrier per load
--              (UNIQUE constraint). Brokers accept or reject bids via UPDATE.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.bids (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id      uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  carrier_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'rejected')),
  note         text,                    -- optional carrier message visible to broker
  submitted_at timestamptz DEFAULT now(),

  -- Prevent duplicate bids: one carrier can bid only once per load
  UNIQUE(load_id, carrier_id)
);

COMMENT ON TABLE  public.bids       IS 'Carrier bids on individual loads. Only one bid per carrier per load.';
COMMENT ON COLUMN public.bids.note  IS 'Optional carrier message included with the bid, visible to brokers.';
COMMENT ON COLUMN public.bids.status IS 'Pending until broker accepts or rejects. Only one bid per load can be accepted.';

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Carriers see only their own bids
CREATE POLICY "bids_select_carrier"
  ON public.bids FOR SELECT
  USING (auth.uid() = carrier_id);

-- Brokers see all bids (needed for the Loads & Bids management page)
CREATE POLICY "bids_select_broker"
  ON public.bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );

-- Only carriers can submit bids, and only on loads with status = 'posted'
CREATE POLICY "bids_insert_carrier"
  ON public.bids FOR INSERT
  WITH CHECK (
    auth.uid() = carrier_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'carrier'
    )
    AND EXISTS (
      SELECT 1 FROM public.loads l WHERE l.id = load_id AND l.status = 'posted'
    )
  );

-- Only brokers can update bid status (accept / reject)
CREATE POLICY "bids_update_broker"
  ON public.bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );
