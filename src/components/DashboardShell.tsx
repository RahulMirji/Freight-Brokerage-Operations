"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  Building2, 
  Truck, 
  ShieldCheck, 
  LayoutDashboard, 
  Search, 
  FileCheck2, 
  Package, 
  ChevronDown, 
  Activity, 
  Menu, 
  X, 
  LogOut,
  User,
  PlusCircle,
  FileSpreadsheet,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BROKER_ITEMS: SidebarItem[] = [
  { name: "Overview", href: "/dashboard/broker", icon: LayoutDashboard },
  { name: "Loads & Bids", href: "/dashboard/broker/loads", icon: Package },
  { name: "Carrier Compliance", href: "/dashboard/broker/compliance", icon: FileSpreadsheet },
  { name: "Audit Logs", href: "/dashboard/broker/audit-logs", icon: Clock },
];

const CARRIER_ITEMS: SidebarItem[] = [
  { name: "Fleet Overview", href: "/dashboard/carrier", icon: Truck },
  { name: "Available Loads", href: "/dashboard/carrier/board", icon: Search },
  { name: "My Compliance", href: "/dashboard/carrier/compliance", icon: FileCheck2 },
];

const SHIPPER_ITEMS: SidebarItem[] = [
  { name: "Cargo Tracking", href: "/dashboard/shipper", icon: LayoutDashboard },
  { name: "Request New Load", href: "/dashboard/shipper/request", icon: PlusCircle },
];

interface DashboardShellProps {
  children: React.ReactNode;
  activeRole: "broker" | "carrier" | "shipper";
}

export default function DashboardShell({ children, activeRole }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, company_name, email")
          .eq("id", authUser.id)
          .single();
        
        setUser({
          name: profile?.full_name || profile?.company_name || authUser.email || "User",
          email: profile?.email || authUser.email || "",
        });
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const getMenuItems = () => {
    switch (activeRole) {
      case "broker": return BROKER_ITEMS;
      case "carrier": return CARRIER_ITEMS;
      case "shipper": return SHIPPER_ITEMS;
    }
  };

  const getRoleDetails = () => {
    switch (activeRole) {
      case "broker":
        return { name: "Broker Portal", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "carrier":
        return { name: "Carrier Portal", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
      case "shipper":
        return { name: "Shipper Portal", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
  };

  const handleRoleChange = (role: string | null) => {
    if (role) {
      router.push(`/dashboard/${role}`);
    }
  };

  const menuItems = getMenuItems();
  const roleDetails = getRoleDetails();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-900 bg-slate-950/70 backdrop-blur-md">
        
        {/* Brand Logo */}
        <div className="flex h-16 items-center px-6 gap-2.5 border-b border-slate-900/60">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="h-4.5 w-4.5 text-black" />
          </div>
          <Link href="/" className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Load<span className="text-emerald-400 font-black">Flow</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? "bg-slate-900 text-white shadow-inner border border-slate-800" 
                    : "text-slate-400 hover:text-white hover:bg-slate-900/30"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card / Role Selector */}
        <div className="p-4 border-t border-slate-900 bg-slate-900/20">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name || "Rahul Mirji"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || "demo@loadflow.com"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 justify-start gap-2.5 rounded-lg cursor-pointer"
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* 2. Main Application Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header bar */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md z-30">
          
          {/* Mobile menu trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Title Area & Current Role Tag */}
          <div className="flex items-center gap-3">
            <h2 className="hidden md:block text-lg font-semibold tracking-tight text-white capitalize">
              {pathname.split("/").pop()}
            </h2>
            <div className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${roleDetails.color}`}>
              {roleDetails.name}
            </div>
          </div>

          {/* Quick Role Switcher */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Switch Dashboard:
            </span>
            <Select value={activeRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-[140px] bg-slate-900 border-slate-800 rounded-lg text-xs font-semibold h-9 focus:ring-emerald-500/20">
                <SelectValue placeholder="Select Portal" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="broker" className="text-xs font-semibold hover:bg-slate-800">Broker</SelectItem>
                <SelectItem value="carrier" className="text-xs font-semibold hover:bg-slate-800">Carrier</SelectItem>
                <SelectItem value="shipper" className="text-xs font-semibold hover:bg-slate-800">Shipper</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </header>

        {/* 3. Page Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10">
            {children}
          </div>
        </main>
      </div>

      {/* 4. Mobile Drawer Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          
          {/* Overlay background */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer content */}
          <aside className="relative flex flex-col w-64 bg-slate-950 border-r border-slate-900 p-4">
            <div className="flex h-12 items-center justify-between border-b border-slate-900/60 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-black" />
                </div>
                <span className="font-extrabold text-lg text-white">LoadFlow</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive 
                        ? "bg-slate-900 text-white border border-slate-800" 
                        : "text-slate-400 hover:text-white hover:bg-slate-900/30"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-2 border-t border-slate-900 mt-auto">
              <Link href="/">
                <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-red-400 justify-start gap-2.5">
                  <LogOut size={16} />
                  Exit Portal
                </Button>
              </Link>
            </div>
          </aside>

        </div>
      )}

    </div>
  );
}
