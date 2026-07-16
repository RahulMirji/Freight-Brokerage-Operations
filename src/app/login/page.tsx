"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, ShieldCheck, Truck, Building2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"broker" | "carrier" | "shipper">("broker");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mock Login action
    setTimeout(() => {
      const mockUser = {
        name: role === "broker" ? "Rahul Mirji (Broker)" : role === "carrier" ? "Apex Operations" : "Cargill Logistics",
        email: email || "demo@loadflow.com",
        role: role
      };
      localStorage.setItem("loadflow_user", JSON.stringify(mockUser));
      setLoading(false);
      router.push(`/dashboard/${role}`);
      // Notify layout of login changes
      window.dispatchEvent(new Event("loadflow_state_change"));
    }, 1000);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-slate-100 font-sans">
      {/* Background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[500px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[500px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md px-6">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <Activity className="h-6.5 w-6.5 text-black" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight text-white">
            Load<span className="text-emerald-400">Flow</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">FREIGHT BROKERAGE OPERATIONS SUITE</p>
        </div>

        {/* Card wrapper */}
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white text-center">Sign In</CardTitle>
            <CardDescription className="text-slate-400 text-xs text-center">
              Choose your dashboard role and enter credentials to log in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Role selection Cards */}
              <div className="space-y-2">
                <Label>Operational Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  
                  {/* Broker Selector */}
                  <button
                    type="button"
                    onClick={() => setRole("broker")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      role === "broker" 
                        ? "border-emerald-500 bg-emerald-500/5 text-emerald-400" 
                        : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-750"
                    }`}
                  >
                    <Building2 size={16} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Broker</span>
                  </button>

                  {/* Carrier Selector */}
                  <button
                    type="button"
                    onClick={() => setRole("carrier")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      role === "carrier" 
                        ? "border-cyan-500 bg-cyan-500/5 text-cyan-400" 
                        : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-750"
                    }`}
                  >
                    <Truck size={16} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Carrier</span>
                  </button>

                  {/* Shipper Selector */}
                  <button
                    type="button"
                    onClick={() => setRole("shipper")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      role === "shipper" 
                        ? "border-amber-500 bg-amber-500/5 text-amber-400" 
                        : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-750"
                    }`}
                  >
                    <ShieldCheck size={16} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Shipper</span>
                  </button>

                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20 text-sm"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span className="text-[10px] text-slate-500 hover:text-emerald-400 cursor-pointer">Forgot?</span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950 border-slate-800 pr-10 focus-visible:ring-emerald-500/20 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black font-semibold rounded-xl text-sm py-2 shadow-lg shadow-emerald-500/10 cursor-pointer mt-2"
              >
                {loading ? "Establishing Session..." : "Access Dashboard"}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to Portal Chooser
          </Link>
        </div>

      </main>
    </div>
  );
}
