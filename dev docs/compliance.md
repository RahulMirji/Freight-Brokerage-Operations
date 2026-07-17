# Compliance Verification & Progress Blocking

To prevent dispatcher liability, LoadFlow implements automated state machine compliance blockers at the database trigger layer.

---

## 🚦 Compliance Blocking Rules

The PostgreSQL trigger `check_load_compliance_transition` fires `BEFORE UPDATE OF status ON public.loads`.
- **Target transitions**: Status changes past `assigned` (e.g. going to `booked`, `in_transit`, `delivered`).
- **Blocked State**: If the assigned carrier's `insurance_status` is `non_compliant` OR `safety_rating` is `Unsatisfactory` in the `carrier_compliance` table, the update is rejected with an exception.
- **Bypass**: The exception is bypassed if the load has `compliance_overridden = true`.

---

## 🛡️ Compliance Overrides

When compliance checks block a status transition:
1. The dashboard displays a warning banner.
2. Brokers with the `load.override_compliance_flag` permission see an override control flag.
3. Submitting hits the secure `/api/loads/override-compliance` route handler on the server.
4. The API validates credentials, sets `compliance_overridden = true` on the load, and inserts an authorized audit event log.
5. Unauthorized override attempts block execution and log alerts to the `audit_logs` table.
