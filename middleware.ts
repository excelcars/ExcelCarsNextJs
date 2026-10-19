import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isPublicVehiclePage = pathname.startsWith("/vehicle/");
  const isPublicFeedbackPage = pathname.startsWith("/feedback/");

  if (isPublicVehiclePage || isPublicFeedbackPage) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // Always allow the login page. A browser can still carry a JWT that has
  // been revoked server-side (for example after a password change); the
  // server auth callback rejects it, while middleware can only see that a
  // cookie exists. Redirecting login back to the dashboard would loop.
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|vehicle/|feedback/|_next/static|_next/image|favicon.ico|logo-excel-car.png|login-hero-car.png|login-hero-drift.mp4).*)"],
};
