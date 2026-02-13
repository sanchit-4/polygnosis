use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};
use crate::state::Market;
use crate::constants::*;
use crate::math;
use crate::errors::PolygnosisError;

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = !market.resolved @ PolygnosisError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub payer_collateral_account: Account<'info, TokenAccount>,
    
    // Where we will send the purchased outcomes
    #[account(mut)]
    pub payer_yes_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer_no_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [SEED_VAULT, market.key().as_ref()],
        bump
    )]
    pub vault_collateral: Account<'info, TokenAccount>,

    #[account(mut, address = market.yes_mint)]
    pub yes_mint: Account<'info, Mint>,
    #[account(mut, address = market.no_mint)]
    pub no_mint: Account<'info, Mint>,

    #[account(mut, address = market.vault_yes)]
    pub vault_yes: Account<'info, TokenAccount>,
    #[account(mut, address = market.vault_no)]
    pub vault_no: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum Outcome {
    Yes,
    No,
}

pub fn handler(ctx: Context<Buy>, amount_usdc: u64, outcome: Outcome, min_out: u64) -> Result<()> {
    let market = &ctx.accounts.market;

    let clock = Clock::get()?; // Get blockchain time
    if clock.unix_timestamp > market.end_time {
        return err!(PolygnosisError::MarketExpired);
    }
    
    if market.resolved {
        return err!(PolygnosisError::MarketAlreadyResolved);
    }
    // 1. Transfer USDC to Vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer_collateral_account.to_account_info(),
                to: ctx.accounts.vault_collateral.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount_usdc,
    )?;

    // 2. Prepare Signers
    let market_id_bytes = market.market_id.to_le_bytes();
    let seeds = &[
        SEED_MARKET,
        market_id_bytes.as_ref(),
        &[market.bump],
    ];
    let signer = &[&seeds[..]];

    // 3. Logic based on Outcome
    let total_shares_received = match outcome {
        Outcome::Yes => {
            // A. Mint YES to User
            token::mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.yes_mint.to_account_info(),
                        to: ctx.accounts.payer_yes_account.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer
                ),
                amount_usdc,
            )?;

            // B. Mint NO to AMM Vault (Input for Swap)
            token::mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.no_mint.to_account_info(),
                        to: ctx.accounts.vault_no.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer
                ),
                amount_usdc,
            )?;

            // C. Swap NO (from vault) for YES (from vault)
            ctx.accounts.vault_no.reload()?; // Update state after mint
            let pool_no_after_mint = ctx.accounts.vault_no.amount;
            let pool_yes_current = ctx.accounts.vault_yes.amount;

            // Mathematical Safety: We use the pool amounts *before* the new liquidity was conceptually "added" to the curve
            let amount_in_no = amount_usdc;
            let pool_no_before_swap = pool_no_after_mint.checked_sub(amount_in_no).unwrap();

            let amount_out_yes = math::calculate_swap_output(
                pool_no_before_swap, // Input Pool (NO)
                pool_yes_current,    // Output Pool (YES)
                amount_in_no,        // Amount In
            )?;

            // D. Transfer Output YES to User
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_yes.to_account_info(),
                        to: ctx.accounts.payer_yes_account.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer
                ),
                amount_out_yes,
            )?;
            
            // Total YES = Minted (amount_usdc) + Swapped (amount_out_yes)
            amount_usdc + amount_out_yes
        },
        Outcome::No => {
            // A. Mint NO to User
            token::mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.no_mint.to_account_info(),
                        to: ctx.accounts.payer_no_account.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer
                ),
                amount_usdc,
            )?;

            // B. Mint YES to AMM Vault
            token::mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.yes_mint.to_account_info(),
                        to: ctx.accounts.vault_yes.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer
                ),
                amount_usdc,
            )?;

            // C. Swap YES for NO
            ctx.accounts.vault_yes.reload()?;
            let pool_yes_after_mint = ctx.accounts.vault_yes.amount;
            let pool_no_current = ctx.accounts.vault_no.amount;

            let amount_in_yes = amount_usdc;
            let pool_yes_before_swap = pool_yes_after_mint.checked_sub(amount_in_yes).unwrap();

            let amount_out_no = math::calculate_swap_output(
                pool_yes_before_swap,
                pool_no_current,
                amount_in_yes,
            )?;

            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_no.to_account_info(),
                        to: ctx.accounts.payer_no_account.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    signer
                ),
                amount_out_no,
            )?;
            
            amount_usdc + amount_out_no
        }
    };
    
    // --- SLIPPAGE CHECK (PRO FEATURE) ---
    // If the AMM gives us less than we expected, REVERT the transaction.
    if total_shares_received < min_out {
        return err!(PolygnosisError::SlippageExceeded);
    }

    msg!("Trade success. Received {} shares.", total_shares_received);

    Ok(())
}