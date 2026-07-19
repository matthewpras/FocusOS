import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-ical's dependency chain (rrule-temporal -> @js-temporal/polyfill)
  // breaks when Turbopack bundles it for the server runtime. Run it as a
  // plain Node require instead.
  serverExternalPackages: ["node-ical"],
};

export default nextConfig;
