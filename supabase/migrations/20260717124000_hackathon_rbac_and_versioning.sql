-- Migration: hackathon_rbac_and_versioning
-- Version: 20260717124000
-- Description: Establishes organizations, roles, rate confirmations, permissions catalog helpers,
--              bootstrapping triggers, and compliance blocking triggers.

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('broker', 'carrier')),
  created_at  timestamptz DEFAULT now()
);

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  permissions text[] NOT NULL, -- catalog permissions bundle
  created_at  timestamptz DEFAULT now(),
  UNIQUE(org_id, name)
);

-- 3. Modify Profiles Table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_org_admin boolean DEFAULT false;

-- 4. Modify Loads Table
ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS broker_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS carrier_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compliance_overridden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_overridden_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. Rate Confirmations Versioning Table
CREATE TABLE IF NOT EXISTS public.rate_confirmations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id        uuid REFERENCES public.loads(id) ON DELETE CASCADE,
  version        integer NOT NULL DEFAULT 1,
  base_rate      numeric(10,2) NOT NULL,
  accessorials   jsonb DEFAULT '{}'::jsonb, -- tarping, layover, detention, etc.
  total_rate     numeric(10,2) NOT NULL,
  carrier_sig    text,
  signed_at      timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(load_id, version)
);

-- 6. Permission Helper Function
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_permissions text[];
BEGIN
  SELECT p.is_org_admin, r.permissions INTO v_is_admin, v_permissions
  FROM public.profiles p
  LEFT JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = p_user_id;

  IF v_is_admin = true THEN
    RETURN true;
  END IF;

  RETURN p_permission = ANY(v_permissions);
END;
$$;

-- 7. Update new user trigger to bootstrap admin vs staff
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role_id uuid;
  v_role text;
  v_is_org_admin boolean := false;
  v_company_name text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'shipper');
  
  -- Parse parameter IDs if invited staff
  IF NEW.raw_user_meta_data->>'org_id' IS NOT NULL THEN
    v_org_id := (NEW.raw_user_meta_data->>'org_id')::uuid;
  END IF;
  IF NEW.raw_user_meta_data->>'role_id' IS NOT NULL THEN
    v_role_id := (NEW.raw_user_meta_data->>'role_id')::uuid;
  END IF;
  
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', '');

  -- Bootstrap org if empty for broker/carrier
  IF v_org_id IS NULL AND v_role IN ('broker', 'carrier') THEN
    INSERT INTO public.organizations (name, type)
    VALUES (COALESCE(v_company_name, 'New Organization'), v_role)
    RETURNING id INTO v_org_id;
    
    v_is_org_admin := true;
    v_company_name := COALESCE(v_company_name, 'New Organization');
  ELSIF v_org_id IS NOT NULL THEN
    -- Get parent company name for staff profile
    SELECT name INTO v_company_name FROM public.organizations WHERE id = v_org_id;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, company_name, role, org_id, role_id, is_org_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_company_name,
    v_role,
    v_org_id,
    v_role_id,
    v_is_org_admin
  );

  -- Auto-seed carrier compliance on carrier admin bootstrapping
  IF v_role = 'carrier' AND v_is_org_admin = true THEN
    INSERT INTO public.carrier_compliance (carrier_id, company_name, mc_number, dot_number, insurance_status, safety_rating, w9_status, cargo_limit, auto_limit, insurance_expiration)
    VALUES (
      NEW.id,
      v_company_name,
      'MC-' || floor(100000 + random() * 900000)::text,
      'DOT-' || floor(1000000 + random() * 9000000)::text,
      'pending',
      'Satisfactory',
      'pending',
      100000,
      1000000,
      (now() + interval '1 year')::date
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Compliance Blocking Guard Trigger
CREATE OR REPLACE FUNCTION public.validate_load_compliance_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_carrier_id uuid;
  v_insurance_status text;
  v_safety_rating text;
BEGIN
  -- Block status updates past 'assigned' (Carrier Assigned) if carrier's compliance is invalid
  -- Statuses past 'assigned': confirmed, dispatched, in_transit, delivered, completed, closed.
  IF NEW.status NOT IN ('posted', 'assigned', 'cancelled') 
     AND OLD.status IN ('posted', 'assigned') 
     AND NEW.carrier_id IS NOT NULL 
  THEN
    SELECT insurance_status, safety_rating 
    INTO v_insurance_status, v_safety_rating
    FROM public.carrier_compliance
    WHERE carrier_id = NEW.carrier_id;

    IF (v_insurance_status <> 'compliant' OR v_safety_rating = 'Unsatisfactory') 
       AND NEW.compliance_overridden = false 
    THEN
      RAISE EXCEPTION 'Carrier compliance check failed. Insurance is % and safety rating is %. Progress past Carrier Assigned is blocked.', 
                      COALESCE(v_insurance_status, 'missing'), 
                      COALESCE(v_safety_rating, 'missing');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_load_compliance_transition ON public.loads;
CREATE TRIGGER check_load_compliance_transition
  BEFORE UPDATE OF status ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.validate_load_compliance_transition();
