-- Migration: carrier_pod_update_policy
-- Version: 20260717134000
-- Description: The loads_update_scoped policy only allows carriers to update loads
--              via carrier_org_id match, but carriers updating pod_url need to be
--              allowed directly by carrier_id (some carriers have no org_id yet).
--              Adds a dedicated policy so carriers can always update their own loads.

DROP POLICY IF EXISTS "loads_update_pod_carrier" ON public.loads;

CREATE POLICY "loads_update_pod_carrier" ON public.loads
  FOR UPDATE
  USING (carrier_id = auth.uid());
