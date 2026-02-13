"use client";

import dynamic from "next/dynamic";

// Force Next.js to skip server-side rendering for the Web3 elements
const CreateClient = dynamic(() => import("./Create"), {
  ssr: false,
});

export default function CreatePage() {
  return <CreateClient />;
}