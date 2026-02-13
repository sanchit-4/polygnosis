
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