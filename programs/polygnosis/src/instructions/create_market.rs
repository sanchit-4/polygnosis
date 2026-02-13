use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::Market;
use crate::constants::*;
use crate::errors::PolygnosisError; 
use std::str::FromStr;

#[derive(Accounts)]
#[instruction(market_id: u64, question: String, end_time: i64)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    // The Market State Account (PDA)
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
        seeds = [SEED_MARKET, market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    // The Token accepted for bets (e.g., USDC)
    pub collateral_mint: Account<'info, Mint>,

    // --- YES TOKEN SETUP ---
    #[account(
        init,
        payer = authority,
        mint::decimals = 6, // Match USDC decimals
        mint::authority = market, // The Market contract owns the mint
        seeds = [SEED_YES_MINT, market.key().as_ref()],
        bump
    )]
    pub yes_mint: Account<'info, Mint>,

    // --- NO TOKEN SETUP ---
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [SEED_NO_MINT, market.key().as_ref()],
        bump
    )]
    pub no_mint: Account<'info, Mint>,

    // --- VAULTS SETUP ---
    // 1. Where users deposit USDC
    #[account(
        init,
        payer = authority,
        token::mint = collateral_mint,
        token::authority = market,
        seeds = [SEED_VAULT, market.key().as_ref()],
        bump
    )]
    pub vault_collateral: Account<'info, TokenAccount>,

    // 2. Where the AMM holds YES tokens
    #[account(
        init,
        payer = authority,
        token::mint = yes_mint,
        token::authority = market,
        seeds = [b"amm_yes", market.key().as_ref()],
        bump
    )]
    pub vault_yes: Account<'info, TokenAccount>,

    // 3. Where the AMM holds NO tokens
    #[account(
        init,
        payer = authority,
        token::mint = no_mint,
        token::authority = market,
        seeds = [b"amm_no", market.key().as_ref()],
        bump
    )]
    pub vault_no: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    market_id: u64,
    question: String,
    end_time: i64,
) -> Result<()> {
    let admin_key = Pubkey::from_str(ADMIN_PUBKEY).unwrap();
    if ctx.accounts.authority.key() != admin_key {
        return err!(PolygnosisError::Unauthorized);
    }

    let market = &mut ctx.accounts.market;
    
    // Set Metadata
    market.authority = ctx.accounts.authority.key();
    market.market_id = market_id;
    market.question = question;
    market.created_at = Clock::get()?.unix_timestamp;
    market.end_time = end_time;
    
    // Set Token Info
    market.yes_mint = ctx.accounts.yes_mint.key();
    market.no_mint = ctx.accounts.no_mint.key();
    market.collateral_mint = ctx.accounts.collateral_mint.key();
    
    // Set Vault Info
    market.vault_collateral = ctx.accounts.vault_collateral.key();
    market.vault_yes = ctx.accounts.vault_yes.key();
    market.vault_no = ctx.accounts.vault_no.key();
    
    // Set State
    market.resolved = false;
    market.winner = None;
    
    // --- FIX FOR ANCHOR 0.32 ---
    // Access bumps directly as fields
    market.bump = ctx.bumps.market; 

    msg!("Market {} created: {}", market_id, market.question);
    
    Ok(())
}