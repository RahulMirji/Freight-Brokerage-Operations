import { createBrowserClient, createServerClient as createSupabaseServerClient, type CookieOptions } from "@supabase/ssr";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client. Use this in middleware, Server Components,
 * and Route Handlers. Pass a cookies() adapter from next/headers.
 */
export function createServerSupabaseClient(cookieStore: ReadonlyRequestCookies) {
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            (cookieStore as any).set(name, value, options)
          );
        } catch {
          // setAll called from Server Component — reads are fine, writes silently ignored
        }
      },
    },
  });
}

/**
 * Browser-side Supabase client. Use this in all "use client" components.
 * Reads the session from cookies automatically via @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Singleton client instance for use in non-reactive contexts.
 */
export const supabase = createClient();

// ─── Type helpers that mirror our DB schema ───────────────────────────────────

export type UserRole = "broker" | "carrier" | "shipper";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
};

export type LoadStatus =
  | "posted"
  | "booked"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled";

export type EquipmentType = "Reefer" | "Flatbed" | "Dry Van" | "Power Only";

export type Load = {
  id: string;
  display_id: string;
  shipper_id: string | null;
  carrier_id: string | null;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  delivery_date: string;
  weight_lbs: number;
  equipment_type: EquipmentType;
  description: string | null;
  shipper_price: number;
  carrier_rate: number | null;
  broker_margin: number | null;
  status: LoadStatus;
  carrier_signature: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (when fetched with select)
  shipper?: Profile;
  carrier?: Profile;
  bids?: Bid[];
};

export type BidStatus = "pending" | "accepted" | "rejected";

export type Bid = {
  id: string;
  load_id: string;
  carrier_id: string;
  amount: number;
  status: BidStatus;
  note: string | null;
  submitted_at: string;
  // Joined
  carrier?: Profile;
};

export type InsuranceStatus = "compliant" | "non_compliant" | "pending";
export type W9Status = "verified" | "missing" | "pending_review";
export type SafetyRating = "Satisfactory" | "Conditional" | "Unsatisfactory";

export type CarrierCompliance = {
  id: string;
  carrier_id: string;
  mc_number: string | null;
  dot_number: string | null;
  insurance_status: InsuranceStatus;
  insurance_expiration: string | null;
  cargo_limit: number | null;
  auto_limit: number | null;
  w9_status: W9Status;
  safety_rating: SafetyRating | null;
  updated_at: string;
  // Joined
  carrier?: Profile;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, any> | null;
  created_at: string;
  // Joined
  actor?: Profile;
};

// ─── Data Mappers ────────────────────────────────────────────────────────────

export function mapDbLoadToUiLoad(dbLoad: any): any {
  const bids = (dbLoad.bids || []).map((b: any) => ({
    id: b.id,
    carrier_id: b.carrier_id,
    carrierName: b.carrier?.company_name || b.carrier?.full_name || "Unknown Carrier",
    carrierMc: b.carrier_compliance?.mc_number || "MC-000000",
    amount: Number(b.amount),
    rating: 4.8, // Mock default safety rating
    status: b.status,
    submittedAt: b.submitted_at
  }));

  return {
    id: dbLoad.display_id,
    db_id: dbLoad.id,
    shipperName: dbLoad.shipper?.company_name || dbLoad.shipper?.full_name || "Unknown Shipper",
    carrierName: dbLoad.carrier?.company_name || dbLoad.carrier?.full_name || null,
    originCity: dbLoad.origin_city,
    originState: dbLoad.origin_state,
    destinationCity: dbLoad.destination_city,
    destinationState: dbLoad.destination_state,
    pickupDate: dbLoad.pickup_date,
    deliveryDate: dbLoad.delivery_date,
    rate: Number(dbLoad.carrier_rate) || 0,
    margin: Number(dbLoad.broker_margin) || 0,
    shipperPrice: Number(dbLoad.shipper_price),
    status: dbLoad.status,
    weightLbs: dbLoad.weight_lbs,
    equipmentType: dbLoad.equipment_type,
    description: dbLoad.description || "",
    createdAt: dbLoad.created_at?.split("T")[0] || "",
    bids: bids,
    carrierSignature: dbLoad.carrier_signature || undefined,
    signedAt: dbLoad.signed_at || undefined,
    carrierId: dbLoad.carrier_id || null,
    complianceOverridden: dbLoad.compliance_overridden || false,
    podUrl: dbLoad.pod_url || null
  };
}

export function mapDbComplianceToUiCompliance(c: any): any {
  return {
    id: c.id,
    carrier_id: c.carrier_id,
    companyName: c.carrier?.company_name || c.carrier?.full_name || "Unknown Carrier",
    mcNumber: c.mc_number || "",
    dotNumber: c.dot_number || "",
    insuranceStatus: c.insurance_status,
    insuranceExpiration: c.insurance_expiration || "",
    cargoLimit: Number(c.cargo_limit) || 0,
    autoLimit: Number(c.auto_limit) || 0,
    w9Status: c.w9_status,
    safetyRating: c.safety_rating || "Satisfactory"
  };
}

