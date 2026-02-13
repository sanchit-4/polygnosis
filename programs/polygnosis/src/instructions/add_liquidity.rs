use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};
use crate::state::Market;
use crate::constants::*;
use crate::errors::PolygnosisError;

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    // The user's USDC account
    #[account(mut)]
    pub payer_collateral_account: Account<'info, TokenAccount>,

    // The Market's Vault (where we store the USDC)
    #[account(
        mut,
        seeds = [SEED_VAULT, market.key().as_ref()],
        bump
    )]
    pub vault_collateral: Account<'info, TokenAccount>,

    // The Mints (needed to mint YES/NO)
    #[account(mut, address = market.yes_mint)]
    pub yes_mint: Account<'info, Mint>,
    #[account(mut, address = market.no_mint)]
    pub no_mint: Account<'info, Mint>,

    // The AMM Vaults (we put the minted tokens here)
    #[account(mut, address = market.vault_yes)]
    pub vault_yes: Account<'info, TokenAccount>,
    #[account(mut, address = market.vault_no)]
    pub vault_no: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    
}

pub fn handler(ctx: Context<AddLiquidity>, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;
    
    // Cannot add liquidity if expired
    if clock.unix_timestamp > market.end_time {
        return err!(PolygnosisError::MarketExpired);
    }

    // Cannot add liquidity if already resolved
    if market.resolved {
        return err!(PolygnosisError::MarketAlreadyResolved);
    }

    // 1. Transfer USDC from User to Vault
    let transfer_accounts = Transfer {
        from: ctx.accounts.payer_collateral_account.to_account_info(),
        to: ctx.accounts.vault_collateral.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_accounts);
    token::transfer(cpi_ctx, amount)?;

    // 2. Define Seeds for Minting (Market PDA signs the mint)
    let market_id_bytes = market.market_id.to_le_bytes();
    let seeds = &[
        SEED_MARKET,
        market_id_bytes.as_ref(),
        &[market.bump],
    ];
    let signer = &[&seeds[..]];

    // 3. Mint YES tokens to AMM Vault
    let mint_yes_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.yes_mint.to_account_info(),
            to: ctx.accounts.vault_yes.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        },
        signer,
    );
    token::mint_to(mint_yes_ctx, amount)?;

    // 4. Mint NO tokens to AMM Vault
    let mint_no_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.no_mint.to_account_info(),
            to: ctx.accounts.vault_no.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        },
        signer,
    );
    token::mint_to(mint_no_ctx, amount)?;

    msg!("Liquidity added: {} USDC", amount);

    Ok(())
}