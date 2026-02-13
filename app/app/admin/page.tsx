import dynamic from "next/dynamic";

// Dynamically import your Web3 component and force Next.js to skip SSR for it
const AdminClient = dynamic(() => import("./AdminClient"), {
  ssr: false,
});

export default function AdminPage() {
  return <AdminClient />;
}