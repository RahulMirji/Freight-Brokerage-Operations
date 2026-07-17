-- Migration: fix_broker_loads_bids_rls
-- Version: 20260717135500
-- Description: Broker couldn't see loads or bids where broker_org_id = NULL
--              (e.g. loads posted directly by shippers without going through the broker).
--              Fix: Add role-based fallback so brokers always see all loads and bids.

-- Loads: brokers can see all loads (they manage the whole platform)
DROP POLICY IF EXISTS "loads_select_scoped" ON public.loads;
CREATE POLICY "loads_select_scoped" ON public.loads
  FOR SELECT
  USING (
    auth.uid() = shipper_id
    OR broker_org_id = public.get_user_org_id(auth.uid())
    OR carrier_org_id = public.get_user_org_id(auth.uid())
    OR public.get_user_role(auth.uid()) = 'broker'
  );

-- Bids: brokers can see all bids (they need to review and accept them)
DROP POLICY IF EXISTS "bids_select_scoped" ON public.bids;
CREATE POLICY "bids_select_scoped" ON public.bids
  FOR SELECT
  USING (
    carrier_id = auth.uid()
    OR public.get_user_role(auth.uid()) = 'broker'
  );
