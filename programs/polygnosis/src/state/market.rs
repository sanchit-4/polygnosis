use anchor_lang::prelude::*;

#[account]
pub struct Market {
    // 1. Metadata
    pub authority: Pubkey,       // Admin/Creator who can resolve
    pub market_id: u64,          // Unique Identifier for this market
    pub question: String,        // E.g., "Will ETH > 3k?"
    pub created_at: i64,
    pub end_time: i64,           // When betting stops
    
    // 2. Token Config
    pub yes_mint: Pubkey,        // The YES Token Address
    pub no_mint: Pubkey,         // The NO Token Address
    pub collateral_mint: Pubkey, // The currency used (e.g., USDC)
    
    // 3. Vaults (Where the money lives)
    pub vault_collateral: Pubkey,// Stores the USDC deposited by traders
    pub vault_yes: Pubkey,       // AMM's inventory of YES tokens
    pub vault_no: Pubkey,        // AMM's inventory of NO tokens

    // 4. State
    pub resolved: bool,          // True if Oracle has spoken
    pub winner: Option<bool>,    // Some(true) = YES, Some(false) = NO, None = Unresolved
    
    // 5. Security
    pub bump: u8,                // To validate the PDA
}

impl Market {
    // Calculate space required for this account
    // discriminator (8) + Pubkey (32) + u64 (8) + String (4 + 100 max chars) ...
    pub const LEN: usize = 8 + 32 + 8 + (4 + 100) + 8 + 8 + 32 + 32 + 32 + 32 + 32 + 32 + 1 + 2 + 1;
}