use anchor_lang::prelude::*;
use crate::state::Market;
use crate::errors::PolygnosisError;
use crate::constants::SEED_MARKET;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // Only the admin can call this for now

    #[account(
        mut,
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        has_one = authority // Security check: Is this the market creator?
    )]
    pub market: Account<'info, Market>,
}

pub fn handler(ctx: Context<ResolveMarket>, winner: bool) -> Result<()> {
    let market = &mut ctx.accounts.market;

    if market.resolved {
        return err!(PolygnosisError::MarketAlreadyResolved);
    }

    market.resolved = true;
    market.winner = Some(winner); // true = YES won, false = NO won

    msg!("Market Resolved. Winner is: {}", if winner { "YES" } else { "NO" });

    Ok(())
}