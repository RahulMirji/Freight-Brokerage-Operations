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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardShell from "@/components/DashboardShell";
import WrongPortalBannerWrapper from "@/components/WrongPortalBanner";
import { supabase, mapDbLoadToUiLoad, mapDbComplianceToUiCompliance } from "@/lib/supabase";
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
  const [loading, setLoading] = useState(true);
  const [latestRateConfirmation, setLatestRateConfirmation] = useState<any>(null);

  // New tab state
  const [activeTab, setActiveTab] = useState<"overview" | "staff">("overview");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  
  // Custom Role Form state
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState("");

  const PERMISSIONS_CATALOG = [
    { key: "load.update_status", label: "Update Dispatch Status" },
    { key: "pod.upload", label: "Upload Proof of Delivery" },
    { key: "rate.confirm", label: "Sign Rate Confirmations" },
    { key: "staff.manage", label: "Manage Organization Staff" },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setUserProfile(data);
    };
    fetchProfile();
  }, []);

  const fetchStaffAndRoles = async () => {
    if (!userProfile?.org_id) return;

    // 1. Fetch Staff profiles
    const { data: staff } = await supabase
      .from("profiles")
      .select(`
        *,
        role_ref:roles(name)
      `)
      .eq("org_id", userProfile.org_id);
    if (staff) setStaffList(staff);

    // 2. Fetch Roles
    const { data: roles } = await supabase
      .from("roles")
      .select("*")
      .eq("org_id", userProfile.org_id);
    if (roles) setRolesList(roles);
  };

  useEffect(() => {
    fetchStaffAndRoles();
  }, [userProfile]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName || !userProfile?.org_id) return;

    const { error } = await supabase
      .from("roles")
      .insert({
        org_id: userProfile.org_id,
        name: roleName,
        permissions: selectedPermissions
      });

    if (error) {
      console.error("Error creating role:", error);
      alert(error.message || "Failed to create role.");
    } else {
      setRoleName("");
      setSelectedPermissions([]);
      fetchStaffAndRoles();
    }
  };

  const handleGenerateInvite = (roleId: string | null) => {
    if (!roleId || !userProfile?.org_id) return;
    const link = `${window.location.origin}/signup?org_id=${userProfile.org_id}&role_id=${roleId}`;
    setInviteLink(link);
  };

  useEffect(() => {
    let channel: any;

    const fetchCarrierData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch compliance standing
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

      // 2. Fetch assigned loads
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
        .eq("carrier_id", user.id)
        .order("created_at", { ascending: false });

      if (loadsData) {
        setLoads(loadsData.map(mapDbLoadToUiLoad));
      }
      setLoading(false);
    };

    fetchCarrierData();

    channel = supabase
      .channel("carrier_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, () => {
        fetchCarrierData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "carrier_compliance" }, () => {
        fetchCarrierData();
      })
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Filter loads assigned to this carrier (already filtered on fetch, but keep variable name)
  const myLoads = loads;
  
  // Metrics
  const activeRuns = myLoads.filter(l => ["booked", "in_transit", "delivered"].includes(l.status));
  const totalRevenue = myLoads
    .filter(l => ["booked", "in_transit", "delivered", "completed"].includes(l.status))
    .reduce((acc, curr) => acc + curr.rate, 0);

  // Status transitions
  const handleTransitionStatus = async (loadId: string, currentStatus: string) => {
    const load = loads.find(l => l.id === loadId);
    if (!load || !(load as any).db_id) return;

    let nextStatus: Load["status"] = "booked";
    if (currentStatus === "booked") nextStatus = "in_transit";
    else if (currentStatus === "in_transit") nextStatus = "delivered";
    else if (currentStatus === "delivered") nextStatus = "completed";

    const { error } = await supabase
      .from("loads")
      .update({ status: nextStatus })
      .eq("id", (load as any).db_id);

    if (error) {
      console.error("Error updating status:", error);
    }
  };

  useEffect(() => {
    const fetchLatestRateConf = async () => {
      if (!signingLoad || !(signingLoad as any).db_id) {
        setLatestRateConfirmation(null);
        return;
      }
      const { data } = await supabase
        .from("rate_confirmations")
        .select("*")
        .eq("load_id", (signingLoad as any).db_id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setLatestRateConfirmation(data);
      }
    };
    fetchLatestRateConf();
  }, [signingLoad]);

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingLoad || !(signingLoad as any).db_id) return;

    if (latestRateConfirmation) {
      const { error: confError } = await supabase
        .from("rate_confirmations")
        .update({
          status: "signed",
          carrier_signature: signatureName,
          signed_at: new Date().toISOString()
        })
        .eq("id", latestRateConfirmation.id);
      if (confError) {
        console.error("Error signing rate confirmation row:", confError);
      }
    }

    const { error } = await supabase
      .from("loads")
      .update({
        carrier_signature: signatureName,
        signed_at: new Date().toISOString()
      })
      .eq("id", (signingLoad as any).db_id);

    if (error) {
      console.error("Error signing rate confirmation:", error);
    } else {
      setSigningLoad(null);
    }
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

                  {/* POD Uploader */}
                  {load.status !== "booked" && !load.podUrl && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/40">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold">Proof of Delivery (POD) Uploader</Label>
                      <div className="flex gap-2">
                        <Input 
                          id={`pod-input-${load.id}`}
                          placeholder="e.g. POD-signed-bill.pdf" 
                          className="bg-slate-950 border-slate-850 text-xs h-8 focus-visible:ring-cyan-500/20 text-slate-300"
                        />
                        <Button 
                          size="sm"
                          onClick={async () => {
                            const el = document.getElementById(`pod-input-${load.id}`) as HTMLInputElement;
                            const val = el?.value?.trim();
                            if (!val) {
                              alert("Please enter a valid document name.");
                              return;
                            }
                            const { error } = await supabase
                              .from("loads")
                              .update({ pod_url: val })
                              .eq("id", (load as any).db_id);
                            if (error) {
                              alert(error.message);
                            } else {
                              alert("POD uploaded successfully!");
                            }
                          }}
                          className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs px-3 h-8 cursor-pointer"
                        >
                          Upload
                        </Button>
                      </div>
                    </div>
                  )}

                  {load.podUrl && (
                    <div className="mt-4 pt-4 border-t border-slate-800/40 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Uploaded POD:</span>
                      <span className="font-bold text-slate-200">{load.podUrl}</span>
                    </div>
                  )}

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


      {/* Signing rate confirmation Modal */}
      <Dialog open={!!signingLoad} onOpenChange={(open) => !open && setSigningLoad(null)}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-850 pb-4">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-1.5">
              <FileCheck className="text-amber-500" /> Digital Rate Confirmation Confirmation
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Verify freight details and digitally sign to dispatch driver for Load {signingLoad?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 text-xs leading-relaxed text-slate-300">
            {/* Cargo Details Summary */}
            <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-white uppercase text-[10px] tracking-wider mb-2">
                Freight Dispatch Summary {latestRateConfirmation && `(Version ${latestRateConfirmation.version})`}
              </h4>
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-slate-500">Route:</span>
                <span className="text-slate-350 font-semibold text-right">{signingLoad?.originCity}, {signingLoad?.originState} ➔ {signingLoad?.destinationCity}, {signingLoad?.destinationState}</span>
                
                <span className="text-slate-500">Equipment Type:</span>
                <span className="text-slate-350 font-semibold text-right">{signingLoad?.equipmentType}</span>

                <span className="text-slate-500">Weight:</span>
                <span className="text-slate-350 font-semibold text-right">{signingLoad?.weightLbs.toLocaleString()} lbs</span>

                {latestRateConfirmation ? (
                  <>
                    <span className="text-slate-500">Base Carrier Rate:</span>
                    <span className="text-slate-350 font-semibold text-right">${latestRateConfirmation.rate.toLocaleString()}</span>
                    {latestRateConfirmation.tarp_charge > 0 && (
                      <>
                        <span className="text-slate-500">Tarp Charge:</span>
                        <span className="text-slate-350 font-semibold text-right">+${latestRateConfirmation.tarp_charge.toLocaleString()}</span>
                      </>
                    )}
                    {latestRateConfirmation.detention_charge > 0 && (
                      <>
                        <span className="text-slate-500">Detention Charge:</span>
                        <span className="text-slate-350 font-semibold text-right">+${latestRateConfirmation.detention_charge.toLocaleString()}</span>
                      </>
                    )}
                    {latestRateConfirmation.layover_charge > 0 && (
                      <>
                        <span className="text-slate-500">Layover Charge:</span>
                        <span className="text-slate-350 font-semibold text-right">+${latestRateConfirmation.layover_charge.toLocaleString()}</span>
                      </>
                    )}
                    <span className="text-slate-500 font-bold">Grand Total Confirmed Payout:</span>
                    <span className="text-emerald-400 font-extrabold text-right text-sm">${latestRateConfirmation.grand_total.toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">Confirmed Rate Payout:</span>
                    <span className="text-emerald-400 font-extrabold text-right">${signingLoad?.rate.toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>

            {/* Legal binding terms */}
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider pt-2">Contract Binding Clauses</h4>
            <div className="space-y-2 bg-slate-950/20 border border-slate-850/60 p-3 rounded-xl max-h-[140px] overflow-y-auto text-slate-400 leading-normal">
              <p>1. By signing this confirmation, Carrier agrees to pick up and deliver the listed freight at specified schedules.</p>
              <p>2. Payment margin will be paid within 30 days post POD (Proof of Delivery) upload and verification checks.</p>
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
                  I certify that I am authorized to bind {compliance?.companyName || "the carrier"} to this rate confirmation and agree to all terms of this digital contract.
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
