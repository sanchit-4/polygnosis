import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export interface MarketAccount {
  publicKey: PublicKey;
  account: {
    authority: PublicKey;
    question: string;
    marketId: BN;
    endTime: BN;
    yesMint: PublicKey;
    noMint: PublicKey;
    vaultYes: PublicKey;
    vaultNo: PublicKey;
    vaultCollateral: PublicKey;
    resolved: boolean;
    winner: boolean | null;
  };
}