import { NextRequest, NextResponse } from "next/server";
import { verifyJwtToken } from "./utils/verifyJwtToken";
import {
  can,
  isSuperadminOnlyPath,
  permissionsFromTokenPayload,
  resolveApiPermission,
} from "./lib/permissions";

const allowedOrigins = [
  "https://www.avdheshanandg.org",
  "https://www.avdheshanandgmission.org",
  "https://avdheshanandgmission.org",
  "https://avdheshanandg.org",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Public API endpoints that don't require authentication
const publicApiEndpoints: { path: string; methods?: string[] }[] = [
  { path: "/api/creduser" },
  { path: "/api/connect", methods: ["POST"] },
  { path: "/api/volunteer", methods: ["POST"] },
  { path: "/api/mantra-diksha", methods: ["POST"] },
  { path: "/api/webhook" },
  { path: "/api/donate", methods: ["GET"] },
  { path: "/api/create-checkout-session", methods: ["POST"] },
  { path: "/api/create-custom-subs", methods: ["POST"] },
  { path: "/api/events", methods: ["GET"] },
  { path: "/api/schedule", methods: ["GET"] },
  { path: "/api/articles", methods: ["GET"] },
  { path: "/api/podcasts", methods: ["GET"] },
  { path: "/api/videoseries", methods: ["GET"] },
  { path: "/api/allbooks", methods: ["GET"] },
  { path: "/api/glimpse", methods: ["GET"] },
  { path: "/api/printmedia", methods: ["GET"] },
  { path: "/api/talks", methods: ["GET"] },
  { path: "/api/verify-session", methods: ["POST"] },
  { path: "/api/auth/signin", methods: ["POST"] },
  { path: "/api/user/generate-otp", methods: ["POST"] },
  { path: "/api/user/resend-otp", methods: ["POST"] },
  { path: "/api/user/verify-otp", methods: ["POST"] },
  { path: "/api/user/reset-password", methods: ["POST"] },
  { path: "/api/daily-vichar/today", methods: ["GET"] },
  { path: "/api/livestream/active", methods: ["GET"] },
  { path: "/api/tv-schedule", methods: ["GET"] },
  { path: "/api/chat-bot/message", methods: ["POST"] },
  { path: "/api/panchang/today", methods: ["GET"] },
  { path: "/api/panchang/month", methods: ["GET"] },
  { path: "/api/panchang/festivals", methods: ["GET"] },
  { path: "/api/panchang/cities", methods: ["GET"] },
  { path: "/api/notifications/preferences" },
  { path: "/api/cron" },
  { path: "/api/health", methods: ["GET"] },
  { path: "/api/dashboard/stats", methods: ["GET"] },
  { path: "/api/donation-receipt", methods: ["GET"] },
  { path: "/api/donations/recent", methods: ["GET"] },
];

// NOTE: the per-module route map (which API prefix belongs to which module, and
// which reads are public) now lives in `src/lib/permissions.ts` — the single
// source of truth shared by this middleware, the API routes and the admin app.

function isPublicApiEndpoint(pathname: string, method: string): boolean {
  for (const endpoint of publicApiEndpoints) {
    if (pathname === endpoint.path || pathname.startsWith(endpoint.path + "/")) {
      // If no methods specified, all methods are public
      if (!endpoint.methods) return true;
      // Check if current method is in allowed methods
      if (endpoint.methods.includes(method)) return true;
    }
  }
  return false;
}

function denyJson(status: number, error: string, message: string, origin: string) {
  return new NextResponse(JSON.stringify({ error, message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(allowedOrigins.includes(origin) && { "Access-Control-Allow-Origin": origin }),
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  // Preflight CORS: respond early to OPTIONS
  if (method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    if (allowedOrigins.includes(origin)) {
      preflight.headers.set("Access-Control-Allow-Origin", origin);
    }
    preflight.headers.set("Access-Control-Allow-Credentials", "true");
    preflight.headers.set("Access-Control-Allow-Methods", "GET,DELETE,PATCH,POST,PUT");
    preflight.headers.set(
      "Access-Control-Allow-Headers",
"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Sentry-Trace, Baggage"
    );
    return preflight;
  }

  // Normal flow
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : undefined;
  const cookieToken = req.cookies.get("auth_token")?.value || req.cookies.get("token")?.value;
  const token = bearerToken || cookieToken;
  const verifiedToken = token ? await verifyJwtToken(token).catch(() => null) : null;

  const res = NextResponse.next();

  if (allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,DELETE,PATCH,POST,PUT");
  res.headers.set(
    "Access-Control-Allow-Headers",
"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Sentry-Trace, Baggage"
  );

  // Auth redirect logic
  if (pathname.startsWith("/signin") && verifiedToken) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard") && !verifiedToken) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(verifiedToken ? "/dashboard" : "/signin", req.url));
  }

  // Protect API routes that are not public
  if (pathname.startsWith("/api") && !isPublicApiEndpoint(pathname, method)) {
    if (!verifiedToken) {
      return denyJson(401, "Unauthorized", "Authentication required", origin);
    }

    const payload = verifiedToken as {
      adminId?: unknown;
      role?: unknown;
      perms?: unknown;
      permissions?: unknown;
    };

    // Which routes are governed by the module permission system?
    const superadminOnly = isSuperadminOnlyPath(pathname);
    const required = resolveApiPermission(pathname, method);

    if (superadminOnly || required) {
      // CRITICAL: only an ADMIN token may touch a module-governed route.
      // Devotee tokens (issued by /api/creduser/*) carry `userId`, never
      // `adminId`. Without this check a devotee's role would coerce to "viewer"
      // — which can view everything — and they could read /api/users,
      // /api/donations, the prayer inbox, and so on.
      if (payload?.adminId === undefined || payload?.adminId === null) {
        return denyJson(403, "Forbidden", "Admin access required", origin);
      }

      // The token carries the caller's role + (compact) per-module permission map.
      // Falls back to the role template for tokens minted before per-module perms.
      const { role, permissions } = permissionsFromTokenPayload(payload);

      // Superadmin bypasses every check — including the permission map itself, so
      // a superadmin can never lock themselves out.
      if (role !== "superadmin") {
        // Role/permission administration is superadmin-only, always.
        if (superadminOnly) {
          return denyJson(403, "Forbidden", "Superadmin access required", origin);
        }
        if (required && !can(permissions, required.module, required.anyOf)) {
          return denyJson(
            403,
            "Forbidden",
            `You do not have permission to ${required.anyOf.join(" or ")} ${required.module}.`,
            origin
          );
        }
      }
    }
    // Not a module-governed route → any authenticated caller (admin OR devotee),
    // exactly as before. e.g. /api/my-donations, /api/event-registration.
  }

  return res;
}

export const config = {
  matcher: ["/", "/signin", "/dashboard/:path*", "/api/:path*"],
};
