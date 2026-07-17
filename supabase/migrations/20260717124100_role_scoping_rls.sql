-- Migration: role_scoping_rls
-- Version: 20260717124100
-- Description: Sets up multi-tenant RLS scoping on profiles, loads, and bids.

-- 1. Profiles RLS Scoping
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_brokers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_scoped" ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR (org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.org_id = org_id
  ))
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
  )
);

CREATE POLICY "profiles_update_scoped" ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 2. Loads RLS Scoping
DROP POLICY IF EXISTS "loads_select_shipper_and_broker" ON public.loads;
DROP POLICY IF EXISTS "loads_select_carrier" ON public.loads;
DROP POLICY IF EXISTS "loads_insert_shipper" ON public.loads;
DROP POLICY IF EXISTS "loads_insert_broker" ON public.loads;
DROP POLICY IF EXISTS "loads_update_broker" ON public.loads;
DROP POLICY IF EXISTS "loads_update_carrier" ON public.loads;
DROP POLICY IF EXISTS "loads_delete_broker" ON public.loads;

CREATE POLICY "loads_select_scoped" ON public.loads FOR SELECT
USING (
  auth.uid() = shipper_id
  OR (broker_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.org_id = broker_org_id
  ))
  OR (carrier_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.org_id = carrier_org_id
  ))
);

CREATE POLICY "loads_insert_scoped" ON public.loads FOR INSERT
WITH CHECK (
  (auth.uid() = shipper_id AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'shipper'
  ))
  OR (broker_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.org_id = broker_org_id AND public.has_permission(auth.uid(), 'load.create')
  ))
);

CREATE POLICY "loads_update_scoped" ON public.loads FOR UPDATE
USING (
  (broker_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.org_id = broker_org_id
  ))
  OR (carrier_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.org_id = carrier_org_id
  ))
);

CREATE POLICY "loads_delete_scoped" ON public.loads FOR DELETE
USING (
  broker_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.org_id = broker_org_id AND p.is_org_admin = true
  )
);

-- 3. Bids RLS Scoping
DROP POLICY IF EXISTS "bids_select_carrier" ON public.bids;
DROP POLICY IF EXISTS "bids_select_broker" ON public.bids;
DROP POLICY IF EXISTS "bids_insert_carrier" ON public.bids;
DROP POLICY IF EXISTS "bids_update_broker" ON public.bids;

CREATE POLICY "bids_select_scoped" ON public.bids FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = carrier_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
  )
);

CREATE POLICY "bids_insert_scoped" ON public.bids FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.role = 'carrier'
      AND p.id = carrier_id
  )
);

CREATE POLICY "bids_update_scoped" ON public.bids FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
  )
);

-- 4. Carrier Compliance RLS Scoping
DROP POLICY IF EXISTS "carrier_compliance_select_carrier" ON public.carrier_compliance;
DROP POLICY IF EXISTS "carrier_compliance_select_broker" ON public.carrier_compliance;
DROP POLICY IF EXISTS "carrier_compliance_update_carrier" ON public.carrier_compliance;
DROP POLICY IF EXISTS "carrier_compliance_update_broker" ON public.carrier_compliance;

CREATE POLICY "carrier_compliance_select_scoped" ON public.carrier_compliance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = carrier_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
  )
);

CREATE POLICY "carrier_compliance_update_scoped" ON public.carrier_compliance FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = carrier_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
  )
);
