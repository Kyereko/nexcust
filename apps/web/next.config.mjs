/** @type {import('next').NextConfig} */
const api = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
export default {
  poweredByHeader: false,
  transpilePackages: ['@nexcust/contracts'],
  // Same-origin proxy: the browser only ever talks to the web origin, so the session cookie is first-party.
  async rewrites() { return [{ source: '/api/:path*', destination: `${api}/api/:path*` }]; },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }];
  },
};
