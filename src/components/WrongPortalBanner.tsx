"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ShieldX } from "lucide-react";
import { Suspense } from "react";

/**
 * Displays a dismissible banner when the user was redirected from a wrong portal.
 * Reads the `?error=wrong_portal` query param set by the proxy.
 */
function WrongPortalBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error !== "wrong_portal") return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
      <ShieldX className="h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Access Denied — Wrong Portal</p>
        <p className="text-xs text-amber-400/70 mt-0.5">
          Your account is registered as a <strong>Broker</strong>. You were redirected here automatically.
        </p>
      </div>
    </div>
  );
}

export default function WrongPortalBannerWrapper() {
  return (
    <Suspense fallback={null}>
      <WrongPortalBanner />
    </Suspense>
  );
}
