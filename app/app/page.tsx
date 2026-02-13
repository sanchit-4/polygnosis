// // import Image from "next/image";

// // export default function Home() {
// //   return (
// //     <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
// //       <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
// //         <Image
// //           className="dark:invert"
// //           src="/next.svg"
// //           alt="Next.js logo"
// //           width={100}
// //           height={20}
// //           priority
// //         />
// //         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
// //           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
// //             To get started, edit the page.tsx file.
// //           </h1>
// //           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
// //             Looking for a starting point or more instructions? Head over to{" "}
// //             <a
// //               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //               className="font-medium text-zinc-950 dark:text-zinc-50"
// //             >
// //               Templates
// //             </a>{" "}
// //             or the{" "}
// //             <a
// //               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //               className="font-medium text-zinc-950 dark:text-zinc-50"
// //             >
// //               Learning
// //             </a>{" "}
// //             center.
// //           </p>
// //         </div>
// //         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
// //           <a
// //             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
// //             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //             target="_blank"
// //             rel="noopener noreferrer"
// //           >
// //             <Image
// //               className="dark:invert"
// //               src="/vercel.svg"
// //               alt="Vercel logomark"
// //               width={16}
// //               height={16}
// //             />
// //             Deploy Now
// //           </a>
// //           <a
// //             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
// //             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //             target="_blank"
// //             rel="noopener noreferrer"
// //           >
// //             Documentation
// //           </a>
// //         </div>
// //       </main>
// //     </div>
// //   );
// // }


// import Navbar from "./components/Navbar";

// export default function Home() {
//   return (
//     <main className="min-h-screen bg-black text-white">
//       <Navbar />
      
//       <div className="flex flex-col items-center justify-center mt-20 p-4">
//         <h1 className="text-5xl font-bold mb-4 text-center">
//           Predict the Future.
//         </h1>
//         <p className="text-xl text-gray-400 max-w-2xl text-center">
//           The professional-grade binary prediction market powered by Solana. 
//           Trade on news, politics, and crypto prices with zero counterparty risk.
//         </p>

//         <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
//            {/* Placeholder Cards for Markets - We will fill these with real data later */}
//            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-blue-500 cursor-pointer transition">
//               <h2 className="text-xl font-bold mb-2">Will BTC hit $100k?</h2>
//               <div className="flex justify-between items-center mt-4">
//                 <span className="text-green-400 text-2xl font-mono">YES 60%</span>
//                 <span className="text-red-400 text-2xl font-mono">NO 40%</span>
//               </div>
//            </div>
           
//            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-blue-500 cursor-pointer transition">
//               <h2 className="text-xl font-bold mb-2">Will SOL hit $500?</h2>
//               <div className="flex justify-between items-center mt-4">
//                 <span className="text-green-400 text-2xl font-mono">YES 25%</span>
//                 <span className="text-red-400 text-2xl font-mono">NO 75%</span>
//               </div>
//            </div>
//         </div>
//       </div>
//     </main>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useProgram } from "./hooks/useProgram";
import { MarketAccount } from "./types";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export default function Home() {
  const { program } = useProgram();
  const { connection } = useConnection();
  
  // State to hold the list of markets
  const [markets, setMarkets] = useState<MarketAccount[]>([]);
  // State to hold the calculated odds (Market Public Key -> Probability of YES %)
  const [probabilities, setProbabilities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!program) return;

    const fetchMarkets = async () => {
      try {
        setLoading(true);
        // 1. Fetch all market accounts from the chain
        // This is the "Select * From Markets" query
        const allMarkets = (await program.account.market.all()) as unknown as MarketAccount[];
        setMarkets(allMarkets);

        // 2. Fetch Token Balances to calculate Odds
        // We need to know how many YES and NO tokens are in the AMM vaults.
        // Probability(YES) = Amount(NO) / (Amount(YES) + Amount(NO))
        
        // Prepare a list of all vault addresses to fetch in one go (Batch RPC call)
        const vaultKeys: PublicKey[] = [];
        allMarkets.forEach((m) => {
            vaultKeys.push(m.account.vaultYes);
            vaultKeys.push(m.account.vaultNo);
        });

        // If no markets, stop
        if(vaultKeys.length === 0) return;

        // Fetch all account infos at once (Much faster than looping)
        const accounts = await connection.getMultipleAccountsInfo(vaultKeys);

        const newProbs: Record<string, number> = {};

        // Loop through markets and find their matching vault data
        allMarkets.forEach((m, i) => {
            // vaultYes is at index 2*i, vaultNo is at index 2*i + 1
            const yesAccount = accounts[2 * i];
            const noAccount = accounts[2 * i + 1];

            if (yesAccount && noAccount) {
                // Parse the raw binary data into a number (u64)
                // Layout: Mint (32) + Owner (32) + Amount (8) ... 
                // Amount is at offset 64 in a standard SPL Token Account
                const yesAmount = Number(yesAccount.data.readBigUInt64LE(64));
                const noAmount = Number(noAccount.data.readBigUInt64LE(64));

                if (yesAmount + noAmount === 0) {
                    newProbs[m.publicKey.toString()] = 50; // Default if empty
                } else {
                    // CPMM Probability Formula
                    const prob = (noAmount / (yesAmount + noAmount)) * 100;
                    newProbs[m.publicKey.toString()] = prob;
                }
            }
        });

        setProbabilities(newProbs);

      } catch (err) {
        console.error("Error fetching markets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [program, connection]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="flex flex-col items-center justify-center mt-20 p-4">
        <h1 className="text-5xl font-bold mb-4 text-center">
          Predict the Future.
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl text-center mb-10">
          The professional-grade binary prediction market on Solana.
        </p>

        {/* The Grid of Markets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
           
           {/* Loading State */}
           {loading && <div className="text-center w-full col-span-3">Loading Markets from Blockchain...</div>}

           {/* Empty State */}
           {!loading && markets.length === 0 && (
             <div className="text-center w-full col-span-3 text-gray-500">
                No markets found. Go create one!
             </div>
           )}

           {/* Market Cards */}
           {markets.map((market) => {
             const probYes = probabilities[market.publicKey.toString()] || 50;
             const probNo = 100 - probYes;
             
             // Check if resolved
             const isResolved = market.account.resolved;
             const statusColor = isResolved ? "border-gray-600 opacity-50" : "border-gray-800 hover:border-blue-500";

             return (
               <Link 
                 href={`/market/${market.publicKey.toString()}`} 
                 key={market.publicKey.toString()}
               >
                 <div className={`bg-gray-900 border ${statusColor} p-6 rounded-xl cursor-pointer transition h-full flex flex-col justify-between`}>
                    
                    {/* Header */}
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-500">ID: {market.account.marketId.toString()}</span>
                            {isResolved && <span className="text-xs bg-gray-700 px-2 py-1 rounded">RESOLVED</span>}
                        </div>
                        <h2 className="text-xl font-bold mb-4">{market.account.question}</h2>
                    </div>

                    {/* Probability Bars */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-green-400 font-mono">YES {probYes.toFixed(1)}%</span>
                            <span className="text-red-400 font-mono">NO {probNo.toFixed(1)}%</span>
                        </div>
                        
                        {/* Visual Bar */}
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-green-500" 
                                style={{ width: `${probYes}%` }}
                            ></div>
                            <div 
                                className="h-full bg-red-500" 
                                style={{ width: `${probNo}%` }}
                            ></div>
                        </div>

                        <div className="mt-4 text-xs text-gray-500 text-right">
                            Ends: {new Date(market.account.endTime.toNumber() * 1000).toLocaleDateString()}
                        </div>
                    </div>
                 </div>
               </Link>
             );
           })}
        </div>
      </div>
    </main>
  );
}