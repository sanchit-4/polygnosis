use anchor_lang::prelude::*;
use crate::state::Market;
use crate::constants::SEED_MARKET;

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        close = authority, // <--- This magic line refunds SOL to authority
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        has_one = authority,
        constraint = market.resolved == true // Can only close if resolved
    )]
    pub market: Account<'info, Market>,
}

pub fn handler(_ctx: Context<CloseMarket>) -> Result<()> {
    msg!("Market Closed. Rent reclaimed.");
    Ok(())
}