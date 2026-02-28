import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

// Protect all dashboard routes — login and auth callback are excluded
export const config = {
  matcher: [
    '/scan/:path*',
    '/dashboard/:path*',
    '/vulnerabilities/:path*',
    '/remediation/:path*',
    '/settings/:path*',
  ],
};
