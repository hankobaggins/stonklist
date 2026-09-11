import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "stonklist.lol",
    short_name: "stonklist",
    description: "Airdrop us your stonk. Highest bag in the treasury takes #1.",
    start_url: "/",
    display: "standalone",
    background_color: "#071013",
    theme_color: "#071013",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
