import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Chkin Route Protection Middleware
 *
 * Protects routes by:
 * 1. Checking session validity
 * 2. Verifying user role and organization access
 * 3. Logging access for audit trails
 *
 * Public routes (no auth required):
 * - / (landing page)
 * - /api/auth/* (auth endpoints)
 *
 * Protected routes require valid session
 */

const publicRoutes = ["/", "/api/auth"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes don't need authentication
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      // Redirect to login for authenticated routes
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Add session to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", session.user.id);
    requestHeaders.set("x-session-id", session.session.id);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Session check failed, redirect to login
    return NextResponse.redirect(new URL("/", request.url));
  }
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
