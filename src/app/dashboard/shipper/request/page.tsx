"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { getStoredLoads, saveStoredLoads } from "@/lib/stateStore";
import { Load } from "@/lib/mockData";
import { 
  PlusCircle, 
  MapPin, 
  Calendar, 
  Scale, 
  Truck, 
  DollarSign, 
  ArrowLeft,
  ChevronRight,
  FileCheck2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ShipperRequest() {
  const router = useRouter();

  // Form states
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationState, setDestinationState] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [budgetRate, setBudgetRate] = useState("");
  const [weight, setWeight] = useState("");
  const [equipmentType, setEquipmentType] = useState<any>("Dry Van");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);

  const SHIPPER_NAME = "Cargill Agriculture";

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();

    const price = Number(budgetRate);
    
    // Auto calculate Broker margin (15%) and carrier offer rate
    const margin = Math.round(price * 0.15);
    const rate = price - margin;

    const newLoad: Load = {
      id: `L-${Math.floor(1000 + Math.random() * 9000)}`,
      shipperName: SHIPPER_NAME,
      carrierName: null,
      originCity,
      originState: originState.toUpperCase(),
      destinationCity,
      destinationState: destinationState.toUpperCase(),
      pickupDate: pickupDate || new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
      rate,
      margin,
      shipperPrice: price,
      status: "posted",
      weightLbs: Number(weight) || 42000,
      equipmentType,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      bids: []
    };

    const currentLoads = getStoredLoads();
    const updated = [newLoad, ...currentLoads];
    saveStoredLoads(updated);

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      router.push("/dashboard/shipper");
    }, 1500);
  };

  return (
    <DashboardShell activeRole="shipper">
      
      {/* Back button */}
      <div className="mb-6">
        <button 
          onClick={() => router.push("/dashboard/shipper")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Cargo List
        </button>
      </div>

      {/* Form Container */}
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-900/40 border-slate-800">
          
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <PlusCircle className="text-amber-400 h-5 w-5" />
              Request Cargo Shipment Dispatch
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Provide cargo details and schedule parameters. Our brokers will match a certified compliant carrier immediately.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Origin */}
                <div className="space-y-1.5">
                  <Label htmlFor="origin-city">Origin City</Label>
                  <Input 
                    id="origin-city" 
                    placeholder="e.g. Chicago"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="origin-state">Origin State</Label>
                  <Input 
                    id="origin-state" 
                    placeholder="e.g. IL"
                    value={originState}
                    onChange={(e) => setOriginState(e.target.value)}
                    maxLength={2}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20"
                    required
                  />
                </div>

                {/* Destination */}
                <div className="space-y-1.5">
                  <Label htmlFor="dest-city">Destination City</Label>
                  <Input 
                    id="dest-city" 
                    placeholder="e.g. Savannah"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dest-state">Destination State</Label>
                  <Input 
                    id="dest-state" 
                    placeholder="e.g. GA"
                    value={destinationState}
                    onChange={(e) => setDestinationState(e.target.value)}
                    maxLength={2}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20"
                    required
                  />
                </div>

                {/* Dates */}
                <div className="space-y-1.5">
                  <Label htmlFor="pickup">Target Pickup Date</Label>
                  <Input 
                    id="pickup" 
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-300 focus-visible:ring-amber-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery">Target Delivery Date</Label>
                  <Input 
                    id="delivery" 
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-300 focus-visible:ring-amber-500/20"
                    required
                  />
                </div>

                {/* Rates / Cargo */}
                <div className="space-y-1.5">
                  <Label htmlFor="budget">Maximum Budget Rate ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                    <Input 
                      id="budget" 
                      type="number"
                      placeholder="e.g. 2500"
                      value={budgetRate}
                      onChange={(e) => setBudgetRate(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Cargo Weight (lbs)</Label>
                  <Input 
                    id="weight" 
                    type="number"
                    placeholder="e.g. 43000"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20"
                    required
                  />
                </div>

                {/* Equipment Selection */}
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="equipment">Trailer Type Required</Label>
                  <Select value={equipmentType} onValueChange={(val: any) => setEquipmentType(val)}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-300">
                      <SelectValue placeholder="Select Trailer" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                      <SelectItem value="Dry Van">Dry Van</SelectItem>
                      <SelectItem value="Reefer">Reefer</SelectItem>
                      <SelectItem value="Flatbed">Flatbed (Oversized allowed)</SelectItem>
                      <SelectItem value="Power Only">Power Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="desc">Specific Cargo Description / Handling Instructions</Label>
                  <Input 
                    id="desc" 
                    placeholder="e.g. Food grade wheat bags. Tarp required."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-amber-500/20"
                  />
                </div>

              </div>

              {success && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 animate-pulse">
                  <FileCheck2 size={16} /> Load published! Redirecting...
                </div>
              )}

              <div className="border-t border-slate-800/80 pt-4 mt-6 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => router.push("/dashboard/shipper")}
                  className="hover:bg-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black font-semibold rounded-xl px-6"
                >
                  Publish Shipping Request
                </Button>
              </div>

            </form>
          </CardContent>

        </Card>
      </div>

    </DashboardShell>
  );
}
