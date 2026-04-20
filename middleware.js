import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/signin', '/signup', '/forgot-password', '/reset-password'];

// Define protected route prefixes and their allowed roles
const ROLE_ROUTES = {
  '/coordinator': ['coordinator'],
  '/student': ['student'],
  '/staff': ['professor', 'ta']
};

function getResolvedSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret && process.env.NODE_ENV === "production") {
    console.warn("JWT_SECRET must be set in production.");
  }

  return jwtSecret || "dev-secret-key-change-in-prod";
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // 1. Bypass public static files, api routes, and Next.js internals
  if (
    pathname.includes('.') || 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') // API routes handle their own auth
  ) {
    return NextResponse.next();
  }

  // 2. Check if route is public
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // 3. Extract and Verify Token
  const token = request.cookies.get('auth_token')?.value;
  let payload = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(getResolvedSecret());
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Token invalid or expired
      payload = null;
    }
  }

  // 4. DEV MODE Bypass
  const isDevMode = process.env.DEV_MODE === "true";
  
  if (!payload && !isDevMode) {
    // No valid token and not DEV mode, redirect to signin
    const signInUrl = new URL('/signin', request.url);
    if (pathname !== '/') {
      signInUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  // If in Dev Mode and no payload, we let the API/Page handle it (auth.js DEV_MODE check)
  // But we still want to inject DEV values if they exist, or let headers pass
  const role = payload?.role || (isDevMode ? "coordinator" : null);

  // 5. Role-based Route Protection
  if (role) {
    for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(prefix)) {
        if (!allowedRoles.includes(role)) {
          // User has no access to this role prefix, redirect to their designated home
          if (role === 'coordinator') return NextResponse.redirect(new URL('/coordinator', request.url));
          if (role === 'student') return NextResponse.redirect(new URL('/student/schedule', request.url));
          if (role === 'professor' || role === 'ta') return NextResponse.redirect(new URL('/staff/schedule', request.url));
          return NextResponse.redirect(new URL('/signin', request.url));
        }
        break; // Match found and allowed
      }
    }
  }

  // 6. Inject headers for downstream consumptions (like Server Components or API Routes)
  const response = NextResponse.next();
  
  if (payload) {
    response.headers.set('x-user-id', payload.sub || '');
    response.headers.set('x-user-role', payload.role || '');
    response.headers.set('x-user-email', payload.email || '');
    response.headers.set('x-user-institution', payload.institution || '');
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
