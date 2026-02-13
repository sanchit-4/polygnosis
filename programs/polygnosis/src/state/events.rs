use anchor_lang::prelude::*;

#[event]
pub struct TradeEvent {
    pub market_id: u64,
    pub is_buy: bool,      // true = Buy, false = Sell
    pub outcome_index: u8, // 0 = YES, 1 = NO
    pub amount_in: u64,
    pub amount_out: u64,
    pub price: u64,        // Implied probability (basis points)
    pub timestamp: i64,
    pub user: Pubkey,
}

#[event]
pub struct LiquidityEvent {
    pub market_id: u64,
    pub is_add: bool,
    pub amount: u64,
    pub user: Pubkey,
}