import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
