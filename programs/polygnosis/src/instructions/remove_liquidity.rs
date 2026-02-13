use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn};
use crate::state::Market;
use crate::constants::*;
use crate::errors::PolygnosisError;

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // Must be the market creator for MVP

    #[account(
        mut,
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        has_one = authority // Only creator can pull liquidity
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub vault_collateral: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_collateral_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_yes: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_no: Account<'info, TokenAccount>,

    #[account(mut)]
    pub yes_mint: Account<'info, Mint>,
    #[account(mut)]
    pub no_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    
    // We can only remove liquidity if we hold the tokens. 
    // In this simplified MVP, the "AMM" owns the liquidity, and the "Authority" controls the AMM.
    // In a Pro V2, we would burn "LP Tokens".
    // For now, we simply empty the AMM vaults of any matching sets.

    let yes_balance = ctx.accounts.vault_yes.amount;
    let no_balance = ctx.accounts.vault_no.amount;

    // We can only merge equal amounts (1 YES + 1 NO = 1 USDC)
    // The surplus (imbalance) implies active bets that haven't been resolved yet.
    // Usually, LPs remove liquidity *after* resolution or accept the imbalance.
    
    // Let's assume we remove the minimum of the two (the complete sets).
    let remove_amount = std::cmp::min(yes_balance, no_balance);

    if remove_amount == 0 {
        return err!(PolygnosisError::InsufficientLiquidity);
    }

    let market_id_bytes = market.market_id.to_le_bytes();
    let seeds = &[SEED_MARKET, market_id_bytes.as_ref(), &[market.bump]];
    let signer = &[&seeds[..]];

    // 1. Burn YES from AMM Vault
    token::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.yes_mint.to_account_info(),
                from: ctx.accounts.vault_yes.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer
        ),
        remove_amount,
    )?;

    // 2. Burn NO from AMM Vault
    token::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.no_mint.to_account_info(),
                from: ctx.accounts.vault_no.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer
        ),
        remove_amount,
    )?;

    // 3. Transfer USDC from Vault to Admin
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_collateral.to_account_info(),
                to: ctx.accounts.user_collateral_account.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer
        ),
        remove_amount,
    )?;

    msg!("Liquidity Removed: {} USDC", remove_amount);

    Ok(())
}