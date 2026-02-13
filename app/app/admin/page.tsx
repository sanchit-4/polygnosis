"use client";

import { useEffect, useState } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Navbar from "../components/Navbar";

export default function AdminPage() {
  const { program } = useProgram();
  const wallet = useWallet();
  const [markets, setMarkets] = useState<any[]>([]);

  useEffect(() => {
    if (!program) return;
    const fetchMarkets = async () => {
        // Fetch all markets
        const all = await program.account.market.all();
        // Filter: Only show markets created by ME (The connected wallet)
        const myMarkets = all.filter((m: { account: { authority: { toString: () => string | undefined; }; }; }) => 
            m.account.authority.toString() === wallet.publicKey?.toString()
        );
        setMarkets(myMarkets);
    };
    fetchMarkets();
  }, [program, wallet.publicKey]);

  const handleResolve = async (marketPubkey: PublicKey, winner: boolean) => {
      if(!program) return;
      try {
          const tx = await program.methods
            .resolveMarket(winner) // true = YES, false = NO
            .accounts({
                market: marketPubkey,
                authority: wallet.publicKey!
            })
            .rpc();
          alert("Market Resolved! TX: " + tx);
          window.location.reload();
      } catch(e: any) {
          alert("Error: " + e.toString());
      }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="p-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">Admin Dashboard</h1>
        
        <div className="grid gap-6">
            {markets.map((m) => (
                <div key={m.publicKey.toString()} className="bg-gray-900 border border-gray-700 p-6 rounded flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">{m.account.question}</h2>
                        <p className="text-gray-400 text-sm">ID: {m.account.marketId.toString()}</p>
                        <p className="mt-2">
                            Status: {m.account.resolved ? 
                                <span className="text-green-400 font-bold">RESOLVED ({m.account.winner ? "YES" : "NO"})</span> 
                                : <span className="text-yellow-400">OPEN</span>}
                        </p>
                    </div>

                    {!m.account.resolved && (
                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleResolve(m.publicKey, true)}
                                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold"
                            >
                                YES Won
                            </button>
                            <button 
                                onClick={() => handleResolve(m.publicKey, false)}
                                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold"
                            >
                                NO Won
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
    </main>
  );
}