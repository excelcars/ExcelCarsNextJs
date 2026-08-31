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

  if (isLoggedIn && isLoginPage) {
    const dashboardUrl = new URL("/dashboard", req.nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|vehicle/|feedback/|_next/static|_next/image|favicon.ico|logo-excel-car.png).*)"],
};
