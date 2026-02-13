"use client";

// The standard UI button from the library
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import dynamic from 'next/dynamic';

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      {/* Logo Section */}
      <div className="flex items-center gap-2">
        <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
            Polygnosis
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex gap-6 text-gray-400 font-medium">
        <Link href="/" className="hover:text-white transition">Markets</Link>
        <Link href="/portfolio" className="hover:text-white transition">Portfolio</Link>
        <Link href="/create" className="hover:text-white transition">Create Market</Link>
      </div>

      {/* Wallet Button */}
      {/* This component handles the entire "Connect / Disconnect / Copy Address" logic automatically */}
      <div className="wallet-adapter-button-trigger">
        <WalletMultiButtonDynamic style={{ backgroundColor: '#2563eb' }} />
      </div>
    </nav>
  );
}