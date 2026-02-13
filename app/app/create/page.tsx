// "use client";

// import { useState, useEffect } from "react";
// import { useProgram } from "../hooks/useProgram"; // Our new hook
// import { BN } from "@coral-xyz/anchor"; // BigNumber library for Solana math
// import { PublicKey } from "@solana/web3.js";
// import { useRouter } from "next/navigation";
// import { useWallet } from "@solana/wallet-adapter-react";
// import Navbar from "../components/Navbar";

// const ADMIN_ADDRESS = "HEtRGZPUJX5WVx4aXE9EnDxK4er6ZcajMccaotiZH8Z5";

// export default function CreateMarket() {
//   const { program } = useProgram();
//   const router = useRouter();
//   const wallet = useWallet()
//   const [isAdmin, setIsAdmin] = useState(false);

//   useEffect(() => {
//     if (wallet.publicKey && wallet.publicKey.toString() === ADMIN_ADDRESS) {
//         setIsAdmin(true);
//     } else {
//         setIsAdmin(false);
//     }
//   }, [wallet.publicKey]);

//   if (!isAdmin) {
//       return (
//         <main className="min-h-screen bg-black text-white">
//             <Navbar />
//             <div className="flex flex-col items-center justify-center h-[80vh]">
//                 <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
//                 <p className="text-gray-400 mt-4">Only the Administrator can create markets.</p>
//                 <p className="text-gray-600 text-sm mt-2">Current Wallet: {wallet.publicKey?.toString()}</p>
//             </div>
//         </main>
//       );
//   }
//   const [question, setQuestion] = useState("");
//   const [expiry, setExpiry] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleCreate = async () => {
//     if (!program) return alert("Please connect your wallet!");
//     if (!question || !expiry) return alert("Fill all fields");

//     try {
//       setLoading(true);

//       // 1. Generate a unique ID for the market
//       const marketId = new BN(Date.now()); // Using timestamp as ID for uniqueness
//       const endTime = new BN(new Date(expiry).getTime() / 1000); // Convert date to unix timestamp

//       // 2. Calculate the PDA (Program Derived Address)
//       // We need to know where the market account will be created to pass it in (optional in newer Anchor, but good practice)
//       // Actually, Anchor finds PDAs automatically if we set up the context right, 
//       // but let's just call the method.

//       // 3. Send the Transaction
//       // program.methods.methodName(args).accounts({ ... }).rpc()
//       const tx = await program.methods
//         .createMarket(marketId, question, endTime)
//         .accounts({
//            // Anchor automatically infers: authority, systemProgram, etc.
//            // We just need to define the mints if they are not PDAs, but ours ARE PDAs.
//            // So often, you just need to pass the token mint which is standard USDC.
//            // For MVP, we'll create a dummy mint or pass system program? 
//            // Wait, our Rust code expects `collateralMint`. We need a valid USDC mint address on Devnet.
//            collateralMint: new PublicKey("2saBrUcN5bZYxj6BJnpuT6r4iZQQ7vdbUXzr8nHenfiL"), // Devnet USDC Faucet
//         })
//         .rpc();

//       console.log("Transaction Signature:", tx);
//       alert("Market Created! TX: " + tx);
//       router.push("/"); // Go back home
//     } catch (err) {
//       console.error("Error creating market:", err);
//       alert("Failed: " + JSON.stringify(err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="min-h-screen bg-black text-white">
//       <Navbar />
//       <div className="flex flex-col items-center mt-20 p-4">
//         <div className="w-full max-w-md bg-gray-900 p-8 rounded-xl border border-gray-800">
//           <h1 className="text-2xl font-bold mb-6">Create New Market</h1>
          
//           {/* Question Input */}
//           <div className="mb-4">
//             <label className="block text-gray-400 mb-2">Question</label>
//             <input 
//               type="text" 
//               placeholder="Will BTC hit $100k?" 
//               className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none"
//               value={question}
//               onChange={(e) => setQuestion(e.target.value)}
//             />
//           </div>

//           {/* Date Input */}
//           <div className="mb-6">
//             <label className="block text-gray-400 mb-2">End Date</label>
//             <input 
//               type="datetime-local" 
//               className="w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none"
//               value={expiry}
//               onChange={(e) => setExpiry(e.target.value)}
//             />
//           </div>

//           {/* Submit Button */}
//           <button 
//             onClick={handleCreate}
//             disabled={loading}
//             className={`w-full py-3 rounded font-bold transition ${
//                 loading ? "bg-gray-700 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
//             }`}
//           >
//             {loading ? "Creating..." : "Deploy Market"}
//           </button>
//         </div>
//       </div>
//     </main>
//   );
// }



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