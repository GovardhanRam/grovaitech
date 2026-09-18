import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — only allow framing from same origin
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer information sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict access to browser features — disable what we don't need
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
  },
  // XSS protection for older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
]

const embedHeaders = [
  // Allow framing by external websites for public embed chat
  { key: "Content-Security-Policy", value: "frame-ancestors *" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer information sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict access to browser features — disable what we don't need
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // XSS protection for older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Embeddable routes: allow external iframe embedding
        source: "/embed/:path*",
        headers: embedHeaders,
      },
      {
        // Standard routes: enforce strict clickjacking protection (SAMEORIGIN)
        source: "/((?!embed).*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;

