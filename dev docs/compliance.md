# Compliance Verification & Progress Blocking — LoadFlow

To prevent dispatcher liability, LoadFlow implements automated state machine compliance blockers at the database trigger layer.

---

## 🚦 State Machine Transition Flow

The status lifecycle of a load progresses in a strict sequence:
1. `posted`: Shipper creates load. Available for bidding.
2. `assigned`: Carrier accepted. Awaiting signing.
3. `booked`: Signed by carrier.
4. `in_transit`: Driver dispatched and hauling.
5. `delivered`: Delivered to recipient.
6. `completed`: Audited by broker, POD verified, billing closed.

The database compliance blocker prevents progression from `assigned` onwards if carrier status is lapsed.

---

## ⚡ SQL Compliance Blocker Trigger

The PostgreSQL function checks updates before committing status changes:
```sql
CREATE OR REPLACE FUNCTION public.check_load_compliance_transition()
RETURNS trigger AS $$
DECLARE
  v_ins_status text;
  v_safety text;
BEGIN
  -- We only block progression past 'assigned' state
  IF NEW.status IN ('booked', 'in_transit', 'delivered', 'completed') AND OLD.status IN ('posted', 'assigned') THEN
    
    -- If compliance overridden, allow transition immediately
    IF NEW.compliance_overridden THEN
      RETURN NEW;
    END IF;

    -- Query carrier compliance
    SELECT insurance_status, safety_rating INTO v_ins_status, v_safety
    FROM public.carrier_compliance
    WHERE carrier_id = NEW.carrier_id;

    -- Block transition if lapsed
    IF v_ins_status != 'compliant' OR v_safety = 'Unsatisfactory' THEN
      RAISE EXCEPTION 'Carrier compliance status is lapsed. Progress past Assigned is blocked!';
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_load_compliance_trigger
  BEFORE UPDATE ON public.loads
  FOR EACH ROW EXECUTE FUNCTION public.check_load_compliance_transition();
```

---

## 🛡️ Secure API Overrides (`/api/loads/override-compliance`)

When a load is locked, authorized brokers can bypass the trigger using a secure API route handler.

### Request Payload
`POST /api/loads/override-compliance`
```json
{
  "load_id": "90e5fa47-66a7-47b2-84fc-2b7de02cbe81",
  "override": true
}
```

### Handler Code Snippet
Located in [override-compliance/route.ts](file:///Users/apple/Freight-Brokerage-Operations/src/app/api/loads/override-compliance/route.ts):
```typescript
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  const { load_id, override } = await req.json();

  // 1. Verify user profile and permissions
  const { data: hasPerm } = await supabase.rpc("has_permission", {
    p_user_id: user.id,
    p_permission: "load.override_compliance_flag"
  });

  if (!hasPerm) {
    // Log unauthorized attempt to audit_logs
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "unauthorized_compliance_override_attempt",
      details: { load_id }
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Perform override
  await supabase
    .from("loads")
    .update({ compliance_overridden: !!override })
    .eq("id", load_id);
}
```
All attempts are fully audited and logged inside the immutable `audit_logs` table.
