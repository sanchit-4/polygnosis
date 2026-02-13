"use client";

import dynamic from "next/dynamic";

// Force Next.js to skip server-side rendering for the Web3 elements
const Portfolio = dynamic(() => import("./Portfolio"), {
  ssr: false,
});

export default function PortfolioPage() {
  return <Portfolio />;
}