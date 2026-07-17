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
    const { load_id, override } = await req.json();
    if (!load_id) {
      return NextResponse.json({ error: "Missing load_id" }, { status: 400 });
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

    // Check load.override_compliance_flag permission
    const { data: hasPerm } = await supabase.rpc("has_permission", {
      p_user_id: user.id,
      p_permission: "load.override_compliance_flag"
    });

    if (!hasPerm && !profile.is_org_admin) {
      // Log unauthorized attempt in audit_logs
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: "unauthorized_compliance_override_attempt",
        details: { load_id, email: user.email }
      });
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    // Update load override status
    const { error: updateError } = await supabase
      .from("loads")
      .update({ compliance_overridden: !!override })
      .eq("id", load_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log authorized audit event
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: override ? "compliance_override_applied" : "compliance_override_removed",
      details: { load_id, email: user.email }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
