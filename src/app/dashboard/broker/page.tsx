"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import WrongPortalBannerWrapper from "@/components/WrongPortalBanner";
import { 
  getStoredLoads, 
  getStoredCompliance 
} from "@/lib/stateStore";
import { Load, CarrierCompliance } from "@/lib/mockData";
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle,
  Truck
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BrokerOverview() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [compliance, setCompliance] = useState<CarrierCompliance[]>([]);

  useEffect(() => {
    setLoads(getStoredLoads());
    setCompliance(getStoredCompliance());

    const handleStateChange = () => {
      setLoads(getStoredLoads());
      setCompliance(getStoredCompliance());
    };
    window.addEventListener("loadflow_state_change", handleStateChange);
    return () => window.removeEventListener("loadflow_state_change", handleStateChange);
  }, []);

  // Compute metrics
  const activeLoadsCount = loads.filter(l => ["posted", "booked", "in_transit"].includes(l.status)).length;
  const totalRevenue = loads.reduce((acc, curr) => acc + curr.shipperPrice, 0);
  const totalProfit = loads.reduce((acc, curr) => acc + curr.margin, 0);
  const avgMarginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  
  // Non compliant carrier alerts
  const riskCarriers = compliance.filter(c => c.insuranceStatus === "non_compliant" || c.w9Status === "missing");

  return (
    <DashboardShell activeRole="broker">
      
      <WrongPortalBannerWrapper />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Broker Operations</h1>
          <p className="text-slate-400 mt-1">Real-time oversight of shipments, earnings, and carrier compliance metrics.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/broker/loads">
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer">
              Create New Load
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        
        {/* Active Loads */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Active Shipments</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <Package className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{activeLoadsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Loads pending pick up or in transit</p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Shipper Billings</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Total revenue generated from shippers</p>
          </CardContent>
        </Card>

        {/* Broker Margin */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-cyan-500/5 blur-xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Gross Margin</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">${totalProfit.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Net profit after carrier payment</p>
          </CardContent>
        </Card>

        {/* Margin % */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-500/5 blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Average Margin %</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{avgMarginPercent}%</div>
            <p className="text-xs text-slate-500 mt-1">Target benchmark margin is 15%</p>
          </CardContent>
        </Card>

      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column - Active Loads List Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-white">Active Load Board</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Overview of current load statuses and bidding states.</CardDescription>
              </div>
              <Link href="/dashboard/broker/loads" className="text-xs text-emerald-400 font-semibold flex items-center gap-1 hover:underline">
                View All Loads <ArrowRight size={14} />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loads.slice(0, 4).map((load) => {
                  const bidCount = load.bids.length;
                  return (
                    <div 
                      key={load.id} 
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800">
                          <Truck className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{load.id}</span>
                            <Badge variant="outline" className={`text-[10px] capitalize px-1.5 py-0.25 ${
                              load.status === "posted" ? "border-blue-500/20 text-blue-400 bg-blue-500/5" :
                              load.status === "booked" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                              load.status === "in_transit" ? "border-cyan-500/20 text-cyan-400 bg-cyan-500/5" :
                              "border-slate-700 text-slate-400 bg-slate-800/10"
                            }`}>
                              {load.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 font-medium">
                            {load.originCity}, {load.originState} ➔ {load.destinationCity}, {load.destinationState}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">${load.shipperPrice.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {bidCount > 0 ? (
                            <span className="text-amber-400 font-semibold">{bidCount} bids pending</span>
                          ) : (
                            <span>No active bids</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Compliance alerts & Activity Log */}
        <div className="space-y-6">
          
          {/* Risk Alerts */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-red-400 h-5 w-5" />
                Compliance Risk Alerts
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Carriers failing validation checks.</CardDescription>
            </CardHeader>
            <CardContent>
              {riskCarriers.length > 0 ? (
                <div className="space-y-3.5">
                  {riskCarriers.map((c) => (
                    <div 
                      key={c.id} 
                      className="p-3.5 rounded-xl border border-red-500/10 bg-red-950/5 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-200">{c.companyName}</span>
                        <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0">Blocked</Badge>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                        <span>MC: {c.mcNumber}</span>
                        <span className="text-red-400">
                          {c.insuranceStatus === "non_compliant" ? "Expired Insurance" : "Missing W-9"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">All Carriers Compliant</p>
                  <p className="text-xs text-slate-500 mt-1">No risk alerts detected in the fleet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">Recent Log Activity</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Broker operations system events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-slate-800 pl-4 space-y-6">
                
                <div className="relative">
                  <div className="absolute -left-[21px] mt-1 h-2.5 w-2.5 rounded-full bg-blue-400 ring-4 ring-slate-950" />
                  <p className="text-xs text-slate-400">Today, 11:30 AM</p>
                  <p className="text-sm text-slate-200 mt-0.5 font-medium">J.B. Hunt placed a bid of <strong className="text-white">$2,300</strong> on L-9082</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-slate-950" />
                  <p className="text-xs text-slate-400">Today, 10:15 AM</p>
                  <p className="text-sm text-slate-200 mt-0.5 font-medium">Swift Logistics submitted bid on L-9082</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] mt-1 h-2.5 w-2.5 rounded-full bg-slate-500 ring-4 ring-slate-950" />
                  <p className="text-xs text-slate-400">Yesterday</p>
                  <p className="text-sm text-slate-200 mt-0.5 font-medium">Broker created load <strong className="text-white">L-9082</strong> (Savannah ➔ Dallas)</p>
                </div>

              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </DashboardShell>
  );
}
