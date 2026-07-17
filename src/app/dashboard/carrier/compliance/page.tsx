"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { supabase, mapDbComplianceToUiCompliance } from "@/lib/supabase";
import { CarrierCompliance } from "@/lib/mockData";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Upload, 
  FileCheck2, 
  Calendar,
  AlertTriangle,
  Scale,
  Award,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CarrierCompliancePage() {
  const [myCompliance, setMyCompliance] = useState<CarrierCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form states for document renewal
  const [cargoLimit, setCargoLimit] = useState("");
  const [autoLimit, setAutoLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [w9Uploaded, setW9Uploaded] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    const fetchCompliance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("carrier_compliance")
        .select(`
          *,
          carrier:profiles(company_name, full_name)
        `)
        .eq("carrier_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching compliance:", error);
      } else if (data) {
        const mapped = mapDbComplianceToUiCompliance(data);
        setMyCompliance(mapped);
        setCargoLimit(mapped.cargoLimit.toString());
        setAutoLimit(mapped.autoLimit.toString());
        setExpiryDate(mapped.insuranceExpiration);
        setW9Uploaded(mapped.w9Status === "verified");
      }
      setLoading(false);
    };

    fetchCompliance();

    const channel = supabase
      .channel("carrier_compliance_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "carrier_compliance" }, () => {
        fetchCompliance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCompliance) return;

    const cargoVal = Number(cargoLimit);
    const autoVal = Number(autoLimit);
    
    // Auto-calculate compliance status based on inputs
    // Requirements: Auto liability >= $1,000,000, Cargo limit >= $100,000, Expiration date is in the future
    const today = new Date();
    const expiry = new Date(expiryDate);
    const isExpiryValid = expiry > today;
    const isAutoValid = autoVal >= 1000000;
    const isCargoValid = cargoVal >= 100000;

    const isCompliant = isExpiryValid && isAutoValid && isCargoValid && w9Uploaded;

    setSaveError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("carrier_compliance")
      .update({
        cargo_limit: cargoVal,
        auto_limit: autoVal,
        insurance_expiration: expiryDate,
        insurance_status: isCompliant ? "compliant" : "non_compliant",
        w9_status: w9Uploaded ? "verified" : "pending_review"
      })
      .eq("carrier_id", user.id);

    if (error) {
      console.error("Error updating compliance:", error);
      setSaveError(error.message || "Failed to update compliance credentials.");
    } else {
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <DashboardShell activeRole="carrier">
        <p className="text-slate-400 text-sm">Loading compliance credentials...</p>
      </DashboardShell>
    );
  }

  if (!myCompliance) {
    return (
      <DashboardShell activeRole="carrier">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="h-12 w-12 text-slate-600 mb-4" />
          <h2 className="text-lg font-bold text-white mb-1">No Compliance Record Found</h2>
          <p className="text-slate-400 text-sm max-w-sm">
            Your compliance profile hasn&apos;t been created yet. This usually happens automatically on signup.
            Please contact your broker administrator.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const isFullyCompliant = myCompliance.insuranceStatus === "compliant" && myCompliance.w9Status === "verified";

  return (
    <DashboardShell activeRole="carrier">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Compliance Portal</h1>
        <p className="text-slate-400 mt-1">Manage safety ratings, insurance policies, and tax documents required for dispatching.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column - Current Status Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Indicator */}
          <Card className="bg-slate-900/40 border-slate-800 relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-white">Authority Standing</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Verify your active operational credentials.</CardDescription>
              </div>
              {isFullyCompliant ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs">
                  <ShieldCheck size={16} /> Compliant
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-xs animate-pulse">
                  <ShieldAlert size={16} /> Blocked Account
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                
                {/* W9 Status */}
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${myCompliance.w9Status === "verified" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    <FileCheck2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">W-9 Form</p>
                    <p className="text-sm font-bold text-slate-200 mt-0.5 capitalize">{myCompliance.w9Status.replace("_", " ")}</p>
                  </div>
                </div>

                {/* Insurance Status */}
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${myCompliance.insuranceStatus === "compliant" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Insurance</p>
                    <p className="text-sm font-bold text-slate-200 mt-0.5 capitalize">{myCompliance.insuranceStatus.replace("_", " ")}</p>
                  </div>
                </div>

                {/* FMCSA Rating */}
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">FMCSA Status</p>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">{myCompliance.safetyRating}</p>
                  </div>
                </div>

              </div>

              {!isFullyCompliant && (
                <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/5 text-amber-400 text-xs mt-6 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Required Actions to Unlock Account:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      {myCompliance.w9Status !== "verified" && <li>Upload signed W-9 tax document form.</li>}
                      {myCompliance.autoLimit < 1000000 && <li>Auto Liability insurance must meet $1,000,000 minimum limit.</li>}
                      {new Date(myCompliance.insuranceExpiration) < new Date() && <li>Renew expired insurance document (current expiry: {myCompliance.insuranceExpiration}).</li>}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Checklist and Requirements info */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-cyan-400" />
                Brokerage Compliance Standards
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Verify your limits match standard requirements below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-850">
                <span>Minimum Cargo Insurance</span>
                <span className="font-bold text-slate-200">$100,000 USD</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-850">
                <span>Minimum Auto Liability Limit</span>
                <span className="font-bold text-slate-200">$1,000,000 USD</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-850">
                <span>Safety Rating (FMCSA)</span>
                <span className="font-bold text-emerald-400">Satisfactory</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span>Tax Certification</span>
                <span className="font-bold text-slate-200">Current W-9 Form required</span>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Update / Upload Form */}
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Renew / Upload Credentials</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Submit policy updates to self-certify.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                
                <div className="space-y-1.5">
                  <Label htmlFor="cargo">Cargo Insurance Limit ($)</Label>
                  <Input 
                    id="cargo" 
                    type="number"
                    value={cargoLimit}
                    onChange={(e) => setCargoLimit(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-sm focus-visible:ring-cyan-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auto">Auto Liability Limit ($)</Label>
                  <Input 
                    id="auto" 
                    type="number"
                    value={autoLimit}
                    onChange={(e) => setAutoLimit(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-sm focus-visible:ring-cyan-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expiry">Policy Expiration Date</Label>
                  <Input 
                    id="expiry" 
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-sm text-slate-300 focus-visible:ring-cyan-500/20"
                    required
                  />
                </div>

                <div className="space-y-2 border-t border-slate-800/80 pt-4">
                  <Label className="block mb-1">Signed W-9 Document</Label>
                  {w9Uploaded ? (
                    <div className="p-3 bg-emerald-950/10 border border-emerald-500/15 text-emerald-400 text-xs rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <FileCheck2 size={14} /> w9_signed_pdf.pdf
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setW9Uploaded(false)}
                        className="text-[10px] text-red-400 hover:underline font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setW9Uploaded(true)}
                      className="w-full border-slate-800 hover:bg-slate-900 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer text-slate-400"
                    >
                      <Upload size={14} /> Upload Signed W-9 Form
                    </Button>
                  )}
                </div>

                {saveError && (
                  <div className="p-3 rounded-xl bg-red-950/15 border border-red-500/20 text-red-400 text-xs font-semibold">
                    ⚠ {saveError}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/10 text-emerald-400 text-xs font-semibold text-center animate-fade-in">
                    ✓ Credentials updated successfully!
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-black font-semibold rounded-xl text-sm py-2 shadow-lg shadow-cyan-500/10 cursor-pointer mt-4"
                >
                  Apply Certificate Updates
                </Button>

              </form>
            </CardContent>
          </Card>
        </div>

      </div>

    </DashboardShell>
  );
}
