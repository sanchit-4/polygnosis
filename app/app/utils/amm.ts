import { BN } from "@coral-xyz/anchor";

export function calculateSwapOutput(
  poolIn: number, // How much is currently in the pool (e.g. YES tokens)
  poolOut: number, // How much is currently in the pool (e.g. NO tokens)
  amountIn: number // How much user is putting in
): number {
  if (poolIn === 0 || poolOut === 0) return 0;

  // 1. Fee Calculation (2%)
  // In Rust we did: amount_in * 200 / 10000
  const fee = amountIn * 0.02;
  const amountInAfterFee = amountIn - fee;

  // 2. Constant Product Formula: k = x * y
  // (poolIn + amountIn) * (poolOut - amountOut) = k
  // amountOut = poolOut - (k / (poolIn + amountIn))
  // amountOut = poolOut - ((poolIn * poolOut) / (poolIn + amountIn))
  
  const k = poolIn * poolOut;
  const newPoolIn = poolIn + amountInAfterFee;
  const newPoolOut = k / newPoolIn;
  
  const amountOut = poolOut - newPoolOut;

  return amountOut;
}

export function calculatePrice(yesReserves: number, noReserves: number) {
    if (yesReserves === 0 && noReserves === 0) return 50;
    // Price of YES = Reserves of NO / (Reserves YES + Reserves NO)
    return (noReserves / (yesReserves + noReserves)) * 100;
}