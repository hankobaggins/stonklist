import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Token art comes from wherever StonkFun stored it (irys, ipfs gateways, stonkfun.xyz…).
    // Routing it through the Next image optimizer serves it from our own origin (cached, resized),
    // so third-party gateway hiccups or hotlink blocks don't leave broken circles.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
  },
};

export default nextConfig;
