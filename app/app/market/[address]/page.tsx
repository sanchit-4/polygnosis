// // // "use client";

// // // import { useEffect, useState } from "react";
// // // import { useParams } from "next/navigation";
// // // import { useConnection, useWallet } from "@solana/wallet-adapter-react";
// // // import { PublicKey } from "@solana/web3.js";
// // // import { BN } from "@coral-xyz/anchor";
// // // import { useProgram } from "../../hooks/useProgram";
// // // import Navbar from "../../components/Navbar";
// // // import { calculateSwapOutput, calculatePrice } from "../../utils/amm";
// // // import { 
// // //     getAssociatedTokenAddress, 
// // //     createAssociatedTokenAccountIdempotentInstruction, 
// // //     TOKEN_PROGRAM_ID, 
// // //     ASSOCIATED_TOKEN_PROGRAM_ID 
// // // } from "@solana/spl-token";
// // // import { TransactionInstruction } from "@solana/web3.js";

// // // // Define the outcome Enum to match Rust
// // // enum Outcome {
// // //     Yes = 0,
// // //     No = 1,
// // // }

// // // export default function MarketPage() {
// // //   const { address } = useParams(); // Get the market ID from URL
// // //   const { program } = useProgram();
// // //   const { connection } = useConnection();
// // //   const wallet = useWallet();

// // //   const [market, setMarket] = useState<any>(null);
// // //   const [yesBalance, setYesBalance] = useState<number>(0);
// // //   const [noBalance, setNoBalance] = useState<number>(0);
  
// // //   // Trading State
// // //   const [amount, setAmount] = useState("");
// // //   const [selectedOutcome, setSelectedOutcome] = useState<Outcome>(Outcome.Yes);
// // //   const [estimatedShares, setEstimatedShares] = useState<number>(0);
// // //   const [loading, setLoading] = useState(false);

// // //   // 1. Fetch Market Data on Load
// // //   useEffect(() => {
// // //     if (!program || !address) return;

// // //     const fetchMarketData = async () => {
// // //       try {
// // //         const pubkey = new PublicKey(address as string);
// // //         const account = await program.account.market.fetch(pubkey);
// // //         setMarket(account);

// // //         // Fetch Vault Balances
// // //         const balances = await connection.getMultipleAccountsInfo([
// // //             account.vaultYes,
// // //             account.vaultNo
// // //         ]);

// // //         const yesData = balances[0]?.data;
// // //         const noData = balances[1]?.data;

// // //         // Parse token amounts (Offset 64, Little Endian u64)
// // //         const yBal = yesData ? Number(yesData.readBigUInt64LE(64)) : 0;
// // //         const nBal = noData ? Number(noData.readBigUInt64LE(64)) : 0;

// // //         setYesBalance(yBal);
// // //         setNoBalance(nBal);

// // //       } catch (err) {
// // //         console.error("Failed to fetch market:", err);
// // //       }
// // //     };

// // //     fetchMarketData();
// // //     // Set up a poller to refresh data every 5 seconds (Live Odds)
// // //     const interval = setInterval(fetchMarketData, 5000);
// // //     return () => clearInterval(interval);

// // //   }, [program, address, connection]);

// // //   // 2. Handle Input Change (Calculate Estimate)
// // //   useEffect(() => {
// // //     const inputAmount = parseFloat(amount);
// // //     if (isNaN(inputAmount) || inputAmount <= 0) {
// // //         setEstimatedShares(0);
// // //         return;
// // //     }

// // //     // Since we mint new tokens in `buy`, the pool calculation is tricky.
// // //     // In our `buy` instruction logic:
// // //     // 1. User Inputs 100 USDC.
// // //     // 2. We Mint 100 YES and 100 NO.
// // //     // 3. If User wants YES: We swap the 100 NO into the pool for YES.
// // //     // 4. User keeps 100 YES (minted) + Swapped YES.
    
// // //     // So the Swap is: Input = 100 NO. Pool = {YES: yesBalance, NO: noBalance + 100}.
// // //     // Wait, in our Rust code, we calculate swap using PRE-MINT balances usually, 
// // //     // or post-mint. Let's look at the Rust `buy.rs` logic again.
// // //     // "pool_no_before_swap = pool_no_after_mint - amount_in_no"
// // //     // Effectively: We swap against the CURRENT pool balances.
    
// // //     // We need to simulate the swap:
// // //     // If buying YES: We are selling NO (Input) to buy YES (Output)
// // //     // Pool Input Side: NoBalance
// // //     // Pool Output Side: YesBalance
    
// // //     // However, `buy` creates new shares too.
// // //     // Total Received = InputAmount + SwapOutput
    
// // //     let swapOutput = 0;

// // //     if (selectedOutcome === Outcome.Yes) {
// // //         // Selling NO (input) to buy YES
// // //         // Input to Swap = inputAmount
// // //         swapOutput = calculateSwapOutput(noBalance, yesBalance, inputAmount);
// // //     } else {
// // //         // Selling YES (input) to buy NO
// // //         swapOutput = calculateSwapOutput(yesBalance, noBalance, inputAmount);
// // //     }

// // //     setEstimatedShares(inputAmount + swapOutput);

// // //   }, [amount, selectedOutcome, yesBalance, noBalance]);


// // //   // 3. Execute Trade
// // //   const handleTrade = async () => {
// // //     if (!program || !market) return;
// // //     try {
// // //         setLoading(true);
// // //         const inputVal = new BN(parseFloat(amount)); 
// // //         const minOut = new BN(0); // TODO: Add slippage slider in UI for Pro version

// // //         // Call the 'buy' instruction
// // //         const tx = await program.methods
// // //             .buy(
// // //                 inputVal, 
// // //                 selectedOutcome === Outcome.Yes ? { yes: {} } : { no: {} }, 
// // //                 minOut
// // //             )
// // //             .accounts({
// // //                 // Anchor resolves most accounts automatically via the "market" account
// // //                 market: new PublicKey(address as string),
// // //                 // We need to pass the user's token accounts. 
// // //                 // In a real app, we use `getAssociatedTokenAddress` to find them.
// // //                 // For MVP, anchor-spl might help, or we let the wallet adapter handle creation?
// // //                 // Actually, Anchor client usually requires us to pass these if they aren't standard PDAs.
// // //                 // Let's rely on Anchor's resolution for vaults, but user accounts might be tricky.
                
// // //                 // CRITICAL: In the Rust `buy` instruction, we ask for `payer_yes_account` etc.
// // //                 // If they don't exist, the transaction fails.
// // //                 // We need to create them (ATA) in the UI if they don't exist.
// // //                 // For this snippet, assume they exist or Anchor handles it.
// // //             })
// // //             .rpc();
            
// // //         console.log("Trade TX:", tx);
// // //         alert("Trade Successful!");
// // //         setAmount(""); // Reset form
// // //     } catch (err) {
// // //         console.error("Trade failed:", err);
// // //         alert("Trade failed: " + JSON.stringify(err));
// // //     } finally {
// // //         setLoading(false);
// // //     }
// // //   };

// // //   // 4. Render
// // //   if (!market) return <div className="text-white text-center mt-20">Loading Market...</div>;

// // //   const probYes = calculatePrice(yesBalance, noBalance);
// // //   const probNo = 100 - probYes;

// // //   return (
// // //     <main className="min-h-screen bg-black text-white">
// // //       <Navbar />
// // //       <div className="flex justify-center p-6">
// // //         <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
            
// // //             {/* Left Column: Market Info & Chart */}
// // //             <div className="md:col-span-2 space-y-6">
// // //                 <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
// // //                     <h1 className="text-3xl font-bold mb-4">{market.question}</h1>
// // //                     <div className="flex gap-4 text-sm text-gray-400">
// // //                         <span>Ends: {new Date(market.endTime.toNumber() * 1000).toLocaleDateString()}</span>
// // //                         <span>Liquidity: ${(yesBalance + noBalance).toLocaleString()} (Approx)</span>
// // //                     </div>
// // //                 </div>

// // //                 {/* Big Probability Display */}
// // //                 <div className="grid grid-cols-2 gap-4">
// // //                     <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probYes > probNo ? 'border-green-500 bg-green-900/20' : 'border-gray-800 bg-gray-900'}`}>
// // //                         <span className="text-gray-400 mb-2">YES</span>
// // //                         <span className="text-4xl font-bold text-green-400">{probYes.toFixed(1)}%</span>
// // //                     </div>
// // //                     <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probNo > probYes ? 'border-red-500 bg-red-900/20' : 'border-gray-800 bg-gray-900'}`}>
// // //                         <span className="text-gray-400 mb-2">NO</span>
// // //                         <span className="text-4xl font-bold text-red-400">{probNo.toFixed(1)}%</span>
// // //                     </div>
// // //                 </div>
                
// // //                 {/* Admin Only: Seed Liquidity Button (Hidden if balance > 0) */}
// // //                 {(yesBalance === 0 && noBalance === 0) && (
// // //                     <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded text-center">
// // //                         <p className="text-yellow-500 mb-2">⚠️ Pool is Empty. Market is inactive.</p>
// // //                         <button 
// // //                             className="bg-yellow-600 px-4 py-2 rounded font-bold hover:bg-yellow-500"
// // //                             onClick={async () => {
// // //                                 // Simple Liquidity Add call
// // //                                 const amt = new BN(1000); // 1000 USDC
// // //                                 await program?.methods.addLiquidity(amt).accounts({market: new PublicKey(address as string)}).rpc();
// // //                                 alert("Liquidity Added!");
// // //                             }}
// // //                         >
// // //                             Initialize Pool (Add 1000 Liquidity)
// // //                         </button>
// // //                     </div>
// // //                 )}
// // //             </div>

// // //             {/* Right Column: Trade Panel */}
// // //             <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit">
// // //                 <h2 className="text-xl font-bold mb-6">Trade</h2>
                
// // //                 {/* Outcome Selector */}
// // //                 <div className="flex bg-black p-1 rounded mb-6">
// // //                     <button 
// // //                         onClick={() => setSelectedOutcome(Outcome.Yes)}
// // //                         className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.Yes ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
// // //                     >
// // //                         YES
// // //                     </button>
// // //                     <button 
// // //                         onClick={() => setSelectedOutcome(Outcome.No)}
// // //                         className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.No ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
// // //                     >
// // //                         NO
// // //                     </button>
// // //                 </div>

// // //                 {/* Amount Input */}
// // //                 <div className="mb-4">
// // //                     <label className="block text-gray-400 text-sm mb-2">Amount (USDC)</label>
// // //                     <div className="relative">
// // //                         <input 
// // //                             type="number" 
// // //                             className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none"
// // //                             placeholder="0.00"
// // //                             value={amount}
// // //                             onChange={(e) => setAmount(e.target.value)}
// // //                         />
// // //                         <span className="absolute right-4 top-3 text-gray-500">USDC</span>
// // //                     </div>
// // //                 </div>

// // //                 {/* Estimate Output */}
// // //                 <div className="bg-black/50 p-4 rounded mb-6 text-sm">
// // //                     <div className="flex justify-between mb-2">
// // //                         <span className="text-gray-400">Est. Shares</span>
// // //                         <span className="font-mono">{estimatedShares.toFixed(2)}</span>
// // //                     </div>
// // //                     <div className="flex justify-between">
// // //                         <span className="text-gray-400">Avg. Price</span>
// // //                         <span className="font-mono">
// // //                             {estimatedShares > 0 ? (parseFloat(amount) / estimatedShares).toFixed(2) : "0.00"}¢
// // //                         </span>
// // //                     </div>
// // //                     <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
// // //                         <span className="text-gray-400">Potential Return</span>
// // //                         <span className="text-green-400 font-bold">
// // //                             {estimatedShares > 0 ? `+$${(estimatedShares - parseFloat(amount)).toFixed(2)}` : "$0.00"}
// // //                         </span>
// // //                     </div>
// // //                 </div>

// // //                 {/* Action Button */}
// // //                 <button 
// // //                     onClick={handleTrade}
// // //                     disabled={loading || !wallet.connected}
// // //                     className={`w-full py-4 rounded font-bold text-lg transition ${
// // //                         loading ? "bg-gray-700" :
// // //                         !wallet.connected ? "bg-blue-600" :
// // //                         selectedOutcome === Outcome.Yes ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
// // //                     }`}
// // //                 >
// // //                     {!wallet.connected ? "Connect Wallet" : loading ? "Confirming..." : `Buy ${selectedOutcome === Outcome.Yes ? 'YES' : 'NO'}`}
// // //                 </button>
                
// // //                 <p className="text-center text-xs text-gray-500 mt-4">
// // //                     Fee: 2.0% • Slippage: Auto
// // //                 </p>
// // //             </div>
// // //         </div>
// // //       </div>
// // //     </main>
// // //   );
// // // }

// // "use client";

// // import { useEffect, useState, useMemo } from "react";
// // import { useParams } from "next/navigation";
// // import { useConnection, useWallet } from "@solana/wallet-adapter-react";
// // import { PublicKey } from "@solana/web3.js";
// // import { BN } from "@coral-xyz/anchor";
// // import { 
// //     getAssociatedTokenAddress, 
// //     createAssociatedTokenAccountInstruction, // <--- NEW
// //     getAccount, // <--- NEW (To check if account exists)
// //     TokenAccountNotFoundError 
// // } from "@solana/spl-token";
// // import { 
// //     Transaction, 
// //     ComputeBudgetProgram 
// // } from "@solana/web3.js";
// // import { useProgram } from "../../hooks/useProgram";
// // import Navbar from "../../components/Navbar";
// // import { calculateSwapOutput, calculatePrice } from "../../utils/amm";

// // enum Outcome {
// //     Yes = 0,
// //     No = 1,
// // }

// // export default function MarketPage() {
// //   const { address } = useParams();
// //   const { program } = useProgram();
// //   const { connection } = useConnection();
// //   const wallet = useWallet();

// //   const [market, setMarket] = useState<any>(null);
// //   const [yesBalance, setYesBalance] = useState<number>(0);
// //   const [noBalance, setNoBalance] = useState<number>(0);
  
// //   // Trading State
// //   const [amount, setAmount] = useState("");
// //   const [selectedOutcome, setSelectedOutcome] = useState<Outcome>(Outcome.Yes);
// //   const [estimatedShares, setEstimatedShares] = useState<number>(0);
// //   const [loading, setLoading] = useState(false);

// //   // 1. Fetch Market Data & Live Polling
// //   useEffect(() => {
// //     if (!program || !address) return;

// //     const fetchMarketData = async () => {
// //       try {
        
// //         const pubkey = new PublicKey(address as string);
// //         const account = await program.account.market.fetch(pubkey);
// //         setMarket(account);
// //         console.log("Found Market:", account);
// //         console.log("USDC Mint Address:", account.collateralMint.toString());

// //         const balances = await connection.getMultipleAccountsInfo([
// //             account.vaultYes,
// //             account.vaultNo
// //         ]);

// //         const yBal = balances[0]?.data ? Number(balances[0].data.readBigUInt64LE(64)) : 0;
// //         const nBal = balances[1]?.data ? Number(balances[1].data.readBigUInt64LE(64)) : 0;

// //         setYesBalance(yBal);
// //         setNoBalance(nBal);

// //       } catch (err) {
// //         console.error("Failed to fetch market:", err);
// //       }
// //     };

// //     fetchMarketData();
// //     const interval = setInterval(fetchMarketData, 5000); // Live update every 5s
// //     return () => clearInterval(interval);

// //   }, [program, address, connection]);


// //   // 2. Real-Time Math Engine (The Logic Fix)
// //   // This useEffect runs INSTANTLY whenever 'amount' or 'selectedOutcome' changes.
// //   useEffect(() => {
// //     const inputAmount = parseFloat(amount);
    
// //     // If input is invalid or 0, reset
// //     if (isNaN(inputAmount) || inputAmount <= 0) {
// //         setEstimatedShares(0);
// //         return;
// //     }

// //     // MATH EXPLANATION:
// //     // When you buy $100 YES:
// //     // 1. You get 100 YES minted immediately.
// //     // 2. You get 100 NO minted immediately (but held by the contract).
// //     // 3. The contract sells that 100 NO into the pool to buy *more* YES.
// //     // So: Total YES = 100 + Swap(100 NO -> YES)
    
// //     let swapOutput = 0;

// //     // NOTE: We use the CURRENT balances for the estimate. 
// //     // In reality, the swap happens after minting, so the pool is slightly larger, 
// //     // but for an estimate, this is accurate enough (and safer/conservative).
    
// //     if (selectedOutcome === Outcome.Yes) {
// //         // We are dumping NO into the pool to get YES
// //         swapOutput = calculateSwapOutput(noBalance, yesBalance, inputAmount);
// //     } else {
// //         // We are dumping YES into the pool to get NO
// //         swapOutput = calculateSwapOutput(yesBalance, noBalance, inputAmount);
// //     }

// //     setEstimatedShares(inputAmount + swapOutput);

// //   }, [amount, selectedOutcome, yesBalance, noBalance]); // Dependencies ensure real-time updates


// //   // 3. Execute Trade (The Account Fix)
// // //   const handleTrade = async () => {
// // //     if (!program || !market || !wallet.publicKey) return;
    
// // //     try {
// // //         setLoading(true);
// // //         const inputVal = new BN(parseFloat(amount) * 1000000); // Assuming 6 decimals for USDC!
// // //         const minOut = new BN(0); // TODO: Add slippage

// // //         // A. Find the User's Accounts (ATAs)
// // //         // This fixes the "Account not provided" error
// // //         const payerCollateralAccount = await getAssociatedTokenAddress(
// // //             market.collateralMint, // The USDC Mint
// // //             wallet.publicKey
// // //         );

// // //         const payerYesAccount = await getAssociatedTokenAddress(
// // //             market.yesMint,
// // //             wallet.publicKey
// // //         );

// // //         const payerNoAccount = await getAssociatedTokenAddress(
// // //             market.noMint,
// // //             wallet.publicKey
// // //         );

// // //         // B. Send the Transaction
// // //         const tx = await program.methods
// // //             .buy(
// // //                 inputVal, 
// // //                 selectedOutcome === Outcome.Yes ? { yes: {} } : { no: {} }, 
// // //                 minOut
// // //             )
// // //             .accounts({
// // //                 market: new PublicKey(address as string),
                
// // //                 // Explicitly pass the user's token accounts
// // //                 payerCollateralAccount: payerCollateralAccount,
// // //                 payerYesAccount: payerYesAccount,
// // //                 payerNoAccount: payerNoAccount,
                
// // //                 // Pass the vaults (sometimes Anchor needs help finding them)
// // //                 vaultCollateral: market.vaultCollateral,
// // //                 vaultYes: market.vaultYes,
// // //                 vaultNo: market.vaultNo,
                
// // //                 // Mints
// // //                 yesMint: market.yesMint,
// // //                 noMint: market.noMint,
                
// // //                 // Anchor will find systemProgram, tokenProgram automatically
// // //             })
// // //             .rpc();
            
// // //         console.log("Trade TX:", tx);
// // //         alert(`Trade Successful! TX: ${tx}`);
// // //         setAmount(""); // Reset form
        
// // //     } catch (err: any) {
// // //         console.error("Trade failed:", err);
// // //         // Better error message for the user
// // //         if (err.message.includes("Account not provided")) {
// // //              alert("Error: Could not find your Token Account. Ensure you have USDC.");
// // //         } else if (err.toString().includes("0x1")) {
// // //              alert("Error: Insufficient Funds.");
// // //         } else {
// // //              alert("Trade failed: " + err.toString());
// // //         }
// // //     } finally {
// // //         setLoading(false);
// // //     }
// // //   };
// // //   const handleTrade = async () => {
// // //     if (!program || !market || !wallet.publicKey || !wallet.signTransaction) return;
    
// // //     try {
// // //         setLoading(true);
// // //         const inputVal = new BN(parseFloat(amount) * 1000000); // 6 Decimals for USDC
// // //         const minOut = new BN(0);

// // //         const connection = program.provider.connection;

// // //         // 1. Get Addresses of the Accounts we expect the user to have
// // //         const payerCollateralAccount = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey);
// // //         const payerYesAccount = await getAssociatedTokenAddress(market.yesMint, wallet.publicKey);
// // //         const payerNoAccount = await getAssociatedTokenAddress(market.noMint, wallet.publicKey);

// // //         // 2. Create a blank Transaction bucket
// // //         const transaction = new Transaction();

// // //         // --- CHECK 1: Does user have USDC Account? ---
// // //         // If not, they have 0 funds, so we can't really help them buy, 
// // //         // BUT we can give a better error or try to create it (though it will be empty).
// // //         try {
// // //             await getAccount(connection, payerCollateralAccount);
// // //         } catch (e) {
// // //             // If checking the account fails, it likely doesn't exist.
// // //             // We can try to create it, but it will have 0 balance, so the Buy will fail anyway.
// // //             // However, let's create it just in case they are trying to initialize.
// // //             transaction.add(
// // //                 createAssociatedTokenAccountInstruction(
// // //                     wallet.publicKey, // Payer
// // //                     payerCollateralAccount, // Address to create
// // //                     wallet.publicKey, // Owner
// // //                     market.collateralMint // Mint
// // //                 )
// // //             );
// // //             // If they truly have no USDC, the Simulation later will catch it.
// // //         }

// // //         // --- CHECK 2: Does user have YES Account? ---
// // //         try {
// // //             await getAccount(connection, payerYesAccount);
// // //         } catch (e) {
// // //             // Account doesn't exist. Add instruction to create it.
// // //             console.log("Creating YES Account...");
// // //             transaction.add(
// // //                 createAssociatedTokenAccountInstruction(
// // //                     wallet.publicKey,
// // //                     payerYesAccount,
// // //                     wallet.publicKey,
// // //                     market.yesMint
// // //                 )
// // //             );
// // //         }

// // //         // --- CHECK 3: Does user have NO Account? ---
// // //         // Even if buying YES, our contract logic mints/swaps NO temporarily, 
// // //         // so we need this account to exist.
// // //         try {
// // //             await getAccount(connection, payerNoAccount);
// // //         } catch (e) {
// // //             console.log("Creating NO Account...");
// // //             transaction.add(
// // //                 createAssociatedTokenAccountInstruction(
// // //                     wallet.publicKey,
// // //                     payerNoAccount,
// // //                     wallet.publicKey,
// // //                     market.noMint
// // //                 )
// // //             );
// // //         }

// // //         // 3. Add the Buy Instruction from our Smart Contract
// // //         const buyIx = await program.methods
// // //             .buy(
// // //                 inputVal, 
// // //                 selectedOutcome === Outcome.Yes ? { yes: {} } : { no: {} }, 
// // //                 minOut
// // //             )
// // //             .accounts({
// // //                 market: new PublicKey(address as string),
// // //                 payerCollateralAccount: payerCollateralAccount,
// // //                 payerYesAccount: payerYesAccount,
// // //                 payerNoAccount: payerNoAccount,
// // //                 vaultCollateral: market.vaultCollateral,
// // //                 vaultYes: market.vaultYes,
// // //                 vaultNo: market.vaultNo,
// // //                 yesMint: market.yesMint,
// // //                 noMint: market.noMint,
// // //             })
// // //             .instruction(); // <--- Note: We use .instruction() here, not .rpc()

// // //         transaction.add(buyIx);

// // //         // 4. Send the Bundle
// // //         // Get latest blockhash for the transaction
// // //         const { blockhash } = await connection.getLatestBlockhash();
// // //         transaction.recentBlockhash = blockhash;
// // //         transaction.feePayer = wallet.publicKey;

// // //         // Sign and Send
// // //         // We use the wallet adapter's sendTransaction which handles signing + sending
// // //         const signature = await wallet.sendTransaction(transaction, connection);

// // //         console.log("Trade TX Signature:", signature);
        
// // //         // Wait for confirmation
// // //         await connection.confirmTransaction(signature, "processed");

// // //         alert(`Trade Successful! TX: ${signature}`);
// // //         setAmount(""); 
        
// // //     } catch (err: any) {
// // //         console.error("Trade failed:", err);
        
// // //         // Detailed Error Handling
// // //         if (err.toString().includes("AccountNotInitialized")) {
// // //              alert("Error: You have no USDC! Please get Devnet USDC.");
// // //         } else if (err.toString().includes("0x1")) {
// // //              alert("Error: Insufficient Funds (You are broke).");
// // //         } else {
// // //              alert("Trade failed: " + err.toString());
// // //         }
// // //     } finally {
// // //         setLoading(false);
// // //     }
// // //   };
// //   const handleTrade = async () => {
// //     if (!program || !market || !wallet.publicKey || !wallet.signTransaction) return;
    
// //     try {
// //         setLoading(true);
// //         const connection = program.provider.connection;
// //         const inputVal = new BN(parseFloat(amount) * 1000000); // 6 Decimals

// //         // 1. Get Addresses
// //         const payerCollateralAccount = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey);
// //         const payerYesAccount = await getAssociatedTokenAddress(market.yesMint, wallet.publicKey);
// //         const payerNoAccount = await getAssociatedTokenAddress(market.noMint, wallet.publicKey);

// //         // 2. STRICT CHECK: Does User have USDC?
// //         // We cannot "Create and Buy" in one step if the account is empty.
// //         try {
// //             const usdcAccount = await getAccount(connection, payerCollateralAccount);
// //             const balance = Number(usdcAccount.amount);
            
// //             if (balance < inputVal.toNumber()) {
// //                 alert(`Insufficient Funds. You have ${balance / 1000000} USDC, but tried to spend ${amount}.`);
// //                 setLoading(false);
// //                 return; // STOP EXECUTION
// //             }
// //         } catch (e) {
// //             // If getAccount fails, the account doesn't exist at all
// //             alert("Error: You do not have a USDC Account. Please get Devnet USDC first.");
// //             setLoading(false);
// //             return; // STOP EXECUTION
// //         }

// //         // 3. Build Transaction
// //         const transaction = new Transaction();

// //         // Increase Compute Budget (Creating accounts + CPMM math is heavy)
// //         transaction.add(
// //             ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
// //         );

// //         // --- Check YES Account ---
// //         try {
// //             await getAccount(connection, payerYesAccount);
// //         } catch (e) {
// //             console.log("Adding instruction to create YES Account...");
// //             transaction.add(
// //                 createAssociatedTokenAccountInstruction(
// //                     wallet.publicKey,
// //                     payerYesAccount,
// //                     wallet.publicKey,
// //                     market.yesMint
// //                 )
// //             );
// //         }

// //         // --- Check NO Account ---
// //         try {
// //             await getAccount(connection, payerNoAccount);
// //         } catch (e) {
// //             console.log("Adding instruction to create NO Account...");
// //             transaction.add(
// //                 createAssociatedTokenAccountInstruction(
// //                     wallet.publicKey,
// //                     payerNoAccount,
// //                     wallet.publicKey,
// //                     market.noMint
// //                 )
// //             );
// //         }

// //         // 4. Add Buy Instruction
// //         const buyIx = await program.methods
// //             .buy(
// //                 inputVal, 
// //                 selectedOutcome === Outcome.Yes ? { yes: {} } : { no: {} }, 
// //                 new BN(0) // Slippage tolerance (0 for MVP)
// //             )
// //             .accounts({
// //                 market: new PublicKey(address as string),
// //                 payerCollateralAccount: payerCollateralAccount,
// //                 payerYesAccount: payerYesAccount,
// //                 payerNoAccount: payerNoAccount,
// //                 vaultCollateral: market.vaultCollateral,
// //                 vaultYes: market.vaultYes,
// //                 vaultNo: market.vaultNo,
// //                 yesMint: market.yesMint,
// //                 noMint: market.noMint,
// //             })
// //             .instruction();

// //         transaction.add(buyIx);

// //         // 5. Send
// //         const { blockhash } = await connection.getLatestBlockhash();
// //         transaction.recentBlockhash = blockhash;
// //         transaction.feePayer = wallet.publicKey;

// //         const signature = await wallet.sendTransaction(transaction, connection);
// //         console.log("Trade TX Signature:", signature);
        
// //         await connection.confirmTransaction(signature, "processed");
// //         alert(`Trade Successful!`);
// //         setAmount(""); 
        
// //     } catch (err: any) {
// //         console.error("Trade failed:", err);
// //         alert("Trade failed: " + err.message);
// //     } finally {
// //         setLoading(false);
// //     }
// //   };


// //   if (!market) return <div className="text-white text-center mt-20">Loading Market...</div>;

// //   const probYes = calculatePrice(yesBalance, noBalance);
// //   const probNo = 100 - probYes;
  
// //   // Calculate average price for the UI
// //   const avgPrice = estimatedShares > 0 ? (parseFloat(amount) / estimatedShares) * 100 : 0;

// //   return (
// //     <main className="min-h-screen bg-black text-white">
// //       <Navbar />
// //       <div className="flex justify-center p-6">
// //         <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
            
// //             {/* Left Column: Market Info */}
// //             <div className="md:col-span-2 space-y-6">
// //                 <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
// //                     <h1 className="text-3xl font-bold mb-4">{market.question}</h1>
// //                     <div className="flex gap-4 text-sm text-gray-400">
// //                         <span>Ends: {new Date(market.endTime.toNumber() * 1000).toLocaleDateString()}</span>
// //                         <span>Liquidity: ${(yesBalance + noBalance).toLocaleString()} (Approx)</span>
// //                     </div>
// //                 </div>

// //                 <div className="grid grid-cols-2 gap-4">
// //                     <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probYes > probNo ? 'border-green-500 bg-green-900/20' : 'border-gray-800 bg-gray-900'}`}>
// //                         <span className="text-gray-400 mb-2">YES</span>
// //                         <span className="text-4xl font-bold text-green-400">{probYes.toFixed(1)}%</span>
// //                     </div>
// //                     <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probNo > probYes ? 'border-red-500 bg-red-900/20' : 'border-gray-800 bg-gray-900'}`}>
// //                         <span className="text-gray-400 mb-2">NO</span>
// //                         <span className="text-4xl font-bold text-red-400">{probNo.toFixed(1)}%</span>
// //                     </div>
// //                 </div>

// //                 {/* Liquidity Button (Only visible if empty) */}
// //                 {(yesBalance === 0 && noBalance === 0) && (
// //                      <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded text-center">
// //                         <p className="text-yellow-500 mb-2">⚠️ Pool is Empty.</p>
// //                         <button 
// //                             className="bg-yellow-600 px-4 py-2 rounded font-bold hover:bg-yellow-500"
// //                             onClick={async () => {
// //                                 // Important: We pass decimals here (assuming 6 for USDC)
// //                                 const amt = new BN(1000 * 1000000); 
// //                                 await program?.methods.addLiquidity(amt)
// //                                 .accounts({
// //                                     market: new PublicKey(address as string),
// //                                     payerCollateralAccount: await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey!),
// //                                     vaultCollateral: market.vaultCollateral,
// //                                     yesMint: market.yesMint,
// //                                     noMint: market.noMint,
// //                                     vaultYes: market.vaultYes,
// //                                     vaultNo: market.vaultNo,
// //                                 })
// //                                 .rpc();
// //                                 alert("Liquidity Added!");
// //                             }}
// //                         >
// //                             Initialize Pool (Add 1000 USDC)
// //                         </button>
// //                         <button 
// //                             onClick={async () => {
// //                                 // Airdrop 1 SOL to pay for fees
// //                                 await connection.requestAirdrop(wallet.publicKey!, 1000000000);
// //                                 alert("Airdropped 1 SOL. Now go to spl-token-faucet.com to get USDC.");
// //                             }}
// //                             className="mt-4 text-xs text-gray-500 underline w-full text-center"
// //                         >
// //                             Need Testnet SOL? Click here.
// //                         </button>
// //                     </div>
// //                 )}
// //             </div>

// //             {/* Right Column: Trade Panel */}
// //             <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit">
// //                 <h2 className="text-xl font-bold mb-6">Trade</h2>
                
// //                 <div className="flex bg-black p-1 rounded mb-6">
// //                     <button 
// //                         onClick={() => setSelectedOutcome(Outcome.Yes)}
// //                         className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.Yes ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
// //                     >
// //                         YES
// //                     </button>
// //                     <button 
// //                         onClick={() => setSelectedOutcome(Outcome.No)}
// //                         className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.No ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
// //                     >
// //                         NO
// //                     </button>
// //                 </div>

// //                 <div className="mb-4">
// //                     <label className="block text-gray-400 text-sm mb-2">Amount (USDC)</label>
// //                     <div className="relative">
// //                         <input 
// //                             type="number" 
// //                             className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none"
// //                             placeholder="0.00"
// //                             value={amount}
// //                             onChange={(e) => setAmount(e.target.value)}
// //                         />
// //                         <span className="absolute right-4 top-3 text-gray-500">USDC</span>
// //                     </div>
// //                 </div>

// //                 {/* Estimate Box - Updates Realtime */}
// //                 <div className="bg-black/50 p-4 rounded mb-6 text-sm">
// //                     <div className="flex justify-between mb-2">
// //                         <span className="text-gray-400">Est. Shares</span>
// //                         <span className="font-mono text-white">{estimatedShares.toFixed(2)}</span>
// //                     </div>
// //                     <div className="flex justify-between">
// //                         <span className="text-gray-400">Avg. Price</span>
// //                         <span className="font-mono text-white">
// //                             {avgPrice.toFixed(1)}¢
// //                         </span>
// //                     </div>
// //                     <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
// //                         <span className="text-gray-400">Potential Return</span>
// //                         <span className="text-green-400 font-bold">
// //                             {estimatedShares > 0 ? `+$${(estimatedShares - parseFloat(amount)).toFixed(2)}` : "$0.00"}
// //                         </span>
// //                     </div>
// //                 </div>

// //                 <button 
// //                     onClick={handleTrade}
// //                     disabled={loading || !wallet.connected}
// //                     className={`w-full py-4 rounded font-bold text-lg transition ${
// //                         loading ? "bg-gray-700" :
// //                         !wallet.connected ? "bg-blue-600" :
// //                         selectedOutcome === Outcome.Yes ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
// //                     }`}
// //                 >
// //                     {!wallet.connected ? "Connect Wallet" : loading ? "Confirming..." : `Buy ${selectedOutcome === Outcome.Yes ? 'YES' : 'NO'}`}
// //                 </button>
                
// //                 <p className="text-center text-xs text-gray-500 mt-4">
// //                     Fee: 2.0% • Slippage: Auto
// //                 </p>
// //             </div>
// //         </div>
// //       </div>
// //     </main>
// //   );
// // }

// "use client";

// import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";
// import { useConnection, useWallet } from "@solana/wallet-adapter-react";
// import { PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
// import { BN } from "@coral-xyz/anchor";
// import { 
//     getAssociatedTokenAddress, 
//     createAssociatedTokenAccountInstruction, 
//     getAccount 
// } from "@solana/spl-token";
// import { useProgram } from "../../hooks/useProgram";
// import Navbar from "../../components/Navbar";
// import { calculateSwapOutput, calculatePrice } from "../../utils/amm";

// enum Outcome {
//     Yes = 0,
//     No = 1,
// }

// // CONSTANT for USDC Decimals
// const DECIMALS = 6; 
// const DIVISOR = Math.pow(10, DECIMALS);

// export default function MarketPage() {
//   const [isExpired, setIsExpired] = useState(false);
//   useEffect(() => {
//     if (market) {
//         const now = Date.now() / 1000;
//         setIsExpired(now > market.endTime.toNumber());
//     }
//     }, [market]);

//   useEffect(() => {
//       if (market) {
//           const now = Date.now() / 1000; // Current time in seconds
//           setIsExpired(now > market.endTime.toNumber());
//       }
//   }, [market]);
//   const { address } = useParams();
//   const { program } = useProgram();
//   const { connection } = useConnection();
//   const wallet = useWallet();

//   const [market, setMarket] = useState<any>(null);
  
//   // Balances in HUMAN READABLE format (e.g. 500.00 USDC)
//   const [yesBalance, setYesBalance] = useState<number>(0);
//   const [noBalance, setNoBalance] = useState<number>(0);
  
//   const [amount, setAmount] = useState("");
//   const [selectedOutcome, setSelectedOutcome] = useState<Outcome>(Outcome.Yes);
//   const [estimatedShares, setEstimatedShares] = useState<number>(0);
//   const [loading, setLoading] = useState(false);

//   // 1. Fetch Data & Normalize Decimals
//   useEffect(() => {
//     if (!program || !address) return;

//     const fetchMarketData = async () => {
//       try {
//         const pubkey = new PublicKey(address as string);
//         const account = await program.account.market.fetch(pubkey);
//         setMarket(account);

//         const balances = await connection.getMultipleAccountsInfo([
//             account.vaultYes,
//             account.vaultNo
//         ]);

//         // READ RAW DATA (u64)
//         const rawYes = balances[0]?.data ? Number(balances[0].data.readBigUInt64LE(64)) : 0;
//         const rawNo = balances[1]?.data ? Number(balances[1].data.readBigUInt64LE(64)) : 0;

//         // CONVERT TO HUMAN READABLE (Divide by 1,000,000)
//         setYesBalance(rawYes / DIVISOR);
//         setNoBalance(rawNo / DIVISOR);

//       } catch (err) {
//         console.error("Failed to fetch market:", err);
//       }
//     };

//     fetchMarketData();
//     const interval = setInterval(fetchMarketData, 5000);
//     return () => clearInterval(interval);

//   }, [program, address, connection]);


//   // 2. Real-Time Math (Now using matching units)
//   useEffect(() => {
//     const inputAmount = parseFloat(amount);
    
//     if (isNaN(inputAmount) || inputAmount <= 0) {
//         setEstimatedShares(0);
//         return;
//     }

//     let swapOutput = 0;

//     // Both 'inputAmount' and 'balances' are now in Human Units (e.g. 100.50)
//     // So the math will work correctly.
//     if (selectedOutcome === Outcome.Yes) {
//         swapOutput = calculateSwapOutput(noBalance, yesBalance, inputAmount);
//     } else {
//         swapOutput = calculateSwapOutput(yesBalance, noBalance, inputAmount);
//     }

//     setEstimatedShares(inputAmount + swapOutput);

//   }, [amount, selectedOutcome, yesBalance, noBalance]);

  
//   // 3. Handle Trade (Multiply back to Raw Units for Blockchain)
//   const handleTrade = async () => {
//     if (!program || !market || !wallet.publicKey || !wallet.signTransaction) return;
    
//     try {
//         setLoading(true);
//         const connection = program.provider.connection;
        
//         // CONVERT INPUT BACK TO RAW UNITS FOR TRANSACTION
//         const inputVal = new BN(parseFloat(amount) * DIVISOR); 

//         const payerCollateralAccount = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey);
//         const payerYesAccount = await getAssociatedTokenAddress(market.yesMint, wallet.publicKey);
//         const payerNoAccount = await getAssociatedTokenAddress(market.noMint, wallet.publicKey);

//         // Strict Balance Check
//         try {
//             const usdcAccount = await getAccount(connection, payerCollateralAccount);
//             const balance = Number(usdcAccount.amount);
//             if (balance < inputVal.toNumber()) {
//                 alert(`Insufficient Funds. You have ${balance / DIVISOR} USDC.`);
//                 setLoading(false);
//                 return; 
//             }
//         } catch (e) {
//             alert("Error: You do not have a USDC Account.");
//             setLoading(false);
//             return; 
//         }

//         const transaction = new Transaction();
//         transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));

//         // Account Creation Logic
//         try { await getAccount(connection, payerYesAccount); } 
//         catch (e) {
//             transaction.add(createAssociatedTokenAccountInstruction(wallet.publicKey, payerYesAccount, wallet.publicKey, market.yesMint));
//         }
//         try { await getAccount(connection, payerNoAccount); } 
//         catch (e) {
//             transaction.add(createAssociatedTokenAccountInstruction(wallet.publicKey, payerNoAccount, wallet.publicKey, market.noMint));
//         }

//         const buyIx = await program.methods
//             .buy(inputVal, selectedOutcome === Outcome.Yes ? { yes: {} } : { no: {} }, new BN(0))
//             .accounts({
//                 market: new PublicKey(address as string),
//                 payerCollateralAccount, payerYesAccount, payerNoAccount,
//                 vaultCollateral: market.vaultCollateral,
//                 vaultYes: market.vaultYes, vaultNo: market.vaultNo,
//                 yesMint: market.yesMint, noMint: market.noMint,
//             })
//             .instruction();

//         transaction.add(buyIx);

//         const { blockhash } = await connection.getLatestBlockhash();
//         transaction.recentBlockhash = blockhash;
//         transaction.feePayer = wallet.publicKey;

//         const signature = await wallet.sendTransaction(transaction, connection);
//         console.log("Trade TX Signature:", signature);
//         await connection.confirmTransaction(signature, "processed");

//         alert(`Trade Successful!`);
//         setAmount(""); 
        
//     } catch (err: any) {
//         console.error("Trade failed:", err);
//         alert("Trade failed: " + err.message);
//     } finally {
//         setLoading(false);
//     }
//   };


//   if (!market) return <div className="text-white text-center mt-20">Loading Market...</div>;

//   const probYes = calculatePrice(yesBalance, noBalance);
//   const probNo = 100 - probYes;
  
//   // Only calculate avg price if we have an estimate
//   const avgPrice = estimatedShares > 0 ? (parseFloat(amount) / estimatedShares) * 100 : 0;

//   return (
//     <main className="min-h-screen bg-black text-white">
//       <Navbar />
//       <div className="flex justify-center p-6">
//         <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
            
//             {/* Left Column */}
//             <div className="md:col-span-2 space-y-6">
//                 <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
//                     <h1 className="text-3xl font-bold mb-4">{market.question}</h1>
//                     <div className="flex gap-4 text-sm text-gray-400">
//                         <span>Ends: {new Date(market.endTime.toNumber() * 1000).toLocaleDateString()}</span>
//                         {/* CORRECTED LIQUIDITY DISPLAY */}
//                         <span>Liquidity: ${(yesBalance + noBalance).toLocaleString()} USDC</span>
//                     </div>
//                 </div>

//                 <div className="grid grid-cols-2 gap-4">
//                     <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probYes > probNo ? 'border-green-500 bg-green-900/20' : 'border-gray-800 bg-gray-900'}`}>
//                         <span className="text-gray-400 mb-2">YES</span>
//                         <span className="text-4xl font-bold text-green-400">{probYes.toFixed(1)}%</span>
//                     </div>
//                     <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probNo > probYes ? 'border-red-500 bg-red-900/20' : 'border-gray-800 bg-gray-900'}`}>
//                         <span className="text-gray-400 mb-2">NO</span>
//                         <span className="text-4xl font-bold text-red-400">{probNo.toFixed(1)}%</span>
//                     </div>
//                 </div>

//                 {/* LIQUIDITY WARNING: If pool is < $100, warn the user */}
//                 {(yesBalance + noBalance) < 100 && (
//                      <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded text-center">
//                         <p className="text-yellow-500 mb-2">
//                            ⚠️ <b>Low Liquidity Warning (${(yesBalance + noBalance).toFixed(2)})</b><br/>
//                            Small bets will cause 100% price swings. Please add more liquidity.
//                         </p>
//                         {/* <button 
//                             className="bg-yellow-600 px-4 py-2 rounded font-bold hover:bg-yellow-500 mt-2"
//                             onClick={async () => {
//                                 // Add 1000 USDC
//                                 const amt = new BN(1000 * DIVISOR); 
//                                 const payer = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey!);
//                                 await program?.methods.addLiquidity(amt)
//                                 .accounts({
//                                     market: new PublicKey(address as string),
//                                     payerCollateralAccount: payer,
//                                     vaultCollateral: market.vaultCollateral,
//                                     yesMint: market.yesMint, noMint: market.noMint,
//                                     vaultYes: market.vaultYes, vaultNo: market.vaultNo,
//                                 })
//                                 .rpc();
//                                 alert("Liquidity Added!");
//                             }}
//                         >
//                             Add $1000 Liquidity
//                         </button> */}
//                         {/* ... inside the Low Liquidity Warning div ... */}
//                         <button 
//                             className="bg-yellow-600 px-4 py-2 rounded font-bold hover:bg-yellow-500 mt-2"
//                             onClick={async () => {
//                                 try {
//                                     // 1. Amount: 10,000 Tokens (with 6 decimals)
//                                     // If your token has 9 decimals, change 1000000 to 1000000000
//                                     const amountToAdd = 10000; 
//                                     const decimals = 1000000; 
//                                     const amt = new BN(amountToAdd * decimals); 

//                                     // 2. Get your Token Account for this custom token
//                                     const payer = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey!);

//                                     // 3. Check if you actually have the account (Safety check)
//                                     try {
//                                         await getAccount(connection, payer);
//                                     } catch(e) {
//                                         alert("Error: You don't have an account for this Custom Token yet. Please receive some first.");
//                                         return;
//                                     }

//                                     // 4. Send Transaction
//                                     const tx = await program?.methods.addLiquidity(amt)
//                                     .accounts({
//                                         market: new PublicKey(address as string),
//                                         payerCollateralAccount: payer,
//                                         vaultCollateral: market.vaultCollateral,
//                                         yesMint: market.yesMint, noMint: market.noMint,
//                                         vaultYes: market.vaultYes, vaultNo: market.vaultNo,
//                                     })
//                                     .rpc();
                                    
//                                     console.log("Liquidity TX:", tx);
//                                     alert(`Success! Added $${amountToAdd} Liquidity.`);
                                    
//                                     // Force refresh data
//                                     window.location.reload();
                                    
//                                 } catch (e: any) {
//                                     console.error(e);
//                                     alert("Liquidity Add Failed: " + e.toString());
//                                 }
//                             }}
//                         >
//                             Add $10,000 Liquidity
//                         </button>
//                     </div>
//                 )}
//             </div>

//             {/* Right Column: Trade */}
//             <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit">
//                 <h2 className="text-xl font-bold mb-6">Trade</h2>
                
//                 <div className="flex bg-black p-1 rounded mb-6">
//                     <button onClick={() => setSelectedOutcome(Outcome.Yes)} className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.Yes ? 'bg-green-600 text-white' : 'text-gray-500'}`}>YES</button>
//                     <button onClick={() => setSelectedOutcome(Outcome.No)} className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.No ? 'bg-red-600 text-white' : 'text-gray-500'}`}>NO</button>
//                 </div>

//                 <div className="mb-4">
//                     <label className="block text-gray-400 text-sm mb-2">Amount (USDC)</label>
//                     <div className="relative">
//                         <input 
//                             type="number" 
//                             className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none"
//                             placeholder="0.00"
//                             value={amount}
//                             onChange={(e) => setAmount(e.target.value)}
//                         />
//                         <span className="absolute right-4 top-3 text-gray-500">USDC</span>
//                     </div>
//                 </div>

//                 <div className="bg-black/50 p-4 rounded mb-6 text-sm">
//                     <div className="flex justify-between mb-2">
//                         <span className="text-gray-400">Est. Shares</span>
//                         <span className="font-mono text-white">{estimatedShares.toFixed(2)}</span>
//                     </div>
//                     <div className="flex justify-between">
//                         <span className="text-gray-400">Avg. Price</span>
//                         <span className="font-mono text-white">{avgPrice.toFixed(1)}¢</span>
//                     </div>
//                     <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
//                         <span className="text-gray-400">Potential Return</span>
//                         <span className="text-green-400 font-bold">
//                             {estimatedShares > 0 ? `+$${(estimatedShares - parseFloat(amount)).toFixed(2)}` : "$0.00"}
//                         </span>
//                     </div>
//                 </div>

//                 {/* <button 
//                     onClick={handleTrade}
//                     disabled={loading || !wallet.connected}
//                     className={`w-full py-4 rounded font-bold text-lg transition ${loading ? "bg-gray-700" : selectedOutcome === Outcome.Yes ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}
//                 >
//                     {loading ? "Confirming..." : `Buy ${selectedOutcome === Outcome.Yes ? 'YES' : 'NO'}`}
//                 </button> */}
//                 <button 
//                     onClick={handleTrade}
//                     disabled={loading || !wallet.connected || isExpired} // <--- ADD isExpired
//                     className={`w-full py-4 rounded font-bold text-lg transition ${
//                         isExpired ? "bg-gray-700 cursor-not-allowed" : // <--- Gray out if expired
//                         loading ? "bg-gray-700" :
//                         !wallet.connected ? "bg-blue-600" :
//                         selectedOutcome === Outcome.Yes ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
//                     }`}
//                 >
//                     {isExpired ? "Market Ended" : // <--- Change Text
//                     !wallet.connected ? "Connect Wallet" : 
//                     loading ? "Confirming..." : 
//                     `Buy ${selectedOutcome === Outcome.Yes ? 'YES' : 'NO'}`}
//                 </button>
//                 <p className="text-center text-xs text-gray-500 mt-4">Fee: 2.0% • Slippage: Auto</p>
//             </div>
//         </div>
//       </div>
//     </main>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { 
    getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction, 
    getAccount 
} from "@solana/spl-token";
import { useProgram } from "../../hooks/useProgram";
import Navbar from "../../components/Navbar";
import { calculateSwapOutput, calculatePrice } from "../../utils/amm";

enum Outcome {
    Yes = 0,
    No = 1,
}

// CONFIGURATION
// If your custom token has 9 decimals, change this to 9.
// Standard USDC is 6. Most custom SPL tokens are 6 or 9.
const DECIMALS = 6; 
const DIVISOR = Math.pow(10, DECIMALS);

export default function MarketPage() {
  const { address } = useParams();
  const { program } = useProgram();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [market, setMarket] = useState<any>(null);
  
  // Balances in HUMAN READABLE format (e.g. 500.00)
  const [yesBalance, setYesBalance] = useState<number>(0);
  const [noBalance, setNoBalance] = useState<number>(0);
  
  const [amount, setAmount] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome>(Outcome.Yes);
  const [estimatedShares, setEstimatedShares] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // 1. Fetch Data & Normalize Decimals
  useEffect(() => {
    if (!program || !address) return;

    const fetchMarketData = async () => {
      try {
        const pubkey = new PublicKey(address as string);
        // @ts-expect-error
        const account = await program.account.market.fetch(pubkey);
        setMarket(account);

        // Check Expiry
        const now = Date.now() / 1000;
        setIsExpired(now > account.endTime.toNumber());

        const balances = await connection.getMultipleAccountsInfo([
            account.vaultYes,
            account.vaultNo
        ]);

        // READ RAW DATA (u64)
        const rawYes = balances[0]?.data ? Number(balances[0].data.readBigUInt64LE(64)) : 0;
        const rawNo = balances[1]?.data ? Number(balances[1].data.readBigUInt64LE(64)) : 0;

        // CONVERT TO HUMAN READABLE
        setYesBalance(rawYes / DIVISOR);
        setNoBalance(rawNo / DIVISOR);

      } catch (err) {
        console.error("Failed to fetch market:", err);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000); // Live Poll
    return () => clearInterval(interval);

  }, [program, address, connection]);


  // 2. Real-Time Math
  useEffect(() => {
    const inputAmount = parseFloat(amount);
    
    if (isNaN(inputAmount) || inputAmount <= 0) {
        setEstimatedShares(0);
        return;
    }

    let swapOutput = 0;

    if (selectedOutcome === Outcome.Yes) {
        swapOutput = calculateSwapOutput(noBalance, yesBalance, inputAmount);
    } else {
        swapOutput = calculateSwapOutput(yesBalance, noBalance, inputAmount);
    }

    setEstimatedShares(inputAmount + swapOutput);

  }, [amount, selectedOutcome, yesBalance, noBalance]);


  // 3. Handle Trade (Buy)
  const handleTrade = async () => {
    if (!program || !market || !wallet.publicKey || !wallet.signTransaction) return;
    
    try {
        setLoading(true);
        const connection = program.provider.connection;
        
        // CONVERT INPUT BACK TO RAW UNITS
        const inputVal = new BN(parseFloat(amount) * DIVISOR); 
        const minOut = new BN(0); // Add slippage logic here for V2

        const payerCollateralAccount = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey);
        const payerYesAccount = await getAssociatedTokenAddress(market.yesMint, wallet.publicKey);
        const payerNoAccount = await getAssociatedTokenAddress(market.noMint, wallet.publicKey);

        // A. Strict Balance Check
        try {
            const usdcAccount = await getAccount(connection, payerCollateralAccount);
            const balance = Number(usdcAccount.amount);
            if (balance < inputVal.toNumber()) {
                alert(`Insufficient Funds. You have ${balance / DIVISOR} Tokens.`);
                setLoading(false);
                return; 
            }
        } catch (e) {
            alert("Error: You do not have an account for this Token.");
            setLoading(false);
            return; 
        }

        // B. Build Transaction
        const transaction = new Transaction();
        // Increase Compute Budget for heavy math + account creation
        transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));

        // C. Check/Create ATA for YES
        try { await getAccount(connection, payerYesAccount); } 
        catch (e) {
            console.log("Creating YES ATA...");
            transaction.add(createAssociatedTokenAccountInstruction(wallet.publicKey, payerYesAccount, wallet.publicKey, market.yesMint));
        }

        // D. Check/Create ATA for NO
        try { await getAccount(connection, payerNoAccount); } 
        catch (e) {
            console.log("Creating NO ATA...");
            transaction.add(createAssociatedTokenAccountInstruction(wallet.publicKey, payerNoAccount, wallet.publicKey, market.noMint));
        }

        // E. Add Buy Instruction
        const buyIx = await program.methods
            .buy(inputVal, selectedOutcome === Outcome.Yes ? { yes: {} } : { no: {} }, minOut)
            .accounts({
                market: new PublicKey(address as string),
                payerCollateralAccount, payerYesAccount, payerNoAccount,
                vaultCollateral: market.vaultCollateral,
                vaultYes: market.vaultYes, vaultNo: market.vaultNo,
                yesMint: market.yesMint, noMint: market.noMint,
            })
            .instruction();

        transaction.add(buyIx);

        // F. Send
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signature = await wallet.sendTransaction(transaction, connection);
        console.log("Trade TX Signature:", signature);
        
        await connection.confirmTransaction(signature, "processed");

        alert(`Trade Successful!`);
        setAmount(""); 
        
    } catch (err: any) {
        console.error("Trade failed:", err);
        alert("Trade failed: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  // 4. Handle Liquidity (For Admins/LPs)
  const handleLiquidity = async () => {
      try {
          // Add 10,000 Tokens
          const amountToAdd = 10000; 
          const amt = new BN(amountToAdd * DIVISOR); 
          
          const payer = await getAssociatedTokenAddress(market.collateralMint, wallet.publicKey!);
          
          // Safety Check
          try { await getAccount(connection, payer); } 
          catch(e) { alert("You don't have the collateral token."); return; }

          const tx = await program?.methods.addLiquidity(amt)
          .accounts({
              market: new PublicKey(address as string),
              payerCollateralAccount: payer,
              vaultCollateral: market.vaultCollateral,
              yesMint: market.yesMint, noMint: market.noMint,
              vaultYes: market.vaultYes, vaultNo: market.vaultNo,
          })
          .rpc();
          
          alert(`Success! Added ${amountToAdd} Liquidity.`);
          window.location.reload();
      } catch(e: any) {
          console.error(e);
          alert("Liquidity Failed: " + e.toString());
      }
  };


  if (!market) return <div className="text-white text-center mt-20">Loading Market...</div>;

  const probYes = calculatePrice(yesBalance, noBalance);
  const probNo = 100 - probYes;
  
  const avgPrice = estimatedShares > 0 ? (parseFloat(amount) / estimatedShares) * 100 : 0;
  const isResolved = market.resolved;

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="flex justify-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Stats */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
                    <h1 className="text-3xl font-bold mb-4">{market.question}</h1>
                    <div className="flex gap-4 text-sm text-gray-400">
                        <span>Ends: {new Date(market.endTime.toNumber() * 1000).toLocaleDateString()}</span>
                        <span>Liquidity: ${(yesBalance + noBalance).toLocaleString()}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probYes > probNo ? 'border-green-500 bg-green-900/20' : 'border-gray-800 bg-gray-900'}`}>
                        <span className="text-gray-400 mb-2">YES</span>
                        <span className="text-4xl font-bold text-green-400">{probYes.toFixed(1)}%</span>
                    </div>
                    <div className={`p-6 rounded-xl border-2 flex flex-col items-center ${probNo > probYes ? 'border-red-500 bg-red-900/20' : 'border-gray-800 bg-gray-900'}`}>
                        <span className="text-gray-400 mb-2">NO</span>
                        <span className="text-4xl font-bold text-red-400">{probNo.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Liquidity Warning / Button */}
                {(yesBalance + noBalance) < 100 && !isExpired && !isResolved && (
                     <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded text-center">
                        <p className="text-yellow-500 mb-2">
                           ⚠️ <b>Low Liquidity (${(yesBalance + noBalance).toFixed(2)})</b><br/>
                           Prices will swing wildly.
                        </p>
                        <button 
                            className="bg-yellow-600 px-4 py-2 rounded font-bold hover:bg-yellow-500 mt-2"
                            onClick={handleLiquidity}
                        >
                            Add 10,000 Liquidity
                        </button>
                    </div>
                )}

                {/* Status Messages */}
                {isExpired && !isResolved && <div className="bg-gray-800 p-4 text-center rounded border border-gray-600 text-gray-300">🛑 Market Expired. Betting Closed.</div>}
                {isResolved && <div className="bg-blue-900/30 p-4 text-center rounded border border-blue-600 text-blue-300">✅ Market Resolved. Check Portfolio to Claim.</div>}
            </div>

            {/* Right Column: Trade Panel */}
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit">
                <h2 className="text-xl font-bold mb-6">Trade</h2>
                
                <div className="flex bg-black p-1 rounded mb-6">
                    <button onClick={() => setSelectedOutcome(Outcome.Yes)} className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.Yes ? 'bg-green-600 text-white' : 'text-gray-500'}`}>YES</button>
                    <button onClick={() => setSelectedOutcome(Outcome.No)} className={`flex-1 py-2 rounded font-bold transition ${selectedOutcome === Outcome.No ? 'bg-red-600 text-white' : 'text-gray-500'}`}>NO</button>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-2">Amount</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isExpired || isResolved}
                        />
                    </div>
                </div>

                <div className="bg-black/50 p-4 rounded mb-6 text-sm">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Est. Shares</span>
                        <span className="font-mono text-white">{estimatedShares.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Avg. Price</span>
                        <span className="font-mono text-white">{avgPrice.toFixed(1)}¢</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
                        <span className="text-gray-400">Potential Return</span>
                        <span className="text-green-400 font-bold">
                            {estimatedShares > 0 ? `+${(estimatedShares - parseFloat(amount)).toFixed(2)}` : "0.00"}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={handleTrade}
                    disabled={loading || !wallet.connected || isExpired || isResolved}
                    className={`w-full py-4 rounded font-bold text-lg transition ${
                        (isExpired || isResolved) ? "bg-gray-700 cursor-not-allowed" :
                        loading ? "bg-gray-700" :
                        !wallet.connected ? "bg-blue-600" :
                        selectedOutcome === Outcome.Yes ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
                    }`}
                >
                    {(isExpired || isResolved) ? "Market Closed" : 
                     loading ? "Confirming..." : 
                     `Buy ${selectedOutcome === Outcome.Yes ? 'YES' : 'NO'}`}
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">Fee: 2.0% • Slippage: Auto</p>
                
                {/* Debug Panel Hook */}
                <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-600 text-center break-all">
                    Mint: {market.collateralMint.toString()}
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}