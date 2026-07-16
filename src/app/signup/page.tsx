"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Activity, Building2, Truck, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import type { UserRole } from "@/lib/supabase";

type Step = "details" | "verify";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  broker: {
    label: "Broker",
    icon: <Building2 size={16} />,
    color: "emerald",
    description: "Manage loads, approve bids, and oversee carrier compliance.",
  },
  carrier: {
    label: "Carrier",
    icon: <Truck size={16} />,
    color: "cyan",
    description: "Bid on available loads, dispatch drivers, and self-certify compliance.",
  },
  shipper: {
    label: "Shipper",
    icon: <ShieldCheck size={16} />,
    color: "amber",
    description: "Post freight loads, track deliveries, and manage shipping budgets.",
  },
};

export default function SignupPage() {
  const [step, setStep] = useState<Step>("details");
  const [role, setRole] = useState<UserRole>("shipper");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // These values get passed to the handle_new_user() trigger via raw_user_meta_data
        data: {
          full_name: fullName,
          company_name: companyName,
          role: role,
        },
        // Supabase will send the verification link to this URL
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(
        signupError.message.includes("already registered")
          ? "An account with this email already exists. Try signing in instead."
          : signupError.message
      );
      setLoading(false);
      return;
    }

    // Success → show verify step
    setStep("verify");
    setLoading(false);
  };

  // ── Verify Email Step ────────────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-slate-100 font-sans">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        <div className="absolute top-1/4 left-1/3 h-[350px] w-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

        <main className="relative z-10 w-full max-w-md px-6 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">
            We sent a verification link to
          </p>
          <p className="text-emerald-400 font-semibold text-sm mb-6">{email}</p>
          <p className="text-slate-500 text-xs leading-relaxed mb-8">
            Click the link in the email to confirm your account. Once verified, you will be automatically redirected to your {ROLE_CONFIG[role].label} dashboard.
          </p>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 mb-6 text-left space-y-1.5">
            <p className="font-semibold text-slate-300">Didn&apos;t receive it?</p>
            <p>• Check your spam or junk folder</p>
            <p>• Make sure <span className="text-slate-300">{email}</span> is correct</p>
            <p>• The link expires in 24 hours</p>
          </div>

          <Link href="/login">
            <Button variant="ghost" className="border border-slate-800 hover:border-slate-700 text-slate-400 rounded-xl w-full">
              Back to Login
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  // ── Registration Form Step ───────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-slate-100 font-sans py-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[500px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md px-6">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <Activity className="h-6 w-6 text-black" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight text-white">
            Load<span className="text-emerald-400">Flow</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium tracking-widest uppercase">Create Your Account</p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white text-center">Get Started</CardTitle>
            <CardDescription className="text-slate-400 text-xs text-center">
              Select your role and fill in your details below.
            </CardDescription>
          </CardHeader>
          <CardContent>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>I am a&hellip;</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => {
                    const cfg = ROLE_CONFIG[r];
                    const isSelected = role === r;
                    const colorMap = {
                      emerald: isSelected ? "border-emerald-500 bg-emerald-500/5 text-emerald-400" : "",
                      cyan: isSelected ? "border-cyan-500 bg-cyan-500/5 text-cyan-400" : "",
                      amber: isSelected ? "border-amber-500 bg-amber-500/5 text-amber-400" : "",
                    };
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? colorMap[cfg.color as keyof typeof colorMap]
                            : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {cfg.icon}
                        <span className="text-[10px] font-bold uppercase tracking-wider mt-1">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 pl-1">{ROLE_CONFIG[role].description}</p>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20 text-sm"
                  required
                  autoComplete="name"
                />
              </div>

              {/* Company Name */}
              <div className="space-y-1.5">
                <Label htmlFor="company-name">
                  Company Name
                  <span className="text-slate-600 font-normal ml-1">(optional)</span>
                </Label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder={
                    role === "broker" ? "e.g. Midwest Freight Brokers LLC" :
                    role === "carrier" ? "e.g. Apex Trucking Inc." :
                    "e.g. Cargill Agriculture"
                  }
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20 text-sm"
                  autoComplete="organization"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email Address</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20 text-sm"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950 border-slate-800 pr-10 focus-visible:ring-emerald-500/20 text-sm"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? password.length >= 12 ? "bg-emerald-500" : password.length >= 8 ? "bg-amber-500" : "bg-red-500"
                          : "bg-slate-800"
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black font-semibold rounded-xl text-sm py-2 shadow-lg shadow-emerald-500/10 cursor-pointer mt-2 disabled:opacity-60"
              >
                {loading ? "Creating Account..." : "Create Account & Verify Email"}
              </Button>

            </form>

            <div className="text-center mt-5">
              <span className="text-xs text-slate-500">Already have an account? </span>
              <Link href="/login" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
                Sign In
              </Link>
            </div>

          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to Portal Chooser
          </Link>
        </div>

      </main>
    </div>
  );
}
