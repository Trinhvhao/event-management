import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // If it's a dashboard path, check for auth
    if (pathname.startsWith('/dashboard')) {
        // In Next.js, server proxy cannot access localStorage.
        // Auth verification is handled in client components with persisted state.
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const proxyConfig = {
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