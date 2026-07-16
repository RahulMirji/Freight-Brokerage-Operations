import Link from "next/link";
import { Truck, Building2, ShieldCheck, ArrowRight, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black text-slate-100 font-sans">
      {/* Background glowing mesh patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 left-1/4 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 h-[400px] w-[600px] translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <main className="relative z-10 flex w-full max-w-6xl flex-col items-center px-6 py-12 text-center">
        {/* Logo Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 text-sm font-semibold mb-8 animate-pulse">
          <Activity size={16} />
          LoadFlow v1.0 • Hackathon Prototype
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 mb-6">
          Streamline Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Freight Operations</span>
        </h1>
        
        {/* Description */}
        <p className="max-w-2xl text-lg md:text-xl text-slate-400 leading-relaxed mb-12">
          An all-in-one logistics suite for modern freight brokerage. Connect Shippers, Carriers, and Brokers with real-time audit trails, automated compliance, and digital signature contracts.
        </p>

        {/* Role Selectors */}
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          
          {/* Broker Card */}
          <Link href="/dashboard/broker" className="group relative rounded-2xl border border-slate-800 bg-slate-950/60 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-slate-900/40 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Building2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white group-hover:text-emerald-400 transition-colors">
              Broker Portal
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Create and dispatch loads, manage bidding workflows, view profit margins, and monitor carrier compliance.
            </p>
            <div className="flex items-center text-xs font-semibold text-emerald-400 gap-1.5">
              Enter Broker Dashboard <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Carrier Card */}
          <Link href="/dashboard/carrier" className="group relative rounded-2xl border border-slate-800 bg-slate-950/60 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-slate-900/40 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)]">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Truck size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white group-hover:text-cyan-400 transition-colors">
              Carrier Portal
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Search available freight loads, submit binding rates, track active dispatches, and upload compliance certs.
            </p>
            <div className="flex items-center text-xs font-semibold text-cyan-400 gap-1.5">
              Enter Carrier Dashboard <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Shipper Card */}
          <Link href="/dashboard/shipper" className="group relative rounded-2xl border border-slate-800 bg-slate-950/60 p-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:bg-slate-900/40 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white group-hover:text-amber-400 transition-colors">
              Shipper Portal
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Submit load details, track transit status, verify carrier credentials, and audit complete transaction logs.
            </p>
            <div className="flex items-center text-xs font-semibold text-amber-400 gap-1.5">
              Enter Shipper Dashboard <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs text-slate-600 font-medium">
        LoadFlow Inc. © {new Date().getFullYear()} • Designed for Hackathon Speed & Reliability
      </footer>
    </div>
  );
}
