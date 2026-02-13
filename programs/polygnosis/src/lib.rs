use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;
pub mod math; // Don't forget this!


use instructions::*;

declare_id!("5CfAUpyrfNB41oLcqAXNKuG8WKPkpX7kbL6jysJrioac"); 

#[program]
pub mod polygnosis {
    use super::*;

    pub fn create_market(
        ctx: Context<CreateMarket>, 
        market_id: u64, 
        question: String, 
        end_time: i64
    ) -> Result<()> {
        instructions::create_market::handler(ctx, market_id, question, end_time)
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount: u64) -> Result<()> {
        instructions::add_liquidity::handler(ctx, amount)
    }

    pub fn buy(ctx: Context<Buy>, amount_usdc: u64, outcome: Outcome, min_out: u64) -> Result<()> {
        instructions::buy::handler(ctx, amount_usdc, outcome, min_out)
    }
    
    pub fn resolve_market(ctx: Context<ResolveMarket>, winner: bool) -> Result<()> {
        instructions::resolve_market::handler(ctx, winner)
    }

    pub fn redeem(ctx: Context<Redeem>, amount: u64) -> Result<()> {
        instructions::redeem::handler(ctx, amount)
    }

    pub fn swap(ctx: Context<SwapTokens>, amount_in: u64, direction: SwapDirection, min_out: u64) -> Result<()> {
        instructions::swap::handler(ctx, amount_in, direction, min_out)
    }

    pub fn merge(ctx: Context<Merge>, amount: u64) -> Result<()> {
        instructions::merge::handler(ctx, amount)
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
        instructions::remove_liquidity::handler(ctx, amount)
    }

    pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
        instructions::close_market::handler(ctx)
    }
    
}