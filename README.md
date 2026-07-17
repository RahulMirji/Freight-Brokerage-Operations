# 🚀 LoadFlow — Freight Brokerage Operations Suite

LoadFlow is a real-time, multi-tenant freight brokerage operations dashboard connecting shippers and carriers. It features granular custom role-based access control (RBAC), digital contract versioning with accessorial management, safety compliance verification triggers, and instant real-time synchronization channels.

---

## 🌟 Key Features

- **👥 Multi-Tenant Organization Structure**: Isolation at the database level for Broker and Carrier organizations, alongside standalone Shipper accounts.
- **🔐 Permission Catalog RBAC**: Granular permissions (e.g., `load.create`, `rate.confirm`, `load.override_compliance_flag`) mapped to custom roles designed by organization administrators.
- **📝 Rate Versioning & Accessorials**: Audiable negotiation history of digital rate confirmations. Brokers can add tarp, detention, and layover charges to publish new contract versions, and carriers sign off on the latest version dynamically.
- **🚦 Compliance state Machine Guard**: Trigger-enforced locks blocking cargo progression past the Assigned state if a carrier's FMCSA safety rating or insurance lapse, unless overridden by authorized brokers.
- **📦 Real-Time POD Tracking**: Carriers can upload Proof of Delivery (POD) documents which instantly sync and render on the Shipper's tracking timeline and the Broker's audit panel.
- **🛡️ Edge Route Middleware**: High-performance path redirection that checks user JWT session cookie metadata at the Edge to isolate dashboards and redirect unauthorized logins.

---

## 🏗️ Technical Stack

- **Framework**: [Next.js App Router](https://nextjs.org) (TypeScript)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Realtime, Row Level Security)
- **Component Styling**: TailwindCSS & shadcn/ui
- **Icons**: Lucide React

---

## ⚙️ Local Development Quickstart

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/RahulMirji/Freight-Brokerage-Operations.git
cd Freight-Brokerage-Operations
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
```

### 3. Apply Schema Migrations
Apply the migrations in `/supabase/migrations` via the Supabase Dashboard CLI or run them inside your Supabase projectSQL Editor.

### 4. Run the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📖 Developer Documentation

For detailed technical explanations, SQL schema definitions, and implementation code walkthroughs, refer to the files in the **[dev docs](file:///Users/apple/Freight-Brokerage-Operations/dev%20docs)** directory:

- **[System Architecture Overview](file:///Users/apple/Freight-Brokerage-Operations/dev%20docs/architecture.md)**: Deployment topologies, project file structures, and local dev guides.
- **[Database Tables & RPCs](file:///Users/apple/Freight-Brokerage-Operations/dev%20docs/database.md)**: Full PostgreSQL table schemas, indexes, and trigger functions.
- **[Multi-Tenancy & RBAC Policies](file:///Users/apple/Freight-Brokerage-Operations/dev%20docs/rbac_and_multitenancy.md)**: Row Level Security policies, permission catalog rules, and invite signup flows.
- **[Digital Rate Confirmation Versioning](file:///Users/apple/Freight-Brokerage-Operations/dev%20docs/rate_confirmations.md)**: TypeScript components managing negotiation versions and accessorial charges.
- **[Compliance Guards & Overrides](file:///Users/apple/Freight-Brokerage-Operations/dev%20docs/compliance.md)**: State machine transition limits, Postgres trigger checks, and secure API overrides.
- **[Proof of Delivery (POD) Tracking](file:///Users/apple/Freight-Brokerage-Operations/dev%20docs/pod_tracking.md)**: Real-time POD uploader integrations and shipper view syncs.
