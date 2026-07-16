-- Migration: create_audit_logs_table
-- Version: 20260716142406
-- Description: Immutable system event log. Written exclusively by database triggers
--              (never by the client). Only brokers can read. Captures every significant
--              lifecycle event: load creation, bid submission/acceptance/rejection,
--              digital contract signing, and dispatch status transitions.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- null for system events
  actor_role  text,           -- 'broker' | 'carrier' | 'shipper' | 'system'
  action      text NOT NULL,  -- see comment below for valid action types
  entity_type text NOT NULL,  -- 'load' | 'bid' | 'compliance'
  entity_id   uuid,           -- the UUID of the affected row
  payload     jsonb,          -- full JSON snapshot of changed data
  created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE  public.audit_logs         IS 'Immutable system event log. Written only by DB triggers. Clients may read (brokers only) but never write.';
COMMENT ON COLUMN public.audit_logs.action  IS 'Event type vocabulary: LOAD_CREATION, LOAD_BOOKED, LOAD_COMPLETED, LOAD_CANCELLED, BID_SUBMISSION, BID_ACCEPTED, BID_REJECTED, CONTRACT_SIGNED, DISPATCH_START, DISPATCH_DELIVERY';
COMMENT ON COLUMN public.audit_logs.payload IS 'Full JSON snapshot of the changed data (old + new values where applicable). Displayed in Broker Audit Logs inspector panel.';

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only brokers can read audit logs
CREATE POLICY "audit_logs_select_broker"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );

-- No INSERT policy = client inserts are blocked for all roles.
-- All inserts come from the triggers below.

-- ─── Trigger: log load creation and status changes ────────────────────────────

CREATE OR REPLACE FUNCTION public.log_load_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor_role text;
  v_action     text;
BEGIN
  SELECT role INTO v_actor_role FROM public.profiles WHERE id = auth.uid();

  -- INSERT: new load created by shipper
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      v_actor_role,
      'LOAD_CREATION',
      'load',
      NEW.id,
      jsonb_build_object(
        'display_id',    NEW.display_id,
        'shipper_price', NEW.shipper_price,
        'origin',        NEW.origin_city || ', ' || NEW.origin_state,
        'destination',   NEW.destination_city || ', ' || NEW.destination_state,
        'equipment_type', NEW.equipment_type,
        'weight_lbs',    NEW.weight_lbs,
        'status',        NEW.status
      )
    );

  -- UPDATE: status changed
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := CASE NEW.status
      WHEN 'booked'     THEN 'LOAD_BOOKED'
      WHEN 'in_transit' THEN 'DISPATCH_START'
      WHEN 'delivered'  THEN 'DISPATCH_DELIVERY'
      WHEN 'completed'  THEN 'LOAD_COMPLETED'
      WHEN 'cancelled'  THEN 'LOAD_CANCELLED'
      ELSE 'STATUS_CHANGE'
    END;

    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      v_actor_role,
      v_action,
      'load',
      NEW.id,
      jsonb_build_object(
        'display_id',  NEW.display_id,
        'old_status',  OLD.status,
        'new_status',  NEW.status,
        'carrier_id',  NEW.carrier_id,
        'carrier_rate', NEW.carrier_rate,
        'broker_margin', NEW.broker_margin
      )
    );

  -- UPDATE: digital rate confirmation signed
  ELSIF TG_OP = 'UPDATE'
    AND OLD.carrier_signature IS NULL
    AND NEW.carrier_signature IS NOT NULL
  THEN
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'carrier',
      'CONTRACT_SIGNED',
      'load',
      NEW.id,
      jsonb_build_object(
        'display_id',  NEW.display_id,
        'signatory',   NEW.carrier_signature,
        'signed_at',   NEW.signed_at,
        'carrier_rate', NEW.carrier_rate
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER loads_audit
  AFTER INSERT OR UPDATE ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.log_load_status_change();

-- ─── Trigger: log bid submission, acceptance, and rejection ──────────────────

CREATE OR REPLACE FUNCTION public.log_bid_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_action text;
BEGIN
  -- INSERT: carrier submitted a new bid
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'carrier',
      'BID_SUBMISSION',
      'bid',
      NEW.id,
      jsonb_build_object(
        'load_id',    NEW.load_id,
        'carrier_id', NEW.carrier_id,
        'amount',     NEW.amount,
        'note',       NEW.note
      )
    );

  -- UPDATE: broker accepted or rejected the bid
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := CASE NEW.status
      WHEN 'accepted' THEN 'BID_ACCEPTED'
      WHEN 'rejected' THEN 'BID_REJECTED'
      ELSE 'BID_STATUS_CHANGE'
    END;

    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, payload)
    VALUES (
      auth.uid(),
      'broker',
      v_action,
      'bid',
      NEW.id,
      jsonb_build_object(
        'load_id',    NEW.load_id,
        'carrier_id', NEW.carrier_id,
        'amount',     NEW.amount,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bids_audit
  AFTER INSERT OR UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.log_bid_status_change();
