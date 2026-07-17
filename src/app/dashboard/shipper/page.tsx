"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import WrongPortalBannerWrapper from "@/components/WrongPortalBanner";
import { Load } from "@/lib/mockData";
import { supabase, mapDbLoadToUiLoad } from "@/lib/supabase";
import { 
  Package, 
  DollarSign, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle,
  PlusCircle,
  Truck,
  ChevronRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ShipperOverview() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoads = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("loads")
        .select(`
          *,
          shipper:profiles!loads_shipper_id_fkey(full_name, company_name),
          carrier:profiles!loads_carrier_id_fkey(full_name, company_name),
          bids:bids(
            *,
            carrier:profiles!bids_carrier_id_fkey(full_name, company_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching loads:", error);
      } else if (data) {
        setLoads(data.map(mapDbLoadToUiLoad));
      }
      setLoading(false);
    };

    fetchLoads();

    const channel = supabase
      .channel("shipper_loads_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, () => {
        fetchLoads();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => {
        fetchLoads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter loads requested by this shipper (RLS does this, so we just use all fetched loads)
  const myLoads = loads;

  // Compute reactive selected load to update details instantly on real-time changes
  const activeSelectedLoad = selectedLoad ? loads.find(l => l.id === selectedLoad.id) || selectedLoad : null;

  // Metrics
  const activeCount = myLoads.filter(l => ["posted", "booked", "in_transit", "delivered"].includes(l.status)).length;
  const completedCount = myLoads.filter(l => l.status === "completed").length;
  const totalSpend = myLoads.reduce((acc, curr) => acc + curr.shipperPrice, 0);


  return (
    <DashboardShell activeRole="shipper">
      
      <WrongPortalBannerWrapper />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Cargo Tracking</h1>
          <p className="text-slate-400 mt-1">Track active freight coordinates, review completed runs, and audit logistics spending.</p>
        </div>
        <Link href="/dashboard/shipper/request">
          <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center gap-1.5 cursor-pointer">
            <PlusCircle size={16} /> Request New Shipment
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        
        {/* Active shipments */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-500/5 blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Active Shipments</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{activeCount}</div>
            <p className="text-xs text-slate-500 mt-1">Loads currently in pipeline</p>
          </CardContent>
        </Card>

        {/* Completed runs */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Completed Deliveries</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{completedCount}</div>
            <p className="text-xs text-slate-500 mt-1">Closed accounts and paid runs</p>
          </CardContent>
        </Card>

        {/* Spend */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Total Logistics Spend</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">${totalSpend.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Shipper contract billings to date</p>
          </CardContent>
        </Card>

      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Shipped Loads List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">My Shipments</h3>

          {myLoads.length > 0 ? (
            myLoads.map((load) => {
              const isActive = activeSelectedLoad?.id === load.id;
              return (
                <div 
                  key={load.id}
                  onClick={() => setSelectedLoad(load)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isActive 
                      ? "border-amber-500 bg-slate-900/60 shadow-[0_0_20px_-5px_rgba(245,158,11,0.1)]" 
                      : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{load.id}</span>
                        <Badge className={`text-[10px] capitalize font-semibold px-2 py-0.5 ${
                          load.status === "posted" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          load.status === "booked" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          load.status === "in_transit" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                          load.status === "delivered" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-slate-800 text-slate-400 border border-slate-750"
                        }`}>
                          {load.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mt-2.5">
                        <MapPin size={15} className="text-amber-400" />
                        <span>{load.originCity}, {load.originState}</span>
                        <span className="text-slate-600 font-normal">➔</span>
                        <span>{load.destinationCity}, {load.destinationState}</span>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-500" />
                          Pickup: {load.pickupDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck size={13} className="text-slate-500" />
                          {load.carrierName || "Awaiting carrier booking"}
                        </span>
                      </div>
                    </div>

                    {/* Spend rate */}
                    <div className="text-left sm:text-right border-t border-slate-800/60 sm:border-0 pt-2 sm:pt-0 mt-2 sm:mt-0 flex sm:flex-col justify-between sm:justify-center items-baseline sm:items-end gap-1">
                      <p className="text-xs text-slate-500">Contract Rate</p>
                      <p className="text-lg font-black text-white">${load.shipperPrice.toLocaleString()}</p>
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <Card className="bg-slate-900/30 border-slate-800 py-12 text-center">
              <CardContent className="flex flex-col items-center">
                <Package className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-300">No Cargo Requests Found</p>
                <p className="text-xs text-slate-500 mt-1">You haven't requested any shipments yet. Click the request button to create one.</p>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Shipment Tracker visual panel */}
        <div className="space-y-6">
          {activeSelectedLoad ? (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm sticky top-6">
              
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-amber-400" />
                  Live Cargo Tracker
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">ID: {activeSelectedLoad.id} • Carrier: {activeSelectedLoad.carrierName || "Unassigned"}</CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                
                {/* Visual Map Mock */}
                <div className="w-full h-36 bg-slate-950 rounded-xl relative border border-slate-850 overflow-hidden mb-6 flex items-center justify-center">
                  {/* Grid lines inside map */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#151515_1px,transparent_1px),linear-gradient(to_bottom,#151515_1px,transparent_1px)] bg-[size:1rem_1rem]" />
                  {/* Glowing route line */}
                  <svg className="absolute w-full h-full p-6 text-slate-600" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M 10 50 Q 50 10 90 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    {activeSelectedLoad.status === "in_transit" && (
                      <path d="M 10 50 Q 50 10 50 25" fill="none" stroke="#f59e0b" strokeWidth="3" className="animate-pulse" />
                    )}
                    {["delivered", "completed"].includes(activeSelectedLoad.status) && (
                      <path d="M 10 50 Q 50 10 90 50" fill="none" stroke="#10b981" strokeWidth="3" />
                    )}
                  </svg>
                  {/* Origin point */}
                  <div className="absolute left-[34px] top-[48px] h-3 w-3 rounded-full bg-amber-500 border-2 border-slate-900 shadow-[0_0_10px_#f59e0b]" />
                  <span className="absolute left-6 top-[66px] text-[9px] font-bold text-slate-500 uppercase">{activeSelectedLoad.originCity}</span>
                  
                  {/* Destination point */}
                  <div className="absolute right-[34px] top-[48px] h-3 w-3 rounded-full bg-slate-600 border-2 border-slate-900" />
                  <span className="absolute right-6 top-[66px] text-[9px] font-bold text-slate-500 uppercase">{activeSelectedLoad.destinationCity}</span>

                  {/* Active vehicle indicator */}
                  {activeSelectedLoad.status === "in_transit" && (
                    <div className="absolute left-1/2 top-[24px] -translate-x-1/2 flex flex-col items-center gap-1">
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center animate-bounce border border-amber-500/30">
                        <Truck size={12} className="text-amber-400" />
                      </div>
                      <span className="bg-slate-900/80 border border-slate-800 text-[8px] font-bold text-slate-200 px-1 py-0.25 rounded">IN TRANSIT</span>
                    </div>
                  )}

                  {activeSelectedLoad.status === "booked" && (
                    <div className="absolute left-[38px] top-[30px] flex flex-col items-center gap-1">
                      <span className="bg-slate-900/80 border border-slate-800 text-[8px] font-bold text-slate-200 px-1 py-0.25 rounded">AT ORIGIN</span>
                    </div>
                  )}

                  {["delivered", "completed"].includes(activeSelectedLoad.status) && (
                    <div className="absolute right-[24px] top-[26px] flex flex-col items-center gap-1">
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle size={10} className="text-emerald-400" />
                      </div>
                      <span className="bg-slate-900/80 border border-slate-800 text-[8px] font-bold text-slate-200 px-1 py-0.25 rounded">ARRIVED</span>
                    </div>
                  )}
                </div>

                {/* Tracking Timeline Stepper */}
                <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-6 text-xs">
                  
                  {/* Step 1: Dispatched */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] mt-0.5 h-2.5 w-2.5 rounded-full ring-4 ring-slate-950 ${
                      ["booked", "in_transit", "delivered", "completed"].includes(activeSelectedLoad.status) ? "bg-emerald-400" : "bg-slate-700"
                    }`} />
                    <p className="font-bold text-slate-200">Load Dispatched & Booked</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Carrier allocated: {activeSelectedLoad.carrierName || "Awaiting Broker matching"}</p>
                  </div>

                  {/* Step 2: In Transit */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] mt-0.5 h-2.5 w-2.5 rounded-full ring-4 ring-slate-950 ${
                      ["in_transit", "delivered", "completed"].includes(activeSelectedLoad.status) ? "bg-emerald-400" : "bg-slate-700"
                    }`} />
                    <p className="font-bold text-slate-200">In Transit (On Route)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Estimated coordinate check-ins active.</p>
                  </div>

                  {/* Step 3: Arrived */}
                  <div className="relative">
                    <div className={`absolute -left-[21px] mt-0.5 h-2.5 w-2.5 rounded-full ring-4 ring-slate-950 ${
                      ["delivered", "completed"].includes(activeSelectedLoad.status) ? "bg-emerald-400" : "bg-slate-700"
                    }`} />
                    <p className="font-bold text-slate-200">Delivered at Destination</p>
                    {activeSelectedLoad.podUrl ? (
                      <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                        Proof of Delivery (POD) uploaded: <span className="underline font-bold text-slate-200">{activeSelectedLoad.podUrl}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-0.5">Proof of Delivery (POD) pending audit checks.</p>
                    )}
                  </div>

                </div>

              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/20 border-slate-800 py-20 text-center sticky top-6">
              <CardContent className="flex flex-col items-center">
                <Activity className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Select Shipment</p>
                <p className="text-xs text-slate-500 mt-1">Select an active cargo shipment from the left list to enable the real-time tracking visualization and checkpoint stepper.</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

    </DashboardShell>
  );
}

