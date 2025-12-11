import { NextRequest, NextResponse } from "next/server";

/**
 * Chkin Route Protection Middleware
 *
 * Lightweight middleware that checks for valid session cookie
 * Detailed auth checks are handled in API routes and server components
 *
 * Public routes (no auth required):
 * - / (landing page)
 * - /api/auth/* (auth endpoints)
 *
 * Protected routes require valid session cookie
 */

const publicRoutes = ["/", "/api/auth", "/login", "/register"];
const protectedRoutes = ["/patient", "/provider", "/admin"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isAuthenticated = !!sessionCookie;

  // Auth pages: redirect authenticated users to dashboard
  if (pathname === "/login" || pathname === "/register") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/provider", request.url));
    }
    return NextResponse.next();
  }

  // Public routes don't need authentication
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if accessing protected routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    // Redirect to login if no session
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
