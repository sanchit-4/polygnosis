"use client";
import { useEffect, useState } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import Navbar from "../components/Navbar";
import { PublicKey } from "@solana/web3.js";

// !!! YOUR ADMIN ADDRESS !!!
const ADMIN_ADDRESS = "HEtRGZPUJX5WVx4aXE9EnDxK4er6ZcajMccaotiZH8Z5";

export default function AdminPage() {
  const { program } = useProgram();
  const wallet = useWallet();
  const [markets, setMarkets] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 1. Check Admin Status
  useEffect(() => {
    setIsClient(true);
    if (wallet.publicKey?.toString() === ADMIN_ADDRESS) {
        setIsAdmin(true);
    } else {
        setIsAdmin(false);
    }
  }, [wallet.publicKey]);

  // 2. Fetch Data (Only if Admin)
  useEffect(() => {
    if (!program || !isAdmin) return;
    
    const fetchMarkets = async () => {
        try {
            // @ts-expect-error
            const all = await program.account.market.all();
            // Filter markets created by this wallet
            const myMarkets = all.filter((m: { account: { authority: { toString: () => string | undefined; }; }; }) => 
                m.account.authority.toString() === wallet.publicKey?.toString()
            );
            setMarkets(myMarkets);
        } catch(e) { console.error(e); }
    };
    fetchMarkets();
  }, [program, isAdmin, wallet.publicKey]);

  const resolve = async (pk: PublicKey, win: boolean) => {
      try {
        const tx = await program?.methods.resolveMarket(win)
            .accounts({
                market: pk,
                authority: wallet.publicKey!
            })
            .rpc();
        alert("Resolved! TX: " + tx);
        window.location.reload();
      } catch (e: any) {
          alert("Error: " + e.toString());
      }
  };

  if (!isClient) return <div className="bg-black min-h-screen"></div>;

  // 3. Render Access Denied
  if (!isAdmin) {
      return (
        <main className="min-h-screen bg-black text-white">
            <Navbar />
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <h1 className="text-3xl font-bold text-red-500">Restricted Area</h1>
                <p className="text-gray-400 mt-4">This dashboard is for Market Resolutions only.</p>
                <p className="text-gray-600 text-sm mt-2">Connected: {wallet.publicKey?.toString() || "No Wallet"}</p>
            </div>
        </main>
      );
  }

  // 4. Render Dashboard (If Admin)
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="p-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">Resolution Dashboard</h1>
        {markets.length === 0 && <p className="text-gray-500">No markets found.</p>}
        
        {markets.map(m => (
            <div key={m.publicKey.toString()} className="bg-gray-900 p-6 mb-4 rounded border border-gray-700 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">{m.account.question}</h2>
                    <span className="text-gray-500 text-xs font-mono">{m.publicKey.toString()}</span>
                </div>
                {!m.account.resolved ? (
                    <div className="gap-4 flex">
                        <button onClick={() => resolve(m.publicKey, true)} className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-bold transition">YES Won</button>
                        <button onClick={() => resolve(m.publicKey, false)} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold transition">NO Won</button>
                    </div>
                ) : <span className="text-blue-400 font-bold border border-blue-900 bg-blue-900/20 px-4 py-2 rounded">Resolved: {m.account.winner ? "YES" : "NO"}</span>}
            </div>
        ))}
      </div>
    </main>
  );
}