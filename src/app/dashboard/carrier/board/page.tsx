"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { supabase, mapDbLoadToUiLoad, mapDbComplianceToUiCompliance } from "@/lib/supabase";
import { Load, Bid, CarrierCompliance } from "@/lib/mockData";
import { 
  Search, 
  MapPin, 
  Calendar, 
  Scale, 
  Truck, 
  DollarSign, 
  ChevronRight,
  TrendingUp,
  FileCheck2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CarrierBoard() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [compliance, setCompliance] = useState<CarrierCompliance | null>(null);
  const [search, setSearch] = useState("");
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [carrierId, setCarrierId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCarrierBoardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCarrierId(user.id);

      // 1. Fetch compliance
      const { data: compData } = await supabase
        .from("carrier_compliance")
        .select(`
          *,
          carrier:profiles(company_name, full_name)
        `)
        .eq("carrier_id", user.id)
        .maybeSingle();

      if (compData) {
        setCompliance(mapDbComplianceToUiCompliance(compData));
      }

      // 2. Fetch available loads
      const { data: loadsData } = await supabase
        .from("loads")
        .select(`
          *,
          shipper:profiles!loads_shipper_id_fkey(company_name),
          carrier:profiles!loads_carrier_id_fkey(company_name),
          bids:bids(
            *,
            carrier:profiles!bids_carrier_id_fkey(full_name, company_name)
          )
        `)
        .eq("status", "posted")
        .order("created_at", { ascending: false });

      if (loadsData) {
        setLoads(loadsData.map(mapDbLoadToUiLoad));
      }
    };

    fetchCarrierBoardData();

    const channel = supabase
      .channel("carrier_board_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, () => {
        fetchCarrierBoardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => {
        fetchCarrierBoardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoad || !carrierId) return;
    if (compliance?.insuranceStatus !== "compliant") {
      alert("Compliance Block: You must be in fully compliant standing to submit bids.");
      return;
    }

    const bidVal = Number(bidAmount);
    if (isNaN(bidVal) || bidVal <= 0) return;

    const { error: insertError } = await supabase
      .from("bids")
      .insert({
        load_id: (selectedLoad as any).db_id,
        carrier_id: carrierId,
        amount: bidVal,
        status: "pending"
      });

    if (insertError) {
      if (insertError.code === "23505") {
        alert("You have already submitted a bid on this load.");
      } else {
        alert(insertError.message || "Failed to submit bid. Please try again.");
      }
    } else {
      setBidAmount("");
    }
  };

  // Only display loads with status 'posted'
  const availableLoads = loads.filter(l => l.status === "posted");

  // Search filter
  const filteredLoads = availableLoads.filter(load => {
    const searchString = `${load.id} ${load.originCity} ${load.destinationCity} ${load.equipmentType}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  });

  const activeSelectedLoad = selectedLoad ? loads.find(l => l.id === selectedLoad.id) || selectedLoad : null;

  return (
    <DashboardShell activeRole="carrier">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Load Board</h1>
          <p className="text-slate-400 mt-1">Submit bids and book spot-market freight from certified brokers.</p>
        </div>
      </div>

      {/* Compliance Warning (If not compliant) */}
      {compliance?.insuranceStatus !== "compliant" && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/10 text-red-400 text-sm flex items-center gap-3 mb-6">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Compliance Warning Alert</p>
            <p className="text-xs text-slate-400 mt-0.5">Your insurance documents are marked as expired. You cannot submit bids until they are updated in My Compliance.</p>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Available Loads List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Filter by origin city, destination, equipment..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 focus-visible:ring-cyan-500/20"
            />
          </div>

          {filteredLoads.length > 0 ? (
            filteredLoads.map((load) => {
              const hasBid = carrierId ? load.bids.some(b => b.carrier_id === carrierId) : false;
              const isActive = activeSelectedLoad?.id === load.id;

              return (
                <div 
                  key={load.id}
                  onClick={() => {
                    setSelectedLoad(load);
                    setBidAmount(load.rate.toString());
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isActive 
                      ? "border-cyan-500 bg-slate-900/60 shadow-[0_0_20px_-5px_rgba(6,182,212,0.1)]" 
                      : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{load.id}</span>
                        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-1.5 py-0 font-semibold">Available</Badge>
                        {hasBid && (
                          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0 font-semibold">Bid Submitted</Badge>
                        )}
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mt-2.5">
                        <MapPin size={15} className="text-cyan-400" />
                        <span>{load.originCity}, {load.originState}</span>
                        <span className="text-slate-600 font-normal">➔</span>
                        <span>{load.destinationCity}, {load.destinationState}</span>
                      </div>

                      {/* Info Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-500" />
                          Pickup: {load.pickupDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Scale size={13} className="text-slate-500" />
                          {load.weightLbs.toLocaleString()} lbs
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck size={13} className="text-slate-500" />
                          {load.equipmentType}
                        </span>
                      </div>
                    </div>

                    {/* Financial rate */}
                    <div className="text-left sm:text-right border-t border-slate-800/60 sm:border-0 pt-2 sm:pt-0 mt-2 sm:mt-0 flex sm:flex-col justify-between sm:justify-center items-baseline sm:items-end gap-1">
                      <p className="text-xs text-slate-500">Broker Offer Rate</p>
                      <p className="text-lg font-black text-white">${load.rate.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">Est. pay per mile: $3.25</p>
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <Card className="bg-slate-900/30 border-slate-800 py-12 text-center">
              <CardContent className="flex flex-col items-center">
                <Truck className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-300">No Loads Available</p>
                <p className="text-xs text-slate-500 mt-1">There are currently no active loads awaiting bids on the board.</p>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Load bidding details panel */}
        <div className="space-y-6">
          {activeSelectedLoad ? (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm sticky top-6">
              
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold text-white">{activeSelectedLoad.id}</CardTitle>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">SPOT FREIGHT</Badge>
                </div>
                <CardDescription className="text-xs text-slate-400 mt-1">Shipped via LoadFlow Certified Broker</CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                
                {/* Route Summary */}
                <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2 text-xs">
                  <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Route Details</p>
                  <div className="flex justify-between items-center text-slate-200">
                    <span className="font-semibold">{activeSelectedLoad.originCity}, {activeSelectedLoad.originState}</span>
                    <span className="text-slate-600 font-normal">➔</span>
                    <span className="font-semibold">{activeSelectedLoad.destinationCity}, {activeSelectedLoad.destinationState}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 mt-1 pt-1.5 border-t border-slate-900">
                    <span>Pickup: {activeSelectedLoad.pickupDate}</span>
                    <span>Delivery: {activeSelectedLoad.deliveryDate}</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-2">
                  <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Trailer / Load Specifications</p>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div className="text-slate-400">Trailer Required:</div>
                    <div className="text-slate-200 font-semibold text-right">{activeSelectedLoad.equipmentType}</div>
                    <div className="text-slate-400">Cargo Weight:</div>
                    <div className="text-slate-200 font-semibold text-right">{activeSelectedLoad.weightLbs.toLocaleString()} lbs</div>
                  </div>
                  {activeSelectedLoad.description && (
                    <p className="text-xs text-slate-400 italic bg-slate-950/20 p-2.5 rounded-lg border border-slate-900 mt-2">
                      "{activeSelectedLoad.description}"
                    </p>
                  )}
                </div>

                {/* Bidding box */}
                <div className="border-t border-slate-800/40 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submit Rates</h4>
                    <span className="text-[11px] text-slate-400 font-medium">Broker rate: <strong>${activeSelectedLoad.rate}</strong></span>
                  </div>

                  {carrierId && activeSelectedLoad.bids.some(b => b.carrier_id === carrierId) ? (
                    <div className="p-4 bg-emerald-950/15 border border-emerald-500/10 rounded-xl text-center space-y-2.5">
                      <FileCheck2 size={24} className="mx-auto text-emerald-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-200">Bid Submitted Successfully</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Amount: <strong className="text-emerald-400">${activeSelectedLoad.bids.find(b => b.carrier_id === carrierId)?.amount}</strong>
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-500">Wait for the broker to review and accept/decline your offer.</p>
                    </div>
                  ) : (
                    <form onSubmit={handlePlaceBid} className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="bid-rate">Bid Offer Amount ($)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                          <Input 
                             id="bid-rate" 
                             type="number"
                             placeholder="e.g. 2350"
                             value={bidAmount}
                             onChange={(e) => setBidAmount(e.target.value)}
                             disabled={compliance?.insuranceStatus !== "compliant"}
                             className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-cyan-500/20 text-sm font-semibold"
                             required
                           />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={compliance?.insuranceStatus !== "compliant"}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-black font-semibold rounded-xl text-sm py-2 shadow-lg shadow-cyan-500/10 cursor-pointer"
                      >
                        Submit Binding Bid
                      </Button>
                    </form>
                  )}

                </div>

              </CardContent>

            </Card>
          ) : (
            <Card className="bg-slate-900/20 border-slate-800 py-20 text-center sticky top-6">
              <CardContent className="flex flex-col items-center">
                <MapPin className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Select a Load to Bid</p>
                <p className="text-xs text-slate-500 mt-1">Select an active load from the board list to review trailer specs, details, and submit carrier bids.</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

    </DashboardShell>
  );
}
