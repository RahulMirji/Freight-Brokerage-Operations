-- Migration: carrier_posted_loads_select_policy
-- Version: 20260717135000
-- Description: The loads_select_scoped policy only allowed carriers to see loads
--              already assigned to their org (carrier_org_id match). This meant
--              'posted' loads with no carrier assigned were invisible to all carriers,
--              blocking them from discovering and bidding on new shipments.
--              This policy lets any authenticated carrier see all posted loads.

DROP POLICY IF EXISTS "loads_select_posted_carriers" ON public.loads;

CREATE POLICY "loads_select_posted_carriers" ON public.loads
  FOR SELECT
  USING (
    status = 'posted'
    AND public.get_user_role(auth.uid()) = 'carrier'
  );
