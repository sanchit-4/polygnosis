// import { useMemo } from "react";
// import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
// import { AnchorProvider, Program, Idl, setProvider } from "@coral-xyz/anchor";
// import { PublicKey } from "@solana/web3.js";
// import idl from "../idl/polygnosis.json"; // Import the JSON we just copied

// // The address of your deployed program (from lib.rs)
// // REPLACE THIS WITH YOUR ACTUAL PROGRAM ID FROM anchor keys list
// const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"); 

// export const useProgram = () => {
//   const { connection } = useConnection();
//   const wallet = useAnchorWallet();

//   const program = useMemo(() => {
//     if (!wallet) return null;

//     // 1. Create the Provider
//     // The provider is the "Authenticated Connection"
//     // It combines the connection (Read) + the wallet (Write/Sign)
//     const provider = new AnchorProvider(connection, wallet, {
//       preflightCommitment: "processed",
//     });

//     // Set the provider as the default for the library
//     setProvider(provider);

//     // 2. Initialize the Program
//     // This creates the object we use to call functions like .createMarket()
//     // It is typed as <any> for now, but in a strict setup, we'd use the IDL type.
//     return new Program(idl as Idl, provider);
//   }, [connection, wallet]);

//   return { program };
// };


import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, Idl, setProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../idl/polygnosis.json";
 

// YOUR DEPLOYED PROGRAM ID
const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"); 

export const useProgram = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    // 1. Prepare the Provider
    // If wallet is connected, use it. 
    // If NOT connected, create a "Dummy Wallet" that can read but not sign.
    const providerWallet = wallet || {
      publicKey: new PublicKey("11111111111111111111111111111111"), // Dummy Key
      signTransaction: async () => { throw new Error("Wallet not connected"); },
      signAllTransactions: async () => { throw new Error("Wallet not connected"); },
    };

    const provider = new AnchorProvider(connection, providerWallet as any, {
      preflightCommitment: "processed",
    });

    setProvider(provider);

    // 2. Initialize Program
    return new Program(idl as Idl, provider);
  }, [connection, wallet]);

  return { program };
};