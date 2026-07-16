"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { getStoredLoads, getStoredCompliance } from "@/lib/stateStore";
import { Load, CarrierCompliance } from "@/lib/mockData";
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

  useEffect(() => {
    const loads = getStoredLoads();
    const compliance = getStoredCompliance();

    // Dynamically generate audit logs based on current data state
    const generatedLogs: AuditLog[] = [];

    // System Startup Logs
    generatedLogs.push({
      id: "LOG-1001",
      timestamp: "2026-07-14T08:00:00Z",
      actor: "System Engine",
      role: "system",
      action: "SYSTEM_BOOT",
      details: "LoadFlow logistics server instance successfully initialized.",
      metadata: { env: "production", version: "1.0.0", node: "railway-us-east" }
    });

    // Compliance logs from initial compliance
    compliance.forEach((c, index) => {
      generatedLogs.push({
        id: `LOG-200${index}`,
        timestamp: `2026-07-15T09:12:${index * 5}Z`,
        actor: "Broker Compliance Engine",
        role: "broker",
        action: "COMPLIANCE_AUDIT",
        details: `Carrier ${c.companyName} checked. Status: ${c.insuranceStatus.toUpperCase()}`,
        metadata: { carrier: c.companyName, mc: c.mcNumber, status: c.insuranceStatus, safetyRating: c.safetyRating }
      });
    });

    // Load logs
    loads.forEach((l) => {
      // 1. Creation
      generatedLogs.push({
        id: `LOG-300-${l.id}`,
        timestamp: `${l.createdAt}T09:30:00Z`,
        actor: l.shipperName,
        role: "shipper",
        action: "LOAD_CREATION",
        details: `Freight load requested: ${l.id} (${l.originCity}, ${l.originState} ➔ ${l.destinationCity}, ${l.destinationState})`,
        metadata: { loadId: l.id, shipper: l.shipperName, budget: l.shipperPrice, equipment: l.equipmentType }
      });

      // 2. Bids
      l.bids.forEach((b, bIdx) => {
        generatedLogs.push({
          id: `LOG-400-${l.id}-${bIdx}`,
          timestamp: b.submittedAt,
          actor: b.carrierName,
          role: "carrier",
          action: "BID_SUBMISSION",
          details: `Bid of $${b.amount.toLocaleString()} placed on load ${l.id}`,
          metadata: { loadId: l.id, carrier: b.carrierName, amount: b.amount, mc: b.carrierMc, bidStatus: b.status }
        });

        // If bid is accepted
        if (b.status === "accepted") {
          generatedLogs.push({
            id: `LOG-500-${l.id}-${bIdx}`,
            timestamp: b.submittedAt, // approx same time for mock
            actor: "Broker Manager",
            role: "broker",
            action: "BID_ACCEPTANCE",
            details: `Broker accepted bid from ${b.carrierName} ($${b.amount.toLocaleString()}) on load ${l.id}`,
            metadata: { loadId: l.id, carrier: b.carrierName, rate: b.amount, margin: l.margin }
          });
        }
      });

      // 3. Digital signature contract
      if (l.carrierSignature) {
        generatedLogs.push({
          id: `LOG-600-${l.id}`,
          timestamp: l.signedAt || `${l.createdAt}T14:00:00Z`,
          actor: l.carrierName || "Carrier Dispatcher",
          role: "carrier",
          action: "CONTRACT_SIGNATURE",
          details: `Rate Confirmation digitally signed by ${l.carrierSignature} for load ${l.id}`,
          metadata: { loadId: l.id, signatory: l.carrierSignature, signedAt: l.signedAt, carrier: l.carrierName }
        });
      }

      // 4. In Transit / Dispatch progress
      if (l.status === "in_transit" || l.status === "delivered" || l.status === "completed") {
        generatedLogs.push({
          id: `LOG-700-${l.id}`,
          timestamp: `${l.createdAt}T15:20:00Z`,
          actor: l.carrierName || "Carrier Dispatcher",
          role: "carrier",
          action: "DISPATCH_START",
          details: `Driver dispatched. Cargo in transit for load ${l.id}`,
          metadata: { loadId: l.id, carrier: l.carrierName }
        });
      }

      if (l.status === "delivered" || l.status === "completed") {
        generatedLogs.push({
          id: `LOG-800-${l.id}`,
          timestamp: `${l.createdAt}T17:45:00Z`,
          actor: l.carrierName || "Driver GPS",
          role: "carrier",
          action: "DISPATCH_DELIVERY",
          details: `Cargo marked delivered at destination for load ${l.id}`,
          metadata: { loadId: l.id, carrier: l.carrierName }
        });
      }
    });

    // Sort by timestamp descending
    generatedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(generatedLogs);
    
    // Select first by default
    if (generatedLogs.length > 0) {
      setSelectedLog(generatedLogs[0]);
    }
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
