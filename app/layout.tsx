import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "stonklist.lol — airdrop us your stonk", template: "%s · stonklist.lol" },
  description: "Highest bag in the treasury takes #1. We hodl. You climb. A pay-to-rank leaderboard for StonkFun tokens.",
  openGraph: {
    siteName: "stonklist.lol",
    type: "website",
    title: "stonklist.lol — airdrop us your stonk",
    description: "Highest bag in the treasury takes #1. We hodl. You climb.",
  },
  twitter: { card: "summary_large_image", site: "@stonklist" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistMono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Poppins via <link> so builds work offline; swap to next/font/google on Vercel if you prefer. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 w-full mx-auto max-w-[1200px] px-4 sm:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
