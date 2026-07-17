# Database Schema & Migrations

LoadFlow relies on a relational schema in PostgreSQL managed via Supabase migration files.

---

## 🗄️ Database Tables

### 1. `organizations`
Represents Brokerages and Carrier companies.
- `id` (uuid, PK)
- `name` (text): Company title.
- `type` (text): `broker` or `carrier`.
- `created_at` (timestamptz)

### 2. `profiles`
Represents users. Integrates directly with Supabase `auth.users`.
- `id` (uuid, PK, references `auth.users`)
- `org_id` (uuid, FK, references `organizations`)
- `role_id` (uuid, FK, references `roles`)
- `full_name` (text)
- `company_name` (text)
- `role` (text): `broker` | `carrier` | `shipper`.
- `is_org_admin` (boolean): Flags parent org managers.

### 3. `roles`
Stores organization-defined custom roles with permission catalogs.
- `id` (uuid, PK)
- `org_id` (uuid, FK, references `organizations`)
- `name` (text): e.g., "Dispatcher", "Auditor".
- `permissions` (text[]): Catalog permission keys.

### 4. `loads`
Core freight entities.
- `id` (uuid, PK)
- `display_id` (text, UNIQUE): Formatted like `L-9100`.
- `shipper_id` (uuid, FK, references `profiles`)
- `carrier_id` (uuid, FK, references `profiles`)
- `origin_city` / `origin_state` / `destination_city` / `destination_state` (text)
- `pickup_date` / `delivery_date` (date)
- `weight_lbs` (integer)
- `equipment_type` (text)
- `shipper_price` / `carrier_rate` / `broker_margin` (numeric)
- `status` (text): `posted` | `booked` | `in_transit` | `delivered` | `completed` | `cancelled`
- `carrier_signature` / `signed_at` (timestamptz)
- `compliance_overridden` (boolean)
- `pod_url` (text)

### 5. `rate_confirmations`
Tracks digital agreements and version histories.
- `id` (uuid, PK)
- `load_id` (uuid, FK, references `loads`)
- `version` (integer)
- `rate` (numeric): Base payout.
- `tarp_charge` / `detention_charge` / `layover_charge` (numeric): Accessorial splits.
- `grand_total` (numeric)
- `status` (text): `pending_signature` | `signed`.
- `carrier_signature` / `signed_at` (timestamptz)

### 6. `carrier_compliance`
Tracks credential ratings.
- `carrier_id` (uuid, PK, references `profiles`)
- `company_name` (text)
- `mc_number` / `dot_number` (text)
- `insurance_status` (text): `compliant` | `non_compliant`.
- `safety_rating` (text): `Satisfactory` | `Conditional` | `Unsatisfactory`.

### 7. `audit_logs`
Immutable logging table storing triggers and authentication violations.

---

## ⚡ Key DB Functions & Triggers

- **`accept_carrier_bid(p_bid_id uuid)`**: Atomic transaction accepting a carrier bid, updating load fields, rejecting other bids, and generating the first `rate_confirmations` version.
- **`handle_new_user()`**: Fired post `auth.users` creation to build organizations and profiles.
- **`validate_load_compliance_transition()`**: Fired before `loads.status` updates, blocking progress if carrier standing drops.
