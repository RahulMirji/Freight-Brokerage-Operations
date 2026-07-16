"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { getStoredCompliance, saveStoredCompliance } from "@/lib/stateStore";
import { CarrierCompliance } from "@/lib/mockData";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Search, 
  UserCheck, 
  AlertTriangle,
  BadgeAlert,
  Calendar,
  CheckCircle,
  XCircle,
  FileCheck2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function BrokerCompliance() {
  const [carriers, setCarriers] = useState<CarrierCompliance[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setCarriers(getStoredCompliance());

    const handleStateChange = () => {
      setCarriers(getStoredCompliance());
    };
    window.addEventListener("loadflow_state_change", handleStateChange);
    return () => window.removeEventListener("loadflow_state_change", handleStateChange);
  }, []);

  const handleApproveCompliance = (carrierId: string) => {
    const updated = carriers.map((c) => {
      if (c.id === carrierId) {
        return {
          ...c,
          insuranceStatus: "compliant" as const,
          w9Status: "verified" as const,
          insuranceExpiration: "2027-12-31" // Extend expiration
        };
      }
      return c;
    });
    setCarriers(updated);
    saveStoredCompliance(updated);
  };

  const handleRevokeCompliance = (carrierId: string) => {
    const updated = carriers.map((c) => {
      if (c.id === carrierId) {
        return {
          ...c,
          insuranceStatus: "non_compliant" as const,
          w9Status: "missing" as const
        };
      }
      return c;
    });
    setCarriers(updated);
    saveStoredCompliance(updated);
  };

  const filteredCarriers = carriers.filter((c) => {
    return c.companyName.toLowerCase().includes(search.toLowerCase()) || c.mcNumber.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardShell activeRole="broker">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Carrier Compliance</h1>
          <p className="text-slate-400 mt-1">Audit carrier DOT/MC authorities, insurance coverage limits, and W-9 tax certifications.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
        <Input 
          placeholder="Search Carrier Name, MC Authority number..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-sm focus-visible:ring-emerald-500/20"
        />
      </div>

      {/* Compliance List Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredCarriers.map((c) => {
          const isCompliant = c.insuranceStatus === "compliant" && c.w9Status === "verified";
          return (
            <Card key={c.id} className="bg-slate-900/40 border-slate-800 flex flex-col justify-between">
              
              <div className="p-5 space-y-4">
                
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base">{c.companyName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">MC: {c.mcNumber} • DOT: {c.dotNumber}</p>
                  </div>
                  
                  {isCompliant ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 font-semibold">
                      Active Compliance
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold uppercase">
                      Action Required
                    </Badge>
                  )}
                </div>

                {/* Requirements Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/20 border border-slate-850 p-3 rounded-xl">
                  
                  {/* Auto Liability */}
                  <div className="flex items-center justify-between border-r border-slate-800/80 pr-2">
                    <span className="text-slate-500">Auto Liability</span>
                    <span className="font-bold text-slate-300">${(c.autoLimit / 1000000).toFixed(1)}M</span>
                  </div>

                  {/* Cargo limit */}
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-slate-500">Cargo Limit</span>
                    <span className="font-bold text-slate-300">${(c.cargoLimit / 1000).toFixed(0)}k</span>
                  </div>

                  {/* Insurance Expiry */}
                  <div className="flex items-center justify-between border-r border-slate-800/80 pr-2 pt-2 border-t border-slate-900">
                    <span className="text-slate-500">Insurance Expiry</span>
                    <span className={`font-semibold ${
                      new Date(c.insuranceExpiration) < new Date() ? "text-red-400 font-bold" : "text-slate-400"
                    }`}>
                      {c.insuranceExpiration}
                    </span>
                  </div>

                  {/* W-9 Status */}
                  <div className="flex items-center justify-between pl-2 pt-2 border-t border-slate-900">
                    <span className="text-slate-500">W-9 Form</span>
                    <span className={`font-semibold capitalize ${
                      c.w9Status === "verified" ? "text-emerald-400" :
                      c.w9Status === "pending_review" ? "text-amber-400" : "text-red-400 font-bold"
                    }`}>
                      {c.w9Status.replace("_", " ")}
                    </span>
                  </div>

                </div>

                {/* Safety Rating */}
                <div className="flex items-center justify-between text-xs p-1">
                  <span className="text-slate-500">FMCSA Safety Rating:</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    c.safetyRating === "Satisfactory" ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {c.safetyRating === "Satisfactory" ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {c.safetyRating}
                  </span>
                </div>

              </div>

              {/* Action Override strip */}
              <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/20 flex gap-2">
                {isCompliant ? (
                  <Button 
                    onClick={() => handleRevokeCompliance(c.id)}
                    variant="outline" 
                    className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs rounded-xl font-semibold cursor-pointer h-9"
                  >
                    Revoke Auth (Block Carrier)
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleApproveCompliance(c.id)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-semibold rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 cursor-pointer h-9"
                  >
                    <UserCheck size={14} /> Verify & Approve Documents
                  </Button>
                )}
              </div>

            </Card>
          );
        })}
      </div>

    </DashboardShell>
  );
}
