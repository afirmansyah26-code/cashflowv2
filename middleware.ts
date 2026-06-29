import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/api/login", "/api/logout", "/api/app-meta", "/api/health"];

function buildRedirect(path: string, request: NextRequest): URL {
  const url = new URL(path, request.url);
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host");
  if (proto) url.protocol = proto + ":";
  if (host) url.host = host;
  return url;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    publicPaths.some((p) => pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(buildRedirect("/login", request));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = payload.role as string;

    // Admin-only routes
    const adminOnlyPaths = ["/pengguna", "/api/users", "/kategori"];
    if (role !== "admin" && adminOnlyPaths.some((p) => pathname.startsWith(p))) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(buildRedirect("/", request));
    }

    if (pathname.startsWith("/api/categories")) {
      if (request.method !== "GET" && role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(buildRedirect("/login", request));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
