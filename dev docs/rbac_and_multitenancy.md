# Multi-Tenancy & Granular RBAC — LoadFlow

LoadFlow separates database elements using strict organizational boundaries and granular permission catalogs.

---

## 👥 Tenant Isolation via PostgreSQL Row Level Security (RLS)

All tables use **Row Level Security (RLS)** in PostgreSQL to isolate tenant access:
- **Broker Scope**: Brokers see all available loads and carrier compliance logs, but staff can only see their parent broker organization's transactions.
- **Carrier Scope**: Carrier staff can only read, write, and sign rate confirmations matching their specific `org_id` profile.
- **Shipper Scope**: Shippers can only read loads where `shipper_id = auth.uid()`.

### RLS Implementation Snippets (SQL)

```sql
-- 1. Profiles Table Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_matching_org" ON public.profiles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    OR id = auth.uid()
  );

-- 2. Custom Roles Table Policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_org_scoped" ON public.roles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );
```

---

## 🔐 Permission Catalog Check Function

Roles are decoupled from dashboard access by mapping them to permission catalogs. The application checks these keys:
- `load.create`: Permission to publish freight loads.
- `load.assign_carrier`: Permission to select bids and assign carrier rates.
- `load.override_compliance_flag`: Permission to override carrier safety locks.
- `rate.confirm`: Permission to reissue accessorial rates.
- `load.update_status`: Permission to dispatch driver and report cargo location.
- `staff.manage`: Permission to provision custom roles and invite staff.
- `pod.upload`: Permission to upload cargo delivery certifications.

### Permission Check RPC (`has_permission`)
This PostgreSQL helper function returns `true` if the user is an admin or has the required permission in their role array.
```sql
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission text)
RETURNS boolean SECURITY DEFINER AS $$
DECLARE
  v_is_admin boolean;
  v_perms text[];
BEGIN
  -- Get admin flag
  SELECT is_org_admin INTO v_is_admin FROM public.profiles WHERE id = p_user_id;
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Get custom role permissions
  SELECT r.permissions INTO v_perms
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = p_user_id;

  RETURN p_permission = any(v_perms);
END;
$$ LANGUAGE plpgsql;
```

---

## 🔗 Staff Provisioning Flow

Developers can trace staff invitations through these components:
1. **Link Generation**: Admins select a custom role in the dashboard, hitting `/api/staff/invite` to get:
   `${origin}/signup?org_id={orgId}&role_id={roleId}`
2. **Signup Parsing**: `/signup` reads `org_id` and `role_id` query parameters:
   - Prefills and disables the company name input.
   - Hides the role selection buttons.
   - Supplies parameters inside the `options.data` metadata of `supabase.auth.signUp()`.
3. **Database Bootstrap**: The PostgreSQL trigger `handle_new_user()` reads these metadata parameters, inserts the profile, sets `is_org_admin = false`, and binds the profile to the invitation's role and organization.
