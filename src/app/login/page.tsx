"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Email not confirmed"
          ? "Please verify your email before logging in. Check your inbox for a confirmation link."
          : authError.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : authError.message
      );
      setLoading(false);
      return;
    }

    // Fetch profile to determine which dashboard to redirect to
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role ?? "shipper";
    router.push(`/dashboard/${role}`);
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-slate-100 font-sans">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[500px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[500px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md px-6">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <Activity className="h-6 w-6 text-black" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight text-white">
            Load<span className="text-emerald-400">Flow</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium tracking-widest uppercase">Freight Brokerage Operations Suite</p>
        </div>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-white text-center">Sign In</CardTitle>
            <CardDescription className="text-slate-400 text-xs text-center">
              Enter your credentials to access your portal.
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

            <form onSubmit={handleLogin} className="space-y-4">

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
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
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
                    autoComplete="current-password"
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
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black font-semibold rounded-xl text-sm py-2 shadow-lg shadow-emerald-500/10 cursor-pointer mt-2 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Access Dashboard"}
              </Button>

            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-slate-900 px-3 text-slate-600">New to LoadFlow?</span>
              </div>
            </div>

            <Link href="/signup">
              <Button
                type="button"
                variant="ghost"
                className="w-full border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300 font-semibold rounded-xl text-sm"
              >
                Create an Account
              </Button>
            </Link>

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
