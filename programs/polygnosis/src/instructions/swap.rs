use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Market, events::TradeEvent};
use crate::constants::*;
use crate::math;
use crate::errors::PolygnosisError;

#[derive(Accounts)]
pub struct SwapTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_MARKET, market.market_id.to_le_bytes().as_ref()],
        bump = market.bump,
        constraint = !market.resolved @ PolygnosisError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    // User Accounts
    #[account(mut)]
    pub user_yes_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_no_account: Account<'info, TokenAccount>,

    // Vaults
    #[account(mut, address = market.vault_yes)]
    pub vault_yes: Account<'info, TokenAccount>,
    #[account(mut, address = market.vault_no)]
    pub vault_no: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq)]
pub enum SwapDirection {
    YesToNo,
    NoToYes,
}

pub fn handler(ctx: Context<SwapTokens>, amount_in: u64, direction: SwapDirection, min_out: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    
    // 1. Fee Calculation (2% Fee)
    let fee_amount = amount_in.checked_mul(200).unwrap().checked_div(10000).unwrap();
    let amount_in_after_fee = amount_in.checked_sub(fee_amount).unwrap();

    // 2. Determine Pools - Use &mut to allow for .reload()
    let (input_vault, output_vault, input_user_acc, output_user_acc) = match direction {
        SwapDirection::YesToNo => (
            &mut ctx.accounts.vault_yes, 
            &mut ctx.accounts.vault_no,
            &ctx.accounts.user_yes_account,
            &ctx.accounts.user_no_account
        ),
        SwapDirection::NoToYes => (
            &mut ctx.accounts.vault_no, 
            &mut ctx.accounts.vault_yes,
            &ctx.accounts.user_no_account,
            &ctx.accounts.user_yes_account
        ),
    };

    // 3. Calculate Math
    // Note: We need to reload to get current amounts if multiple txs happened in block
    input_vault.reload()?;
    output_vault.reload()?;
    
    let amount_out = math::calculate_swap_output(
        input_vault.amount, 
        output_vault.amount, 
        amount_in_after_fee
    )?;

    if amount_out < min_out {
        return err!(PolygnosisError::SlippageExceeded);
    }

    // 4. Execution
    // A. Transfer Input from User to Vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: input_user_acc.to_account_info(),
                to: input_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            }
        ),
        amount_in,
    )?;

    // B. Transfer Output from Vault to User
    let market_id_bytes = market.market_id.to_le_bytes();
    let seeds = &[SEED_MARKET, market_id_bytes.as_ref(), &[market.bump]];
    let signer = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: output_vault.to_account_info(),
                to: output_user_acc.to_account_info(),
                authority: ctx.accounts.market.to_account_info(),
            },
            signer
        ),
        amount_out,
    )?;

    // 5. Emit Event for Frontend Graph
    // Price = AmountIn / AmountOut (approx)
    let price = (amount_in as u128 * BASIS_POINTS as u128) / (amount_out as u128 + amount_in as u128); 
    
    emit!(TradeEvent {
        market_id: market.market_id,
        is_buy: false, // Pure swap is neutral, but effectively selling input
        outcome_index: if direction == SwapDirection::NoToYes { 0 } else { 1 },
        amount_in,
        amount_out,
        price: price as u64,
        timestamp: Clock::get()?.unix_timestamp,
        user: ctx.accounts.authority.key(),
    });

    Ok(())
}