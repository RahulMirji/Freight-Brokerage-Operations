# LoadFlow — Supabase Migrations

This directory contains the full PostgreSQL schema for the LoadFlow Freight Brokerage Operations Suite.

## Structure

```
supabase/migrations/
├── 20260716142235_create_profiles_table.sql
├── 20260716142300_create_loads_table.sql
├── 20260716142317_create_bids_table.sql
├── 20260716142338_create_carrier_compliance_table.sql
└── 20260716142406_create_audit_logs_table.sql
```

## Table Summary

| Migration | Table | Description |
|---|---|---|
| `...profiles_table.sql` | `profiles` | Extends `auth.users` with role, company name. Auto-created on signup via trigger. |
| `...loads_table.sql` | `loads` | Core freight load. Shipper creates, broker manages, carrier executes. |
| `...bids_table.sql` | `bids` | Carrier bids on posted loads. One bid per carrier per load. Broker accepts/rejects. |
| `...carrier_compliance_table.sql` | `carrier_compliance` | DOT/MC/insurance/W9 per carrier. Auto-created when carrier signs up. |
| `...audit_logs_table.sql` | `audit_logs` | Immutable log written by DB triggers. Brokers read-only. |

## Applying to a Fresh Project

These migrations have already been applied to the Supabase project `ihkgqzjkykamxnizwggl`.
To apply them to a **new** project, run via Supabase CLI or the MCP `apply_migration` tool in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually via psql
psql $DATABASE_URL < 20260716142235_create_profiles_table.sql
psql $DATABASE_URL < 20260716142300_create_loads_table.sql
psql $DATABASE_URL < 20260716142317_create_bids_table.sql
psql $DATABASE_URL < 20260716142338_create_carrier_compliance_table.sql
psql $DATABASE_URL < 20260716142406_create_audit_logs_table.sql
```

> ⚠️ **Apply in order.** Each migration depends on the tables created in previous ones.

## Key Design Decisions

- **RLS everywhere.** All 5 tables have Row-Level Security enabled. Client-side code never needs to manually filter by user — the database enforces ownership at the query level.
- **Triggers, not application code.** Profile creation, compliance row initialization, and audit log entries are all written by PostgreSQL triggers. This ensures they happen atomically and cannot be skipped by client bugs.
- **Immutable audit trail.** The `audit_logs` table has no client INSERT policy. Only DB triggers write to it, making it tamper-proof.
- **Financial three-way split.** `loads.shipper_price` (what shipper pays) − `loads.carrier_rate` (what carrier earns) = `loads.broker_margin`. The broker's profit is transparent and tracked on every load.
