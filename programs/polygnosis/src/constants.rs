use anchor_lang::prelude::*;

#[constant]
pub const SEED_MARKET: &[u8] = b"market";

#[constant]
pub const SEED_VAULT: &[u8] = b"vault";

#[constant]
pub const SEED_YES_MINT: &[u8] = b"yes_mint";

#[constant]
pub const SEED_NO_MINT: &[u8] = b"no_mint";

// Precision for math (since Solana has no decimals)
pub const BASIS_POINTS: u64 = 10000;

pub const ADMIN_PUBKEY: &str = "REPLACE_WITH_YOUR_WALLET_ADDRESS";