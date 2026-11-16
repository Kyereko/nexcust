/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  transpilePackages: ['@nexcust/contracts'],
  // /api/* is proxied to the API by middleware.ts (adds the gateway secret and real client IP).
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }];
  },
};
