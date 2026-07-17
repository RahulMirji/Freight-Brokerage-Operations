# Database Schema & Migrations — LoadFlow

LoadFlow relies on a relational schema in PostgreSQL managed via Supabase migration files.

---

## 🗄️ Database Tables & Constraints

### 1. `organizations`
Represents Brokerages and Carrier companies.
```sql
CREATE TABLE public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('broker', 'carrier')),
  created_at  timestamptz DEFAULT now()
);
```

### 2. `profiles`
Represents user records linked directly to Supabase `auth.users`.
```sql
CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  org_id        uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  role_id       uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  full_name     text NOT NULL,
  company_name  text,
  role          text NOT NULL CHECK (role IN ('broker', 'carrier', 'shipper')),
  is_org_admin  boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
```

### 3. `roles`
Stores organization-defined custom roles with permission catalogs.
```sql
CREATE TABLE public.roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name         text NOT NULL,
  permissions  text[] NOT NULL,
  created_at   timestamptz DEFAULT now()
);
```

### 4. `loads`
Core freight entity.
- Features `display_id` generated via sequence `load_display_id_seq` starting at 9100.
```sql
CREATE TABLE public.loads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id            text UNIQUE NOT NULL DEFAULT ('L-' || nextval('public.load_display_id_seq')::text),
  shipper_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  carrier_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  origin_city           text NOT NULL,
  origin_state          text NOT NULL,
  destination_city      text NOT NULL,
  destination_state     text NOT NULL,
  pickup_date           date NOT NULL,
  delivery_date         date NOT NULL,
  weight_lbs            integer NOT NULL CHECK (weight_lbs > 0),
  equipment_type        text NOT NULL CHECK (equipment_type IN ('Reefer', 'Flatbed', 'Dry Van', 'Power Only')),
  description           text,
  shipper_price         numeric(10,2) NOT NULL CHECK (shipper_price > 0),
  carrier_rate          numeric(10,2) CHECK (carrier_rate > 0),
  broker_margin         numeric(10,2),
  status                text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'booked', 'in_transit', 'delivered', 'completed', 'cancelled')),
  carrier_signature     text,
  signed_at             timestamptz,
  compliance_overridden boolean DEFAULT false,
  pod_url               text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
```

### 5. `rate_confirmations`
Tracks digital agreements and version histories.
```sql
CREATE TABLE public.rate_confirmations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id           uuid REFERENCES public.loads(id) ON DELETE CASCADE,
  version           integer NOT NULL,
  rate              numeric(10,2) NOT NULL,
  tarp_charge       numeric(10,2) DEFAULT 0,
  detention_charge  numeric(10,2) DEFAULT 0,
  layover_charge    numeric(10,2) DEFAULT 0,
  grand_total       numeric(10,2) NOT NULL,
  status            text NOT NULL DEFAULT 'pending_signature' CHECK (status IN ('pending_signature', 'signed')),
  carrier_signature text,
  signed_at         timestamptz,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT unique_load_version UNIQUE (load_id, version)
);
```

### 6. `carrier_compliance`
Tracks credential ratings.
```sql
CREATE TABLE public.carrier_compliance (
  carrier_id           uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name         text NOT NULL,
  mc_number            text NOT NULL,
  dot_number           text NOT NULL,
  insurance_status     text NOT NULL CHECK (insurance_status IN ('compliant', 'non_compliant', 'pending')),
  insurance_expiration date NOT NULL,
  cargo_limit          numeric(12,2) NOT NULL,
  auto_limit           numeric(12,2) NOT NULL,
  w9_status            text NOT NULL CHECK (w9_status IN ('verified', 'missing', 'pending_review')),
  safety_rating        text NOT NULL CHECK (safety_rating IN ('Satisfactory', 'Conditional', 'Unsatisfactory')),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
```

---

## ⚡ Core Store Procedures (SQL RPCs)

### 1. `accept_carrier_bid`
Performs atomic bid acceptance:
1. Locks the `loads` row.
2. Rejects all other bids for this load.
3. Sets the bid status to `accepted`.
4. Assigns the `carrier_id` and calculates `broker_margin = shipper_price - carrier_rate`.
5. Inserts the initial digital rate confirmation version (`version = 1`, `grand_total = carrier_rate`).
```sql
CREATE OR REPLACE FUNCTION public.accept_carrier_bid(p_bid_id uuid)
RETURNS void AS $$
DECLARE
  v_load_id uuid;
  v_amount numeric;
  v_carrier_id uuid;
BEGIN
  -- Fetch bid details
  SELECT load_id, amount, carrier_id INTO v_load_id, v_amount, v_carrier_id
  FROM public.bids WHERE id = p_bid_id;

  -- Lock and update load
  UPDATE public.loads
  SET carrier_id = v_carrier_id,
      carrier_rate = v_amount,
      broker_margin = shipper_price - v_amount,
      status = 'booked'
  WHERE id = v_load_id;

  -- Reject competing bids
  UPDATE public.bids SET status = 'rejected' WHERE load_id = v_load_id AND id != p_bid_id;
  UPDATE public.bids SET status = 'accepted' WHERE id = p_bid_id;

  -- Seed initial contract version
  INSERT INTO public.rate_confirmations (load_id, version, rate, grand_total, status)
  VALUES (v_load_id, 1, v_amount, v_amount, 'pending_signature');
END;
$$ LANGUAGE plpgsql;
```

### 2. `handle_new_user`
Postgres trigger fired when a user signs up. Handles organization creation and bootstrapping or binding roles.
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_company text;
  v_org_id uuid;
  v_invited_org_id uuid;
  v_invited_role_id uuid;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'shipper');
  v_company := COALESCE(new.raw_user_meta_data->>'company_name', 'Independent Shipper');
  v_invited_org_id := (new.raw_user_meta_data->>'org_id')::uuid;
  v_invited_role_id := (new.raw_user_meta_data->>'role_id')::uuid;

  -- If invited, bind immediately
  IF v_invited_org_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, org_id, role_id, full_name, company_name, role, is_org_admin)
    VALUES (new.id, v_invited_org_id, v_invited_role_id, COALESCE(new.raw_user_meta_data->>'full_name', 'Staff Member'), v_company, v_role, false);
  ELSE
    -- Bootstrapping organization for new signups
    IF v_role IN ('broker', 'carrier') THEN
      INSERT INTO public.organizations (name, type)
      VALUES (v_company, v_role) RETURNING id INTO v_org_id;

      INSERT INTO public.profiles (id, org_id, full_name, company_name, role, is_org_admin)
      VALUES (new.id, v_org_id, COALESCE(new.raw_user_meta_data->>'full_name', 'Org Administrator'), v_company, v_role, true);

      -- If carrier, create compliance standing
      IF v_role = 'carrier' THEN
        INSERT INTO public.carrier_compliance (carrier_id, company_name, mc_number, dot_number, insurance_status, insurance_expiration, cargo_limit, auto_limit, w9_status, safety_rating)
        VALUES (new.id, v_company, 'MC-' || floor(random()*900000+100000)::text, 'DOT-' || floor(random()*9000000+1000000)::text, 'compliant', now() + interval '1 year', 100000.00, 1000000.00, 'verified', 'Satisfactory');
      END IF;
    ELSE
      -- Shipper individual
      INSERT INTO public.profiles (id, full_name, company_name, role, is_org_admin)
      VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Shipper Client'), v_company, 'shipper', true);
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;
```
