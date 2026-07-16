"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { getStoredLoads, saveStoredLoads } from "@/lib/stateStore";
import { Load, Bid } from "@/lib/mockData";
import { 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  Scale, 
  Truck, 
  Clock, 
  DollarSign, 
  MoreVertical,
  Check,
  X,
  PlusCircle,
  FileCheck2,
  Trash
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BrokerLoads() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  // Form states for new load
  const [shipperName, setShipperName] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationState, setDestinationState] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [rate, setRate] = useState("");
  const [margin, setMargin] = useState("");
  const [weight, setWeight] = useState("");
  const [equipmentType, setEquipmentType] = useState<any>("Dry Van");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setLoads(getStoredLoads());

    const handleStateChange = () => {
      setLoads(getStoredLoads());
    };
    window.addEventListener("loadflow_state_change", handleStateChange);
    return () => window.removeEventListener("loadflow_state_change", handleStateChange);
  }, []);

  const handleCreateLoad = (e: React.FormEvent) => {
    e.preventDefault();
    
    const carrierRate = Number(rate);
    const brokerMargin = Number(margin);
    const newLoad: Load = {
      id: `L-${Math.floor(1000 + Math.random() * 9000)}`,
      shipperName: shipperName || "Independent Shipper",
      carrierName: null,
      originCity,
      originState: originState.toUpperCase(),
      destinationCity,
      destinationState: destinationState.toUpperCase(),
      pickupDate: pickupDate || new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
      rate: carrierRate,
      margin: brokerMargin,
      shipperPrice: carrierRate + brokerMargin,
      status: "posted",
      weightLbs: Number(weight) || 40000,
      equipmentType,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      bids: []
    };

    const updated = [newLoad, ...loads];
    setLoads(updated);
    saveStoredLoads(updated);
    setIsCreateOpen(false);

    // Reset Form
    setShipperName("");
    setOriginCity("");
    setOriginState("");
    setDestinationCity("");
    setDestinationState("");
    setPickupDate("");
    setDeliveryDate("");
    setRate("");
    setMargin("");
    setWeight("");
    setEquipmentType("Dry Van");
    setDescription("");
  };

  const handleAcceptBid = (loadId: string, bidId: string) => {
    const updated = loads.map((load) => {
      if (load.id === loadId) {
        const winningBid = load.bids.find(b => b.id === bidId);
        if (winningBid) {
          // Accept the winning bid, reject the rest
          const updatedBids = load.bids.map(b => ({
            ...b,
            status: b.id === bidId ? ("accepted" as const) : ("rejected" as const)
          }));
          return {
            ...load,
            status: "booked" as const,
            carrierName: winningBid.carrierName,
            rate: winningBid.amount, // Set the agreed carrier rate
            shipperPrice: winningBid.amount + load.margin, // recalculate price
            bids: updatedBids
          };
        }
      }
      return load;
    });
    setLoads(updated);
    saveStoredLoads(updated);
    if (selectedLoad && selectedLoad.id === loadId) {
      setSelectedLoad(updated.find(l => l.id === loadId) || null);
    }
  };

  const handleRejectBid = (loadId: string, bidId: string) => {
    const updated = loads.map((load) => {
      if (load.id === loadId) {
        return {
          ...load,
          bids: load.bids.map(b => b.id === bidId ? { ...b, status: "rejected" as const } : b)
        };
      }
      return load;
    });
    setLoads(updated);
    saveStoredLoads(updated);
    if (selectedLoad && selectedLoad.id === loadId) {
      setSelectedLoad(updated.find(l => l.id === loadId) || null);
    }
  };

  const handleDeleteLoad = (loadId: string) => {
    const updated = loads.filter(l => l.id !== loadId);
    setLoads(updated);
    saveStoredLoads(updated);
    setSelectedLoad(null);
  };

  // Filter loads
  const filteredLoads = loads.filter((load) => {
    const searchString = `${load.id} ${load.originCity} ${load.destinationCity} ${load.shipperName} ${load.carrierName || ""}`.toLowerCase();
    const matchesSearch = searchString.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || load.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardShell activeRole="broker">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Loads & Bids</h1>
          <p className="text-slate-400 mt-1">Create loads, manage carrier bids, and coordinate bookings.</p>
        </div>

        {/* Dialog for Creating Load */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-black text-sm font-semibold rounded-xl px-4 py-2 cursor-pointer shadow-lg shadow-emerald-500/10">
              <Plus className="mr-1.5 h-4 w-4 stroke-[3px]" /> Create Load
            </Button>
          } />
          <DialogContent className="sm:max-w-[550px] bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Create New Load</DialogTitle>
              <DialogDescription className="text-slate-400">
                Provide load specifics to publish to the public carrier board.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLoad} className="space-y-4 py-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="shipper">Shipper Company</Label>
                  <Input 
                    id="shipper" 
                    placeholder="e.g. Anheuser-Busch" 
                    value={shipperName}
                    onChange={(e) => setShipperName(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="origin-city">Origin City</Label>
                  <Input 
                    id="origin-city" 
                    placeholder="e.g. Savannah" 
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="origin-state">Origin State</Label>
                  <Input 
                    id="origin-state" 
                    placeholder="e.g. GA" 
                    value={originState}
                    onChange={(e) => setOriginState(e.target.value)}
                    maxLength={2}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dest-city">Destination City</Label>
                  <Input 
                    id="dest-city" 
                    placeholder="e.g. Dallas" 
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dest-state">Destination State</Label>
                  <Input 
                    id="dest-state" 
                    placeholder="e.g. TX" 
                    value={destinationState}
                    onChange={(e) => setDestinationState(e.target.value)}
                    maxLength={2}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pickup">Pickup Date</Label>
                  <Input 
                    id="pickup" 
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20 text-slate-300"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delivery">Delivery Date</Label>
                  <Input 
                    id="delivery" 
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20 text-slate-300"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rate">Carrier Offer Rate ($)</Label>
                  <Input 
                    id="rate" 
                    type="number"
                    placeholder="e.g. 2200" 
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="margin">Broker Target Margin ($)</Label>
                  <Input 
                    id="margin" 
                    type="number"
                    placeholder="e.g. 400" 
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input 
                    id="weight" 
                    type="number"
                    placeholder="e.g. 45000" 
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="equipment">Equipment Type</Label>
                  <Select value={equipmentType} onValueChange={(val: any) => setEquipmentType(val)}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-300">
                      <SelectValue placeholder="Select Equipment" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="Dry Van">Dry Van</SelectItem>
                      <SelectItem value="Reefer">Reefer</SelectItem>
                      <SelectItem value="Flatbed">Flatbed</SelectItem>
                      <SelectItem value="Power Only">Power Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="desc">Cargo Notes</Label>
                  <Input 
                    id="desc" 
                    placeholder="e.g. Paper rolls. Strap securely. High value cargo." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500/20"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800 mt-6">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsCreateOpen(false)}
                  className="hover:bg-slate-800 text-slate-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg"
                >
                  Publish Load
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search Load ID, routes, shipper or carrier..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-sm focus-visible:ring-emerald-500/20"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-sm">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="posted">Posted (Bidding)</SelectItem>
            <SelectItem value="booked">Booked (Scheduled)</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed (Paid)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Split view or Table layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Loads List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredLoads.length > 0 ? (
            filteredLoads.map((load) => {
              const isActive = selectedLoad?.id === load.id;
              const hasBids = load.bids.length > 0;
              return (
                <div 
                  key={load.id}
                  onClick={() => setSelectedLoad(load)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isActive 
                      ? "border-emerald-500 bg-slate-900/60 shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)]" 
                      : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{load.id}</span>
                        <span className="text-xs text-slate-500 font-medium">• {load.shipperName}</span>
                        <Badge className={`text-[10px] capitalize font-semibold px-2 py-0.5 ${
                          load.status === "posted" ? "bg-blue-500/10 text-blue-400 border-blue-500/20 border" :
                          load.status === "booked" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border" :
                          load.status === "in_transit" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 border" :
                          load.status === "delivered" ? "bg-purple-500/10 text-purple-400 border-purple-500/20 border" :
                          "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {load.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {/* Route Details */}
                      <div className="flex items-center gap-2 text-slate-300 font-bold text-sm mt-2.5">
                        <MapPin size={15} className="text-emerald-400" />
                        <span>{load.originCity}, {load.originState}</span>
                        <span className="text-slate-500 font-normal">➔</span>
                        <span>{load.destinationCity}, {load.destinationState}</span>
                      </div>

                      {/* Info Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          Pickup: {load.pickupDate}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Scale size={13} className="text-slate-500" />
                          {load.weightLbs.toLocaleString()} lbs
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Truck size={13} className="text-slate-500" />
                          {load.equipmentType}
                        </span>
                      </div>
                    </div>

                    {/* Financial details */}
                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t border-slate-800 sm:border-0 pt-2.5 sm:pt-0 mt-2.5 sm:mt-0 gap-1.5">
                      <div>
                        <p className="text-xs text-slate-500 text-left sm:text-right">Rate Confirmation</p>
                        <p className="text-lg font-black text-white">${load.shipperPrice.toLocaleString()}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-slate-500">Margin: <strong className="text-emerald-400">${load.margin}</strong></p>
                        {hasBids && load.status === "posted" && (
                          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0 mt-1">
                            {load.bids.filter(b => b.status === "pending").length} Pending Bids
                          </Badge>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <Card className="bg-slate-900/30 border-slate-800 py-12 text-center">
              <CardContent className="flex flex-col items-center">
                <Truck className="h-10 w-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">No Loads Found</p>
                <p className="text-xs text-slate-500 mt-1">Adjust search query or create a new load dispatch.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Load Details Panel */}
        <div className="space-y-6">
          {selectedLoad ? (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm sticky top-6">
              <CardHeader className="border-b border-slate-800/80 pb-4 flex flex-row justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-white">{selectedLoad.id}</CardTitle>
                    <Badge variant="outline" className="text-[10px] capitalize">{selectedLoad.status}</Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-1">Shipper: {selectedLoad.shipperName}</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteLoad(selectedLoad.id)}
                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                >
                  <Trash size={16} />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Route Summary */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route & Schedule</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                      <p className="text-[10px] text-slate-500">Origin</p>
                      <p className="text-sm font-bold text-slate-200 mt-1">{selectedLoad.originCity}, {selectedLoad.originState}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar size={10} />
                        {selectedLoad.pickupDate}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                      <p className="text-[10px] text-slate-500">Destination</p>
                      <p className="text-sm font-bold text-slate-200 mt-1">{selectedLoad.destinationCity}, {selectedLoad.destinationState}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar size={10} />
                        {selectedLoad.deliveryDate}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="space-y-3.5 border-t border-slate-800/40 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo Details</h4>
                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div className="text-slate-400">Equipment Type:</div>
                    <div className="text-slate-200 font-bold text-right">{selectedLoad.equipmentType}</div>
                    <div className="text-slate-400">Weight:</div>
                    <div className="text-slate-200 font-bold text-right">{selectedLoad.weightLbs.toLocaleString()} lbs</div>
                    <div className="text-slate-400">Created At:</div>
                    <div className="text-slate-500 font-medium text-right">{selectedLoad.createdAt}</div>
                  </div>
                  {selectedLoad.description && (
                    <div className="p-3 bg-slate-950/30 text-xs text-slate-400 rounded-xl italic">
                      Note: "{selectedLoad.description}"
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="space-y-3.5 border-t border-slate-800/40 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Breakdown</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div className="text-slate-400">Shipper Pays:</div>
                    <div className="text-slate-200 font-bold text-right">${selectedLoad.shipperPrice.toLocaleString()}</div>
                    <div className="text-slate-400">Carrier Paid Rate:</div>
                    <div className="text-slate-200 font-bold text-right">${selectedLoad.rate.toLocaleString()}</div>
                    <div className="text-slate-400">Broker Margin:</div>
                    <div className="text-emerald-400 font-bold text-right">${selectedLoad.margin.toLocaleString()}</div>
                  </div>
                </div>

                {/* Bidding Manager */}
                <div className="space-y-3.5 border-t border-slate-800/40 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incoming Bids ({selectedLoad.bids.length})</h4>
                  
                  {selectedLoad.status === "posted" ? (
                    selectedLoad.bids.length > 0 ? (
                      <div className="space-y-3">
                        {selectedLoad.bids.map((bid) => {
                          const isDeclined = bid.status === "rejected";
                          return (
                            <div 
                              key={bid.id} 
                              className={`p-3 rounded-xl border flex items-center justify-between transition-opacity ${
                                isDeclined ? "border-slate-900 bg-slate-950/20 opacity-50" : "border-slate-800 bg-slate-950/40"
                              }`}
                            >
                              <div>
                                <p className="text-sm font-bold text-white">{bid.carrierName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-500 font-medium">MC: {bid.carrierMc}</span>
                                  <span className="text-[10px] text-amber-400 font-bold">★ {bid.rating}</span>
                                </div>
                                <p className="text-base font-black text-slate-200 mt-2">${bid.amount.toLocaleString()}</p>
                              </div>
                              {!isDeclined && (
                                <div className="flex gap-2">
                                  <Button 
                                    size="icon" 
                                    onClick={() => handleRejectBid(selectedLoad.id, bid.id)}
                                    className="h-8 w-8 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg cursor-pointer"
                                  >
                                    <X size={14} />
                                  </Button>
                                  <Button 
                                    size="icon"
                                    onClick={() => handleAcceptBid(selectedLoad.id, bid.id)}
                                    className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg cursor-pointer"
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                        <Clock size={20} className="mx-auto text-slate-600 mb-1.5" />
                        <p className="text-xs text-slate-500 font-medium">Awaiting Carrier bids...</p>
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-emerald-950/15 border border-emerald-500/10 rounded-xl text-xs text-emerald-400 flex items-center gap-2.5">
                      <FileCheck2 size={16} />
                      <div>
                        <p className="font-bold">Booked Carrier</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{selectedLoad.carrierName || "Pending allocation"}</p>
                      </div>
                    </div>
                  )}

                </div>

              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/20 border-slate-800 py-20 text-center sticky top-6">
              <CardContent className="flex flex-col items-center">
                <MapPin className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Select a Load</p>
                <p className="text-xs text-slate-500 mt-1">Click on any load from the list to view its configuration, breakdown, and bid management panel.</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

    </DashboardShell>
  );
}
