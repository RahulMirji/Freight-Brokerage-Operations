"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { supabase } from "@/lib/supabase";
import { 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  Database,
  Building2, 
  Truck, 
  ShieldCheck, 
  ArrowRight,
  Code
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: "broker" | "carrier" | "shipper" | "system";
  action: string;
  details: string;
  metadata: Record<string, any>;
}

export default function BrokerAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);

  const getLogDetails = (log: any): string => {
    const payload = log.payload || {};
    const origin = payload.origin || '';
    const dest = payload.destination || '';
    
    switch (log.action) {
      case "LOAD_CREATION":
        return `Freight load requested: ${payload.display_id || 'Load'} (${origin} ➔ ${dest})`;
      case "BID_SUBMISSION":
        return `Bid of $${payload.amount?.toLocaleString()} placed on load ${payload.load_display_id || 'Load'}`;
      case "BID_ACCEPTED":
        return `Broker accepted bid of $${payload.amount?.toLocaleString()} on load ${payload.load_display_id || 'Load'}`;
      case "BID_REJECTED":
        return `Broker declined bid of $${payload.amount?.toLocaleString()} on load ${payload.load_display_id || 'Load'}`;
      case "CONTRACT_SIGNED":
        return `Rate Confirmation digitally signed by ${payload.signatory || 'Carrier'} for load ${payload.display_id || 'Load'}`;
      case "DISPATCH_START":
        return `Driver dispatched. Cargo in transit for load ${payload.display_id || 'Load'}`;
      case "DISPATCH_DELIVERY":
        return `Cargo marked delivered at destination for load ${payload.display_id || 'Load'}`;
      case "LOAD_BOOKED":
        return `Load ${payload.display_id || 'Load'} status updated: Booked`;
      case "LOAD_COMPLETED":
        return `Load ${payload.display_id || 'Load'} status updated: Completed & Paid`;
      case "LOAD_CANCELLED":
        return `Load ${payload.display_id || 'Load'} status updated: Cancelled`;
      default:
        return payload.details || `${log.action.replace("_", " ")} executed.`;
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          actor:profiles(company_name, full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching logs:", error);
      } else if (data) {
        const mappedLogs: AuditLog[] = data.map((log: any) => ({
          id: log.id,
          timestamp: log.created_at,
          actor: log.actor?.company_name || log.actor?.full_name || "System Engine",
          role: (log.actor_role || "system") as any,
          action: log.action,
          details: getLogDetails(log),
          metadata: log.payload || {}
        }));
        setLogs(mappedLogs);
        if (mappedLogs.length > 0 && !selectedLog) {
          setSelectedLog(mappedLogs[0]);
        }
      }
      setLoading(false);
    };

    fetchLogs();

    const channel = supabase
      .channel("audit_logs_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActorBadge = (role: AuditLog["role"]) => {
    switch (role) {
      case "broker":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">Broker</Badge>;
      case "carrier":
        return <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] uppercase font-bold">Carrier</Badge>;
      case "shipper":
        return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] uppercase font-bold">Shipper</Badge>;
      case "system":
        return <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] uppercase font-bold">System</Badge>;
    }
  };

  const getActionClass = (action: string) => {
    if (action.includes("CREATION")) return "text-emerald-400";
    if (action.includes("SIGNATURE")) return "text-amber-400 font-bold";
    if (action.includes("ACCEPTANCE")) return "text-blue-400 font-bold";
    if (action.includes("BOOT")) return "text-purple-400";
    if (action.includes("AUDIT")) return "text-slate-400";
    return "text-cyan-400";
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = `${log.id} ${log.actor} ${log.action} ${log.details}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.action.startsWith(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardShell activeRole="broker">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">System Audit Logs</h1>
        <p className="text-slate-400 mt-1 font-sans">Immutable transaction log tracking contract agreements, compliance checks, and driver dispatches.</p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
          <Input 
            placeholder="Search Log ID, actors, specific descriptions..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-emerald-500/20 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold px-4 h-9 focus:ring-emerald-500/20 text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="LOAD">Load Events</option>
            <option value="BID">Bidding Events</option>
            <option value="CONTRACT">Signature Events</option>
            <option value="COMPLIANCE">Compliance Events</option>
            <option value="SYSTEM">System Events</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column - Logs Table list */}
        <div className="lg:col-span-2 space-y-3">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => {
              const isActive = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isActive 
                      ? "border-emerald-500 bg-slate-900/60 shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)]" 
                      : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-400">{log.id}</span>
                        {getActorBadge(log.role)}
                        <span className={`text-[10px] font-bold tracking-wider uppercase ${getActionClass(log.action)}`}>
                          {log.action.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-200">{log.details}</p>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <ArrowRight size={14} className={`text-slate-600 shrink-0 self-center transition-transform ${
                      isActive ? "translate-x-1 text-emerald-400" : ""
                    }`} />
                  </div>
                </div>
              );
            })
          ) : (
            <Card className="bg-slate-900/30 border-slate-800 py-16 text-center">
              <CardContent className="flex flex-col items-center">
                <Database className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">No Logs Matching Search</p>
                <p className="text-xs text-slate-500 mt-1">Refine your category filters or search parameter.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Audit Log Details Inspect Metadata Panel */}
        <div className="space-y-6">
          {selectedLog ? (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm sticky top-6">
              
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="text-emerald-400 h-5 w-5" />
                  Audit Record Inspector
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">Detailed transaction metadata footprint.</CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                
                {/* Event Summary */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-500">Record ID</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedLog.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-500">Timestamp</span>
                    <span className="text-slate-300 font-semibold">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-500">Action Type</span>
                    <span className={`font-bold uppercase tracking-wider text-[10px] ${getActionClass(selectedLog.action)}`}>{selectedLog.action}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-500">Actor Entity</span>
                    <span className="text-slate-200 font-bold">{selectedLog.actor}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Authorized Portal</span>
                    <span className="capitalize text-slate-400 font-medium">{selectedLog.role} portal</span>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl space-y-1 text-xs">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Description</span>
                  <p className="text-slate-200 leading-relaxed font-semibold">{selectedLog.details}</p>
                </div>

                {/* JSON Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <Code size={13} />
                    <span>Transaction Payload JSON</span>
                  </div>
                  <pre className="p-4 bg-black/90 border border-slate-850 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto leading-relaxed select-all">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>

              </CardContent>

            </Card>
          ) : (
            <Card className="bg-slate-900/20 border-slate-800 py-20 text-center sticky top-6">
              <CardContent className="flex flex-col items-center">
                <FileText className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Select Audit Record</p>
                <p className="text-xs text-slate-500 mt-1">Select any event from the log list to inspect its transaction metadata, system footprint, and raw JSON payload.</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

    </DashboardShell>
  );
}
