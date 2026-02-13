"use client";

import { useEffect, useState } from "react";
import { useProgram } from "../hooks/useProgram";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import Navbar from "../components/Navbar";

const DECIMALS = 1000000; // Your Token Decimals (6)

export default function Portfolio() {
  const { program } = useProgram();
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!program || !wallet.publicKey) return;

    const fetchPositions = async () => {
        // @ts-expect-error
        const allMarkets = await program.account.market.all();
        const myPositions = [];

        for (const m of allMarkets) {
            // Check if user holds YES or NO tokens for this market
            const yesAta = await getAssociatedTokenAddress(m.account.yesMint, wallet.publicKey!);
            const noAta = await getAssociatedTokenAddress(m.account.noMint, wallet.publicKey!);
            
            let yesBal = 0;
            let noBal = 0;

            try {
                const acc = await getAccount(connection, yesAta);
                yesBal = Number(acc.amount);
            } catch(e) {}

            try {
                const acc = await getAccount(connection, noAta);
                noBal = Number(acc.amount);
            } catch(e) {}

            if (yesBal > 0 || noBal > 0) {
                myPositions.push({
                    market: m,
                    yesBal,
                    noBal
                });
            }
        }
        setPositions(myPositions);
    };

    fetchPositions();
  }, [program, wallet.publicKey]);

  const handleRedeem = async (pos: any) => {
      try {
          setLoading(true);
          const market = pos.market.account;
          
          // Determine which token to burn (The Winner)
          const winner = market.winner; // true = YES, false = NO
          if (winner === null) return alert("Market not resolved yet");

          const amountToRedeem = winner ? pos.yesBal : pos.noBal;
          if (amountToRedeem === 0) return alert("You hold the losing token (Value: $0)");

          const userAta = await getAssociatedTokenAddress(
              winner ? market.yesMint : market.noMint, 
              wallet.publicKey!
          );

          const vaultCollateral = market.vaultCollateral;
          const userCollateral = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey!);

          const tx = await program!.methods.redeem(new BN(amountToRedeem))
            .accounts({
                market: pos.market.publicKey,
                userTokenAccount: userAta,
                userCollateralAccount: userCollateral,
                vaultCollateral: vaultCollateral,
                mint: winner ? market.yesMint : market.noMint,
                payer: wallet.publicKey!
            })
            .rpc();

          alert("Redeemed! Funds sent to wallet. TX: " + tx);
          window.location.reload();

      } catch(e: any) {
          console.error(e);
          alert("Redeem Failed: " + e.toString());
      } finally {
          setLoading(false);
      }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="p-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Portfolio</h1>
        
        <div className="grid gap-6">
            {positions.length === 0 && <p className="text-gray-500">No active bets found.</p>}

            {positions.map((p, i) => {
                const m = p.market.account;
                const isResolved = m.resolved;
                const iWon = (m.winner === true && p.yesBal > 0) || (m.winner === false && p.noBal > 0);

                return (
                    <div key={i} className="bg-gray-900 border border-gray-700 p-6 rounded flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold">{m.question}</h2>
                            <div className="mt-2 flex gap-4 text-sm">
                                {p.yesBal > 0 && <span className="text-green-400">YES Shares: {(p.yesBal / DECIMALS).toFixed(2)}</span>}
                                {p.noBal > 0 && <span className="text-red-400">NO Shares: {(p.noBal / DECIMALS).toFixed(2)}</span>}
                            </div>
                            <p className="mt-2 text-gray-500 text-xs">
                                Status: {isResolved ? "RESOLVED" : "ONGOING"}
                            </p>
                        </div>

                        {/* Claim Button Logic */}
                        {isResolved ? (
                            iWon ? (
                                <button 
                                    onClick={() => handleRedeem(p)}
                                    className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                                    disabled={loading}
                                >
                                    {loading ? "Claiming..." : `Claim $${((p.yesBal + p.noBal) / DECIMALS).toFixed(2)}`}
                                </button>
                            ) : (
                                <span className="text-gray-500 font-mono">Outcome Lost</span>
                            )
                        ) : (
                            <span className="text-gray-600 italic">Waiting for Resolution...</span>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </main>
  );
}