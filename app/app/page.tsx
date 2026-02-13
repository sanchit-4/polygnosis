"use client";

import dynamic from "next/dynamic";

// Force Next.js to skip server-side rendering for the home page
const HomeClient = dynamic(() => import("./HomeClient"), {
  ssr: false,
});

export default function HomePage() {
  return <HomeClient />;
}