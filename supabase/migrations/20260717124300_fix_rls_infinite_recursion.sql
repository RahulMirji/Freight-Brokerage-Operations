-- Migration: fix_rls_infinite_recursion
-- Version: 20260717124300
-- Description: Creates security definer functions to get user org/role and replaces
--              recursive RLS policies with clean, high-performance policies.

-- 1. Helper Functions (marked SECURITY DEFINER to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_org_id(p_user_id uuid)
RETURNS uuid SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$;

-- 2. Drop existing scoped policies that cause recursion
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_scoped" ON public.profiles;
DROP POLICY IF EXISTS "loads_select_scoped" ON public.loads;
DROP POLICY IF EXISTS "loads_insert_scoped" ON public.loads;
DROP POLICY IF EXISTS "loads_update_scoped" ON public.loads;
DROP POLICY IF EXISTS "loads_delete_scoped" ON public.loads;
DROP POLICY IF EXISTS "bids_select_scoped" ON public.bids;
DROP POLICY IF EXISTS "bids_insert_scoped" ON public.bids;
DROP POLICY IF EXISTS "bids_update_scoped" ON public.bids;
DROP POLICY IF EXISTS "carrier_compliance_select_scoped" ON public.carrier_compliance;
DROP POLICY IF EXISTS "carrier_compliance_update_scoped" ON public.carrier_compliance;

-- 3. Re-create Profiles Scoped Policies
CREATE POLICY "profiles_select_scoped" ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR org_id = public.get_user_org_id(auth.uid())
  OR public.get_user_role(auth.uid()) = 'broker'
);

CREATE POLICY "profiles_update_scoped" ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 4. Re-create Loads Scoped Policies
CREATE POLICY "loads_select_scoped" ON public.loads FOR SELECT
USING (
  auth.uid() = shipper_id
  OR broker_org_id = public.get_user_org_id(auth.uid())
  OR carrier_org_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "loads_insert_scoped" ON public.loads FOR INSERT
WITH CHECK (
  (auth.uid() = shipper_id AND public.get_user_role(auth.uid()) = 'shipper')
  OR (broker_org_id = public.get_user_org_id(auth.uid()) AND public.has_permission(auth.uid(), 'load.create'))
);

CREATE POLICY "loads_update_scoped" ON public.loads FOR UPDATE
USING (
  broker_org_id = public.get_user_org_id(auth.uid())
  OR carrier_org_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "loads_delete_scoped" ON public.loads FOR DELETE
USING (
  broker_org_id = public.get_user_org_id(auth.uid())
);

-- 5. Re-create Bids Scoped Policies
CREATE POLICY "bids_select_scoped" ON public.bids FOR SELECT
USING (
  carrier_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.loads l 
    WHERE l.id = load_id 
    AND l.broker_org_id = public.get_user_org_id(auth.uid())
  )
);

CREATE POLICY "bids_insert_scoped" ON public.bids FOR INSERT
WITH CHECK (
  carrier_id = auth.uid() AND public.get_user_role(auth.uid()) = 'carrier'
);

CREATE POLICY "bids_update_scoped" ON public.bids FOR UPDATE
USING (
  carrier_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.loads l 
    WHERE l.id = load_id 
    AND l.broker_org_id = public.get_user_org_id(auth.uid())
  )
);

-- 6. Re-create Carrier Compliance Scoped Policies
CREATE POLICY "carrier_compliance_select_scoped" ON public.carrier_compliance FOR SELECT
USING (
  carrier_id = auth.uid()
  OR public.get_user_role(auth.uid()) = 'broker'
);

CREATE POLICY "carrier_compliance_update_scoped" ON public.carrier_compliance FOR UPDATE
USING (
  carrier_id = auth.uid()
  OR public.get_user_role(auth.uid()) = 'broker'
);
