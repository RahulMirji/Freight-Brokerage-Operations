-- Migration: fix_rls_recursion_v2
-- Version: 20260717130000
-- Description: Drop ALL legacy policies that do direct inline joins to profiles
--              (which caused infinite recursion because profiles_select_scoped
--               calls get_user_org_id/get_user_role, and those inline subqueries
--               triggered profiles_select_scoped again).
--              Replace all such policies with SECURITY DEFINER helper calls.
--              Also adds RLS policies for the rate_confirmations table.

-- Drop ALL legacy policies that do direct joins into profiles (causing recursion)
DROP POLICY IF EXISTS "audit_logs_select_broker" ON public.audit_logs;
DROP POLICY IF EXISTS "compliance_select_broker" ON public.carrier_compliance;
DROP POLICY IF EXISTS "compliance_select_carrier" ON public.carrier_compliance;
DROP POLICY IF EXISTS "compliance_update_broker" ON public.carrier_compliance;
DROP POLICY IF EXISTS "compliance_update_carrier" ON public.carrier_compliance;
DROP POLICY IF EXISTS "loads_select_shipper" ON public.loads;
DROP POLICY IF EXISTS "loads_update" ON public.loads;

-- Re-create helper functions with SET search_path = public for security
CREATE OR REPLACE FUNCTION public.get_user_org_id(p_user_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = p_user_id;
  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  RETURN v_role;
END;
$$;

-- Re-create audit_logs select policy using SECURITY DEFINER helper (no direct join to profiles)
CREATE POLICY "audit_logs_select_broker" ON public.audit_logs
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'broker');

-- Ensure rate_confirmations has RLS
ALTER TABLE public.rate_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_confirmations_select" ON public.rate_confirmations;
DROP POLICY IF EXISTS "rate_confirmations_insert" ON public.rate_confirmations;
DROP POLICY IF EXISTS "rate_confirmations_update" ON public.rate_confirmations;

-- rate_confirmations policies (carrier access via loads join, broker by role)
CREATE POLICY "rate_confirmations_select" ON public.rate_confirmations
  FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'broker'
    OR EXISTS (
      SELECT 1 FROM public.loads l
      WHERE l.id = rate_confirmations.load_id
        AND (l.carrier_id = auth.uid() OR l.shipper_id = auth.uid())
    )
  );

CREATE POLICY "rate_confirmations_insert" ON public.rate_confirmations
  FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'broker');

CREATE POLICY "rate_confirmations_update" ON public.rate_confirmations
  FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) = 'broker'
    OR EXISTS (
      SELECT 1 FROM public.loads l
      WHERE l.id = rate_confirmations.load_id
        AND l.carrier_id = auth.uid()
    )
  );
