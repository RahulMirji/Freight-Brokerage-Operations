"use client";

import { Load, CarrierCompliance, INITIAL_LOADS, INITIAL_COMPLIANCE } from "./mockData";

export function getStoredLoads(): Load[] {
  if (typeof window === "undefined") return INITIAL_LOADS;
  const stored = localStorage.getItem("loadflow_loads");
  if (!stored) {
    localStorage.setItem("loadflow_loads", JSON.stringify(INITIAL_LOADS));
    return INITIAL_LOADS;
  }
  return JSON.parse(stored);
}

export function saveStoredLoads(loads: Load[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("loadflow_loads", JSON.stringify(loads));
  // Dispatch custom event to notify other tabs/components
  window.dispatchEvent(new Event("loadflow_state_change"));
}

export function getStoredCompliance(): CarrierCompliance[] {
  if (typeof window === "undefined") return INITIAL_COMPLIANCE;
  const stored = localStorage.getItem("loadflow_compliance");
  if (!stored) {
    localStorage.setItem("loadflow_compliance", JSON.stringify(INITIAL_COMPLIANCE));
    return INITIAL_COMPLIANCE;
  }
  return JSON.parse(stored);
}

export function saveStoredCompliance(compliance: CarrierCompliance[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("loadflow_compliance", JSON.stringify(compliance));
  window.dispatchEvent(new Event("loadflow_state_change"));
}
