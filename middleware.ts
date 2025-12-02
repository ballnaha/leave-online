import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (login page)
     * - register (register page)
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - OneSignalSDKWorker.js (OneSignal worker)
     * - images (public images)
     * - uploads (public uploads)
     * - api/companies (public companies list)
     * - api/departments (public departments list)
     * - api/sections (public sections list)
     */
    "/((?!login|register|api/auth|api/companies|api/departments|api/sections|_next/static|_next/image|favicon.ico|manifest.json|OneSignalSDKWorker.js|images|uploads).*)",
  ],
};
