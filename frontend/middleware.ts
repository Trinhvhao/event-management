import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public paths that don't require authentication
    const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

    // Check if the path is public
    const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path));

    // If it's a dashboard path, check for auth
    if (pathname.startsWith('/dashboard')) {
        // In Next.js 14+, we can't access localStorage in middleware
        // So we'll handle auth check in the client component
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
    ],
};
