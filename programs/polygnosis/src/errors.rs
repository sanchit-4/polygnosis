use anchor_lang::prelude::*;

#[error_code]
pub enum PolygnosisError {
    #[msg("The market has already ended.")]
    MarketEnded,
    #[msg("The market has not ended yet.")]
    MarketNotEnded,
    #[msg("The market is not resolved.")]
    MarketNotResolved,
    #[msg("The market is already resolved.")]
    MarketAlreadyResolved,
    #[msg("Invalid Oracle provided.")]
    InvalidOracle,
    #[msg("Slippage tolerance exceeded.")]
    SlippageExceeded,
    #[msg("Calculation overflow.")]
    MathOverflow,
    #[msg("Insufficient liquidity in the AMM.")]
    InsufficientLiquidity,
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("The market has expired.")]
    MarketExpired,
}