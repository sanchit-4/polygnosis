use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Burn, Transfer};
use crate::state::Market;
use crate::constants::*;

#[derive(Accounts)]
pub struct Merge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_collateral_account: Account<'info, TokenAccount>,

    #[account(mut, address = market.yes_mint)]
    pub yes_mint: Account<'info, Mint>,
    #[account(mut, address = market.no_mint)]
    pub no_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [SEED_VAULT, market.key().as_ref()],
        bump
    )]
    pub vault_collateral: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Merge>, amount: u64) -> Result<()> {
    // 1. Burn YES
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.yes_mint.to_account_info(),
                from: ctx.accounts.user_yes_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            }
        ),
        amount,
    )?;

    // 2. Burn NO
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.no_mint.to_account_info(),
                from: ctx.accounts.user_no_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            }
        ),
        amount,
    )?;

    // 3. Send USDC from Vault to User
    let market_id_bytes = ctx.accounts.market.market_id.to_le_bytes();
    let seeds = &[SEED_MARKET, market_id_bytes.as_ref(), &[ctx.accounts.market.bump]];
    let signer = &[&seeds[..]];

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
        amount,
    )?;

    msg!("Merged {} Sets for {} USDC", amount, amount);
    Ok(())
}