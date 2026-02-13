use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Burn, Transfer};
use crate::state::Market;
use crate::constants::*;
use crate::errors::PolygnosisError;

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = market.resolved @ PolygnosisError::MarketNotResolved
    )]
    pub market: Account<'info, Market>,

    // The user's account holding the Winning Tokens
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    // The user's wallet to receive USDC
    #[account(mut)]
    pub user_collateral_account: Account<'info, TokenAccount>,

    // The Market Vault holding the USDC
    #[account(
        mut,
        seeds = [SEED_VAULT, market.key().as_ref()],
        bump
    )]
    pub vault_collateral: Account<'info, TokenAccount>,

    // We need the mint to burn the tokens
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Redeem>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;

    // 1. Verify the user is holding the WINNING mint
    let winner = market.winner.ok_or(PolygnosisError::MarketNotResolved)?;
    
    let winning_mint = if winner {
        market.yes_mint
    } else {
        market.no_mint
    };

    if ctx.accounts.mint.key() != winning_mint {
        // You are trying to redeem the losing token
        return err!(PolygnosisError::InvalidOracle); // Reusing error or create "LosingToken"
    }

    // 2. Burn the Winning Tokens (Remove them from supply)
    let cpi_burn = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        },
    );
    token::burn(cpi_burn, amount)?;

    // 3. Transfer USDC from Vault to User (1 Token = 1 USDC)
    let market_id_bytes = market.market_id.to_le_bytes();
    let seeds = &[
        SEED_MARKET,
        market_id_bytes.as_ref(),
        &[market.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_transfer = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_collateral.to_account_info(),
            to: ctx.accounts.user_collateral_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi_transfer, amount)?;

    msg!("Winnings Claimed: {} USDC", amount);

    Ok(())
}