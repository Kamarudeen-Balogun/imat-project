/** @type {import('next').NextConfig} */
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  // Allow phone-on-LAN origin to access dev HMR resources
  // Next expects hostnames here, not full http:// URLs.
  allowedDevOrigins,

  // ── Image Optimization ───────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],   // Serve AVIF first, WebP fallback
    qualities: [75, 80],
    minimumCacheTTL: 60 * 60 * 24 * 30,     // Cache images 30 days
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },

  // ── Compiler ─────────────────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ── Compression ──────────────────────────────────────────────────────────────
  compress: true,

  // ── Experimental ─────────────────────────────────────────────────────────────
  experimental: {
    scrollRestoration: true,
  },

  // ── HTTP Security Headers ─────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent browsers from MIME-sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Block clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Force HTTPS for 2 years, include subdomains
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Limit referrer info to same origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",  // unsafe-eval needed for react-pdf
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://res.cloudinary.com https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              // react-pdf PDFViewer renders preview via a blob iframe.
              "frame-src 'self' blob: https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // Cache images
      {
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
    ];
  },

  // ── Redirects ────────────────────────────────────────────────────────────────
  // Friendly aliases for guessed / legacy URLs (verified: none of these sources
  // exist as routes; the destinations are the real routes).
  async redirects() {
    return [
      { source: "/contact", destination: "/about", permanent: true },
      { source: "/tracker", destination: "/issues", permanent: true },
      { source: "/gallery", destination: "/evidence", permanent: true },
      { source: "/dashboard/analytics", destination: "/portal/analytics", permanent: true },
      { source: "/dashboard/members", destination: "/dashboard/directory", permanent: true },
      { source: "/portal/members", destination: "/members", permanent: true },
      { source: "/dashboard/inbox", destination: "/dashboard/contact-messages", permanent: true },
      { source: "/dashboard/hours", destination: "/dashboard/volunteer", permanent: true },
    ];
  },
};

export default nextConfig;
