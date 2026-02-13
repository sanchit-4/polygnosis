"use client";

import dynamic from "next/dynamic";

// Force Next.js to skip server-side rendering for the Web3 elements
const MarketClient = dynamic(() => import("./Market"), {
  ssr: false,
});

export default function MarketPageWrapper() {
  return <MarketClient />;
}