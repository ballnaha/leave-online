import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function proxy(req) {
        // If user is authenticated, allow access
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                // Public routes that don't require authentication
                const publicRoutes = ['/login', '/register', '/forgot-password'];
                
                // API routes that should be accessible
                const publicApiRoutes = [
                    '/api/auth',
                    '/api/companies',
                    '/api/departments',
                    '/api/sections',
                    '/api/upload',
                ];

                // Check if current path is a public route
                const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
                
                // Check if current path is a public API route
                const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

                // Allow public routes and public API routes without authentication
                if (isPublicRoute || isPublicApiRoute) {
                    return true;
                }

                // For all other routes, require authentication
                return !!token;
            },
        },
        pages: {
            signIn: '/login',
        },
    }
);

// Configure which routes the proxy should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         * - uploads folder (user uploaded files)
         */
        '/((?!_next/static|_next/image|favicon.ico|images|uploads|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
    ],
};
