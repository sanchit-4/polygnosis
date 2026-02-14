"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

// YOUR TOKEN
const COLLATERAL_MINT = new PublicKey("2saBrUcN5bZYxj6BJnpuT6r4iZQQ7vdbUXzr8nHenfiL");

export default function FaucetModal() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey) return;

    const checkBalance = async () => {
      setChecking(true);
      try {
        const ata = await getAssociatedTokenAddress(COLLATERAL_MINT, wallet.publicKey!);
        const account = await getAccount(connection, ata);
        const amount = Number(account.amount);
        
        // If balance is less than 10 tokens, show modal
        if (amount < 10000000) { 
             setShowModal(true);
        }
      } catch (e) {
        // Account doesn't exist = 0 Balance
        setShowModal(true);
      } finally {
        setChecking(false);
      }
    };

    checkBalance();
  }, [wallet.publicKey, connection]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 p-8 rounded-2xl border border-blue-500 max-w-md w-full shadow-2xl relative">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Polygnosis!</h2>
        <p className="text-gray-300 mb-6">
          To place bets on this Testnet, you need <b>Test Tokens</b>. Your wallet currently has 0.
        </p>

        <div className="space-y-4">
          <div className="bg-black p-4 rounded border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Step 1: Copy your Address</p>
            <code className="text-blue-400 text-xs break-all cursor-pointer hover:text-blue-300 block">
              {wallet.publicKey?.toString()}
            </code>
          </div>

          <a 
            href="https://solana-faucet-airdrop.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-center font-bold py-3 rounded-xl transition transform hover:scale-105"
          >
            Go to Faucet & Get 1M Tokens
          </a>

          <button 
            onClick={() => setShowModal(false)}
            className="block w-full text-gray-500 hover:text-white text-sm mt-4"
          >
            I have funds, let me play
          </button>
        </div>
      </div>
    </div>
  );
}