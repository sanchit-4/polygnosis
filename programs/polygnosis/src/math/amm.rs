use anchor_lang::prelude::*;
use crate::errors::PolygnosisError;

/// Calculates the amount of tokens to return for a given input amount
/// based on the Constant Product Formula: (PoolA + Input) * (PoolB - Output) = k
pub fn calculate_swap_output(
    pool_in_amount: u64, // How much of Token A is currently in the pool
    pool_out_amount: u64, // How much of Token B is currently in the pool
    amount_in: u64,       // How much Token A the user is putting in
) -> Result<u64> {
    
    // 1. Cast to u128 to prevent overflow during multiplication
    let pool_in = pool_in_amount as u128;
    let pool_out = pool_out_amount as u128;
    let amt_in = amount_in as u128;

    // 2. Calculate k (invariant) implicitly. 
    // New Pool In = pool_in + amt_in
    // New Pool Out = k / New Pool In
    // But since k = pool_in * pool_out...
    // New Pool Out = (pool_in * pool_out) / (pool_in + amt_in)
    
    let denominator = pool_in.checked_add(amt_in).ok_or(PolygnosisError::MathOverflow)?;
    let numerator = pool_in.checked_mul(pool_out).ok_or(PolygnosisError::MathOverflow)?;
    
    let new_pool_out = numerator.checked_div(denominator).ok_or(PolygnosisError::MathOverflow)?;

    // 3. Amount Out = Old Pool Out - New Pool Out
    let amount_out = pool_out.checked_sub(new_pool_out).ok_or(PolygnosisError::MathOverflow)?;

    // 4. Cast back to u64
    Ok(amount_out as u64)
}