-- Migration: fix_handle_new_user_w9_status
-- Version: 20260717132100
-- Description: Fixes the handle_new_user() trigger which was inserting 'pending'
--              for w9_status in carrier_compliance, but the CHECK constraint only
--              allows 'verified', 'missing', or 'pending_review'.
--              Changed w9_status seed value to 'pending_review'.
--              Also uses NULLIF to handle empty company_name gracefully.

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
    VALUES (COALESCE(NULLIF(v_company_name, ''), 'New Organization'), v_role)
    RETURNING id INTO v_org_id;
    
    v_is_org_admin := true;
    v_company_name := COALESCE(NULLIF(v_company_name, ''), 'New Organization');
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

  -- Auto-seed carrier compliance on carrier admin bootstrapping.
  -- Valid w9_status values:     'verified' | 'missing' | 'pending_review'
  -- Valid insurance_status values: 'compliant' | 'non_compliant' | 'pending'
  IF v_role = 'carrier' AND v_is_org_admin = true THEN
    INSERT INTO public.carrier_compliance (
      carrier_id,
      company_name,
      mc_number,
      dot_number,
      insurance_status,
      safety_rating,
      w9_status,
      cargo_limit,
      auto_limit,
      insurance_expiration
    )
    VALUES (
      NEW.id,
      v_company_name,
      'MC-' || floor(100000 + random() * 900000)::text,
      'DOT-' || floor(1000000 + random() * 9000000)::text,
      'pending',
      'Satisfactory',
      'pending_review',   -- was 'pending' — not in CHECK constraint
      100000,
      1000000,
      (now() + interval '1 year')::date
    );
  END IF;

  RETURN NEW;
END;
$$;
