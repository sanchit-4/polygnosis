"use client"; // This tells Next.js this file runs in the browser, not the server

import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import the default styles for the wallet modal (popup)
import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
  // 1. Select the Network
  // For development, we use 'devnet'.
  // If you are running 'solana-test-validator' locally, you would use "http://127.0.0.1:8899"
  const network = WalletAdapterNetwork.Devnet;

  // 2. Define the RPC Endpoint
  // This is the URL we use to read data from the blockchain.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // 3. Define the Wallets
  // We initialize the specific wallet adapters we want to support.
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    // ConnectionProvider: Handles the HTTP connection to Solana
    <ConnectionProvider endpoint={endpoint}>
      {/* WalletProvider: Handles the state of the user's wallet (connected/disconnected) */}
      <WalletProvider wallets={wallets} autoConnect>
        {/* WalletModalProvider: The UI popup that asks "Select your Wallet" */}
        <WalletModalProvider>
            {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}