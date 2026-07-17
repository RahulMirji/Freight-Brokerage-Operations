# Multi-Tenancy & Granular RBAC

LoadFlow separates database elements using strict organizational boundaries and granular permission catalogs.

---

## 👥 Tenant Isolation (RLS Boundaries)

All tables use **Row Level Security (RLS)** in PostgreSQL to isolate tenant access:
- **Broker Scope**: Brokers see all available loads and carrier compliance logs, but staff can only see their parent broker organization's transactions.
- **Carrier Scope**: Carrier staff can only read, write, and sign rate confirmations matching their specific `org_id` profile.
- **Shipper Scope**: Shippers can only read loads where `shipper_id = auth.uid()`.

---

## 🔐 Permission Catalog

Roles are decoupled from dashboard access by mapping them to permission catalogs. The application tracks these keys:
- `load.create`: Permission to publish freight loads.
- `load.assign_carrier`: Permission to select bids and assign carrier rates.
- `load.override_compliance_flag`: Permission to override carrier safety locks.
- `rate.confirm`: Permission to reissue accessorial rates.
- `load.update_status`: Permission to dispatch driver and report cargo location.
- `staff.manage`: Permission to provision custom roles and invite staff.
- `pod.upload`: Permission to upload cargo delivery certifications.

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
