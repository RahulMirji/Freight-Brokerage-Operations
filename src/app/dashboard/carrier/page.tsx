"use client";

import React, { useEffect, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import WrongPortalBannerWrapper from "@/components/WrongPortalBanner";
import { getStoredLoads, saveStoredLoads, getStoredCompliance } from "@/lib/stateStore";
import { Load, CarrierCompliance } from "@/lib/mockData";
import { 
  Truck, 
  DollarSign, 
  ShieldAlert, 
  MapPin, 
  Calendar, 
  Play, 
  CheckCircle,
  FileCheck,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CarrierOverview() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [compliance, setCompliance] = useState<CarrierCompliance | null>(null);
  const [signingLoad, setSigningLoad] = useState<Load | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // For this mock carrier demo, we assume the logged-in carrier is "Apex Trucking Inc."
  const CARRIER_NAME = "Apex Trucking Inc.";

  useEffect(() => {
    setLoads(getStoredLoads());
    const compList = getStoredCompliance();
    const myComp = compList.find(c => c.companyName === CARRIER_NAME) || null;
    setCompliance(myComp);

    const handleStateChange = () => {
      setLoads(getStoredLoads());
      const list = getStoredCompliance();
      setCompliance(list.find(c => c.companyName === CARRIER_NAME) || null);
    };
    window.addEventListener("loadflow_state_change", handleStateChange);
    return () => window.removeEventListener("loadflow_state_change", handleStateChange);
  }, []);

  // Filter loads assigned to this carrier
  const myLoads = loads.filter(l => l.carrierName === CARRIER_NAME);
  
  // Metrics
  const activeRuns = myLoads.filter(l => ["booked", "in_transit", "delivered"].includes(l.status));
  const totalRevenue = myLoads
    .filter(l => ["booked", "in_transit", "delivered", "completed"].includes(l.status))
    .reduce((acc, curr) => acc + curr.rate, 0);

  // Status transitions
  const handleTransitionStatus = (loadId: string, currentStatus: string) => {
    let nextStatus: Load["status"] = "booked";
    if (currentStatus === "booked") nextStatus = "in_transit";
    else if (currentStatus === "in_transit") nextStatus = "delivered";
    else if (currentStatus === "delivered") nextStatus = "completed";

    const updated = loads.map(l => {
      if (l.id === loadId) {
        return { ...l, status: nextStatus };
      }
      return l;
    });

    setLoads(updated);
    saveStoredLoads(updated);
  };

  const handleSignContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingLoad) return;

    const updated = loads.map(l => {
      if (l.id === signingLoad.id) {
        return {
          ...l,
          carrierSignature: signatureName,
          signedAt: new Date().toISOString()
        };
      }
      return l;
    });

    setLoads(updated);
    saveStoredLoads(updated);
    setSigningLoad(null);
  };

  const getStatusButton = (load: Load) => {
    switch (load.status) {
      case "booked":
        if (!load.carrierSignature) {
          return (
            <Button 
              onClick={() => { setSigningLoad(load); setSignatureName(""); setAgreeTerms(false); }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs h-9 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
            >
              <FileCheck size={12} /> Sign Rate Confirmation
            </Button>
          );
        }
        return (
          <Button 
            onClick={() => handleTransitionStatus(load.id, load.status)}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs h-9 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
          >
            <Play size={12} fill="black" /> Dispatch Driver
          </Button>
        );
      case "in_transit":
        return (
          <Button 
            onClick={() => handleTransitionStatus(load.id, load.status)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs h-9 rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <Truck size={12} /> Mark Delivered
          </Button>
        );
      case "delivered":
        return (
          <Button 
            onClick={() => handleTransitionStatus(load.id, load.status)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs h-9 rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle size={12} /> Finalize Complete
          </Button>
        );
      default:
        return (
          <Button variant="outline" className="w-full text-slate-500 border-slate-800 text-xs h-9 rounded-xl" disabled>
            Completed & Paid
          </Button>
        );
    }
  };

  return (
    <DashboardShell activeRole="carrier">
      
      <WrongPortalBannerWrapper />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Fleet Overview</h1>
          <p className="text-slate-400 mt-1">Manage active routes, fleet billings, and check status compliance updates.</p>
        </div>
        <Link href="/dashboard/carrier/board">
          <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/10 transition-all flex items-center gap-1 cursor-pointer">
            Browse Load Board <ChevronRight size={16} />
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        
        {/* Active Runs */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-cyan-500/5 blur-xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Active Runs</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <Truck className="h-4 w-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{activeRuns.length}</div>
            <p className="text-xs text-slate-500 mt-1">Dispatched or booked vehicles</p>
          </CardContent>
        </Card>

        {/* Billings */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Gross Billings</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Earned and pending payout rate</p>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-purple-500/5 blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-400">Compliance Standing</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <FileCheck className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold text-white capitalize flex items-center gap-2">
              {compliance?.insuranceStatus === "compliant" ? (
                <>
                  <span className="text-emerald-400">Compliant</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1 py-0 uppercase">Active</Badge>
                </>
              ) : (
                <>
                  <span className="text-red-400">Action Required</span>
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 uppercase">Hold</Badge>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">FMCSA Status: Satisfactory</p>
          </CardContent>
        </Card>

      </div>

      {/* Active Dispatches Header */}
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Play className="h-4 w-4 text-cyan-400 fill-cyan-400/20" />
        My Active Routes & Dispatches
      </h3>

      {/* Dispatches Grid */}
      {activeRuns.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {activeRuns.map((load) => (
            <Card key={load.id} className="bg-slate-900/40 border-slate-800 overflow-hidden flex flex-col justify-between">
              <div>
                
                {/* Top strip */}
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{load.id}</span>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 capitalize ${
                      load.status === "booked" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                      load.status === "in_transit" ? "border-cyan-500/20 text-cyan-400 bg-cyan-500/5" :
                      "border-slate-700 text-slate-400 bg-slate-800/10"
                    }`}>
                      {load.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <span className="text-sm font-black text-white">${load.rate.toLocaleString()}</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Origin -> Destination */}
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                    <MapPin size={15} className="text-cyan-400" />
                    <span>{load.originCity}, {load.originState}</span>
                    <span className="text-slate-600 font-normal">➔</span>
                    <span>{load.destinationCity}, {load.destinationState}</span>
                  </div>

                  {/* Dates / Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/20 border border-slate-850 p-3 rounded-xl">
                    <div>
                      <p className="text-slate-500 text-[10px]">Pickup Date</p>
                      <p className="font-semibold text-slate-300 mt-0.5">{load.pickupDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px]">Delivery Date</p>
                      <p className="font-semibold text-slate-300 mt-0.5">{load.deliveryDate}</p>
                    </div>
                    <div className="col-span-2 border-t border-slate-800/60 pt-2 mt-1">
                      <p className="text-slate-500 text-[10px]">Cargo details</p>
                      <p className="font-medium text-slate-400 mt-0.5">{load.weightLbs.toLocaleString()} lbs • {load.equipmentType}</p>
                    </div>
                  </div>

                  {/* Status Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      <span>Booked</span>
                      <span>In Transit</span>
                      <span>Delivered</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
                      <div className={`h-full ${
                        load.status === "booked" ? "w-1/3 bg-emerald-500" :
                        load.status === "in_transit" ? "w-2/3 bg-cyan-400" :
                        "w-full bg-purple-500"
                      }`} />
                    </div>
                  </div>

                </div>

              </div>

              {/* Status Update Button */}
              <div className="p-5 border-t border-slate-800 bg-slate-950/20">
                {getStatusButton(load)}
              </div>

            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-900/30 border-slate-800 py-16 text-center">
          <CardContent className="flex flex-col items-center">
            <Truck className="h-12 w-12 text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No Active Runs</p>
            <p className="text-xs text-slate-500 mt-1">You haven't booked any dispatches yet. Head over to the load board to secure loads.</p>
            <Link href="/dashboard/carrier/board" className="mt-4">
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg cursor-pointer">
                Enter Load Board
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

    {/* Digital Rate Confirmation Signature Dialog */}
    <Dialog open={!!signingLoad} onOpenChange={(open) => !open && setSigningLoad(null)}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800/80 pb-4">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileCheck className="text-amber-400 h-5 w-5" />
            Digital Rate Confirmation Contract
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Load ID: {signingLoad?.id} • Route: {signingLoad?.originCity}, {signingLoad?.originState} ➔ {signingLoad?.destinationCity}, {signingLoad?.destinationState}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 text-xs text-slate-300">
          {/* Agreement Terms Box */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 leading-relaxed space-y-3 font-mono">
            <p className="font-bold text-slate-200 border-b border-slate-900 pb-2 text-center uppercase tracking-wider text-[10px]">Contract Agreement terms</p>
            <p>1. The carrier agrees to transport the cargo consisting of <strong className="text-white">{signingLoad?.weightLbs.toLocaleString()} lbs</strong> using a <strong className="text-white">{signingLoad?.equipmentType}</strong> trailer.</p>
            <p>2. Payment for this shipment is set at a flat rate of <strong className="text-emerald-400">${signingLoad?.rate.toLocaleString()} USD</strong>, payable within 30 days of proof-of-delivery (POD) verification.</p>
            <p>3. Carrier certifies all DOT/MC registration, active compliance certifications, and insurance policies are active and up to date.</p>
            <p>4. Falsifying signatures or breach of shipping schedules will result in compliance audits and possible authority holds.</p>
          </div>

          {/* Signature form */}
          <form onSubmit={handleSignContract} className="space-y-4">
            
            <div className="space-y-1.5">
              <Label htmlFor="sig-name">Authorized Signatory Name</Label>
              <Input 
                id="sig-name" 
                placeholder="e.g. John Doe, Dispatch Manager" 
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20 text-sm font-semibold"
                required
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input 
                id="agree-checkbox" 
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                required
              />
              <Label htmlFor="agree-checkbox" className="text-slate-400 select-none cursor-pointer leading-normal">
                I certify that I am authorized to bind {CARRIER_NAME} to this rate confirmation and agree to all terms of this digital contract.
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800 mt-6">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setSigningLoad(null)}
                className="hover:bg-slate-800 text-slate-400"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!agreeTerms || !signatureName}
                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black font-semibold rounded-xl"
              >
                Submit Digital Signature
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  </DashboardShell>
  );
}
