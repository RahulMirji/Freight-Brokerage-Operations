import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Maps each dashboard path prefix to the role that is allowed to access it
const ROLE_ROUTE_MAP: Record<string, string> = {
  "/dashboard/broker": "broker",
  "/dashboard/carrier": "carrier",
  "/dashboard/shipper": "shipper",
};

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST run before any redirect logic to keep cookies fresh.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── 1. Unauthenticated: block all /dashboard/* routes ──────────────────────
  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Authenticated: fetch the user's role once ───────────────────────────
  if (user) {
    // Get the role from the JWT metadata instead of a DB query (faster, avoids Edge RLS issues)
    const userRole = user.user_metadata?.role ?? "shipper";

    // ── 3. Block /login and /signup if already signed in ────────────────────
    if (pathname === "/login" || pathname === "/signup") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = `/dashboard/${userRole}`;
      return NextResponse.redirect(dashboardUrl);
    }

    // ── 4. ROLE ENFORCEMENT — the key fix ────────────────────────────────────
    // Check which role this dashboard route requires
    const requiredRole = Object.entries(ROLE_ROUTE_MAP).find(([prefix]) =>
      pathname.startsWith(prefix)
    )?.[1];

    if (requiredRole && requiredRole !== userRole) {
      // User is authenticated but accessing the WRONG portal.
      // Redirect them to their correct dashboard with an error flag.
      const correctUrl = request.nextUrl.clone();
      correctUrl.pathname = `/dashboard/${userRole}`;
      correctUrl.searchParams.set("error", "wrong_portal");
      return NextResponse.redirect(correctUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser favicon)
     * - /auth/callback (Supabase email verification redirect handler)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
