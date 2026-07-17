-- Migration: create_accept_bid_rpc
-- Version: 20260717121600
-- Description: Creates the accept_carrier_bid stored procedure to atomically
--              accept a bid and reject all other bids for a given load,
--              while assigning the carrier, rate, and broker margin.

CREATE OR REPLACE FUNCTION public.accept_carrier_bid(p_bid_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to bypass RLS restrictions on update
AS $$
DECLARE
  v_load_id uuid;
  v_carrier_id uuid;
  v_amount numeric(10,2);
  v_shipper_price numeric(10,2);
BEGIN
  -- 1. Get bid details
  SELECT load_id, carrier_id, amount INTO v_load_id, v_carrier_id, v_amount
  FROM public.bids WHERE id = p_bid_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid with ID % not found', p_bid_id;
  END IF;

  -- 2. Get load details
  SELECT shipper_price INTO v_shipper_price FROM public.loads WHERE id = v_load_id;

  -- 3. Accept the chosen bid
  UPDATE public.bids SET status = 'accepted' WHERE id = p_bid_id;

  -- 4. Reject other bids for this load
  UPDATE public.bids SET status = 'rejected' WHERE load_id = v_load_id AND id <> p_bid_id;

  -- 5. Update load details (assign carrier, carrier rate, margin, and change status to booked)
  UPDATE public.loads
  SET carrier_id = v_carrier_id,
      carrier_rate = v_amount,
      broker_margin = v_shipper_price - v_amount,
      status = 'booked'
  WHERE id = v_load_id;
END;
$$;

COMMENT ON FUNCTION public.accept_carrier_bid IS 'Atomically accepts a carrier bid, rejects all other bids for the load, and updates the load state to booked.';
