import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    
    // Get caller session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Decode request payload
    const { role_id } = await req.json();
    if (!role_id) {
      return NextResponse.json({ error: "Missing role_id" }, { status: 400 });
    }

    // Verify user profile and permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check staff.manage permission
    const { data: hasPerm } = await supabase.rpc("has_permission", {
      p_user_id: user.id,
      p_permission: "staff.manage"
    });

    if (!hasPerm && !profile.is_org_admin) {
      // Log unauthorized attempt
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: "unauthorized_staff_invite_attempt",
        details: { role_id, email: user.email }
      });
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    // Generate link
    const origin = new URL(req.url).origin;
    const url = `${origin}/signup?org_id=${profile.org_id}&role_id=${role_id}`;

    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
