import { NextRequest, NextResponse } from "next/server";
import { verifyJwtToken } from "./utils/verifyJwtToken";

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

const adminOnlyApiPrefixes: string[] = [
  "/api/admin/notification-devices",
  "/api/users",
  "/api/admin/team",
  "/api/connect",
  "/api/notifications/send",
  "/api/notifications/broadcast",
  "/api/notifications/admin-task-reminders",
  "/api/sendemail",
  "/api/images",
  "/api/userphotos",
  "/api/scheduleRegistration",
  "/api/donationsRecord",
  "/api/donations",
  "/api/volunteer",
  "/api/mantra-diksha",
  "/api/seva-tasks",
  "/api/smart-notes",
];

const adminOnlyMutationPrefixes: string[] = [
  "/api/donate",
  "/api/events",
  "/api/schedule",
  "/api/articles",
  "/api/podcasts",
  "/api/videoseries",
  "/api/allbooks",
  "/api/glimpse",
  "/api/printmedia",
  "/api/livestream",
  "/api/tv-schedule",
  "/api/mantra-diksha",
  "/api/daily-vichar",
  "/api/daily-events",
  "/api/bookedroom",
  "/api/roombooking",
];

const superadminOnlyApiPrefixes: string[] = [
  "/api/users/permissions",
  "/api/users/all-permissions",
];

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

function hasPathPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

function isAdminRole(role: string | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

function isSuperadminRole(role: string | undefined): boolean {
  return role === "superadmin";
}

function getRoleFromTokenPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const role = (payload as { role?: unknown }).role;
  return typeof role === "string" ? role.toLowerCase() : undefined;
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
  const role = getRoleFromTokenPayload(verifiedToken);

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
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...(allowedOrigins.includes(origin) && { "Access-Control-Allow-Origin": origin }),
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }

    const isMutationMethod = method !== "GET" && method !== "HEAD";
    const requiresSuperadmin = hasPathPrefix(pathname, superadminOnlyApiPrefixes);
    const requiresAdmin =
      hasPathPrefix(pathname, adminOnlyApiPrefixes) ||
      (isMutationMethod && hasPathPrefix(pathname, adminOnlyMutationPrefixes));

    if (requiresSuperadmin && !isSuperadminRole(role)) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden", message: "Superadmin access required" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...(allowedOrigins.includes(origin) && { "Access-Control-Allow-Origin": origin }),
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }

    if (!requiresSuperadmin && requiresAdmin && !isAdminRole(role)) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden", message: "Admin access required" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...(allowedOrigins.includes(origin) && { "Access-Control-Allow-Origin": origin }),
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }
  }

  return res;
}

export const config = {
  matcher: ["/", "/signin", "/dashboard/:path*", "/api/:path*"],
};
