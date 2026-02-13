
"use client";
import { useState, useEffect } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import Navbar from "../components/Navbar";

// !!! YOUR SPECIFIC ADMIN ADDRESS !!!
const ADMIN_ADDRESS = "HEtRGZPUJX5WVx4aXE9EnDxK4er6ZcajMccaotiZH8Z5";
const COLLATERAL_MINT = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; // Your Custom Token

export default function CreateMarket() {
  const { program } = useProgram();
  const wallet = useWallet();
  const [question, setQuestion] = useState("");
  const [expiry, setExpiry] = useState("");
  
  // State to handle the UI safely
  const [isClient, setIsClient] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1. Safe Client-Side Check
  useEffect(() => {
    setIsClient(true); // We are now in the browser
    if (wallet.publicKey && wallet.publicKey.toString() === ADMIN_ADDRESS) {
        setIsAdmin(true);
    } else {
        setIsAdmin(false);
    }
  }, [wallet.publicKey]);

  const handleCreate = async () => {
    if (!wallet.publicKey) return alert("Connect Wallet");
    if (!question || !expiry) return alert("Fill fields");
    
    try {
        const marketId = new BN(Date.now());
        const endTime = new BN(new Date(expiry).getTime() / 1000);
        
        await program?.methods.createMarket(marketId, question, endTime)
          .accounts({ collateralMint: new PublicKey(COLLATERAL_MINT) })
          .rpc();
        
        alert("Market Created!");
    } catch (err: any) {
        console.error(err);
        alert("Error: " + err.toString());
    }
  };

  // Prevent Hydration Mismatch: Don't render complex logic until client loads
  if (!isClient) return <div className="bg-black min-h-screen"></div>;

  // Show Access Denied if NOT Admin
  if (!isAdmin) {
      return (
        <main className="min-h-screen bg-black text-white">
            <Navbar />
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
                <p className="text-gray-400 mt-4">Current Wallet: {wallet.publicKey?.toString() || "Not Connected"}</p>
                <p className="text-gray-600 text-sm mt-2">Required: {ADMIN_ADDRESS}</p>
            </div>
        </main>
      );
  }

  // Render Form if Admin
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="flex flex-col items-center mt-20 p-4">
          <h1 className="text-2xl font-bold mb-6">Create Market (Admin)</h1>
          <input 
            className="mb-4 p-3 bg-gray-900 rounded w-96 border border-gray-700 text-white" 
            placeholder="Question (e.g. Will BTC hit 100k?)" 
            onChange={e => setQuestion(e.target.value)} 
          />
          <input 
            className="mb-4 p-3 bg-gray-900 rounded w-96 border border-gray-700 text-white" 
            type="datetime-local" 
            onChange={e => setExpiry(e.target.value)} 
          />
          <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold">Deploy Market</button>
      </div>
    </main>
  );
}