# Polygnosis | Decentralized Prediction Market AMM

Polygnosis is a professional-grade, binary prediction market built on the Solana Blockchain. It allows users to trade on the outcome of future events (e.g., "Will BTC hit $100k?") using a fully decentralized Automated Market Maker (AMM).

Unlike traditional betting sites, Polygnosis is non-custodial. Users hold their positions as SPL Tokens (YES/NO shares) in their own wallets. Prices are determined mathematically by supply and demand, not by a central bookmaker.

![alt text](https://img.shields.io/badge/license-MIT-blue.svg)


![alt text](https://img.shields.io/badge/solana-devnet-green)


![alt text](https://img.shields.io/badge/built%20with-Anchor%20%7C%20Next.js%20%7C%20Rust-orange)

## Table of Contents

    Core Architecture

    The Mathematical Model (CPMM)

    Features

    Project Structure

    Prerequisites

    Installation & Setup

    Usage Guide

    Troubleshooting

## Core Architecture

Polygnosis follows the Gnosis Conditional Token Framework architecture, adapted for Solana's high-speed execution.
1. The Smart Contract (Rust/Anchor)

    Market Account: Stores the question, resolution time, and admin authority.

    Vaults: Each market has 3 Token Vaults:

        Vault Collateral: Stores the USDC/Token wagered.

        Vault YES: Stores the AMM's inventory of YES tokens.

        Vault NO: Stores the AMM's inventory of NO tokens.

    Lazy Redemption: The contract does not auto-send funds. Winners must interact with the contract to "Claim" their winnings (burn winning tokens -> receive collateral).

2. The Frontend (Next.js 14)

    No-Server Architecture: The frontend talks directly to the Solana Blockchain (RPC) via @solana/web3.js.

    Real-Time Math: Calculates slippage and potential returns locally before the user signs the transaction.

    Admin Dashboard: A restricted area for the market creator to resolve outcomes.

## The Mathematical Model (CPMM)

Polygnosis uses a Constant Product Market Maker (similar to Uniswap V2) to price outcomes.

The Invariant : k = R(yes) x R(no)
   

Where R represents the Reserves in the pool.
Pricing Probability

The price of an outcome represents its probability.

        
Price(YES)=R(no) / R(yes)+R(no)

    • Why? If users buy YES, they put tokens into the pool and take YES out
    • R(yes) decreases (Scarcity).
    • R(no) increases (Abundance).
    • The denominator stays roughly the same, but the numerator (R(no)) gets bigger.
    • Result: The Price of YES goes UP.

Payoff Logic

    Minting: 1 USDC = 1 YES + 1 NO.

    Trading: You swap one side for the other using the AMM.

    Redemption:

        If YES Wins: 1 YES Token = $1.00. (NO Tokens = $0.00).

        If NO Wins: 1 NO Token = $1.00. (YES Tokens = $0.00).

## Features

    ✅ Binary Outcome Trading: Buy YES or NO positions.

    ✅ Automated Market Maker: Instant liquidity; no need for a counterparty.

    ✅ Auto-Liquidity Seeding: Admin automatically funds new markets with $10k liquidity on creation.

    ✅ Faucet Integration: Integrated popup to help testers get Devnet tokens.

    ✅ Admin Controls:

        Restricted Market Creation.

        Resolution Dashboard.

        Emergency Controls.

    ✅ Security:

        Time-based betting locks (cannot bet after end time).

        Resolution locks (cannot add liquidity after resolution).

        Slippage protection.

## Project Structure
```code Bash
polygnosis/
├── programs/
│   └── polygnosis/
│       ├── src/
│       │   ├── lib.rs            # Entrypoint & Routing
│       │   ├── constants.rs      # Admin Keys & Seeds
│       │   ├── state/            # Account Structures (Market, Events)
│       │   ├── math/             # CPMM Calculation Logic
│       │   └── instructions/     # Logic (Create, Buy, Resolve, Redeem)
├── app/                          # Next.js Frontend
│   ├── src/
│   │   ├── app/                  # Pages (Home, Create, Admin, Portfolio)
│   │   ├── components/           # UI Components (Navbar, FaucetModal)
│   │   ├── hooks/                # Solana Connection Hooks
│   │   └── utils/                # Client-side Math Helpers
├── tests/                        # TypeScript Integration Tests
└── Anchor.toml                   # Network Configuration
```

## Prerequisites

Ensure you have the following installed:

    Rust & Cargo: (Latest stable version).

    Solana CLI: (v1.16+).

    Anchor CLI: (v0.29+).

    Node.js: (v18+).

    Phantom Wallet: Browser extension.

## Installation & Setup
1. Clone the Repository
```code Bash
git clone https://github.com/yourusername/polygnosis.git
cd polygnosis
```
2. Backend Setup (Smart Contract)
```code Bash
# Install dependencies
npm install

# Build the contract
anchor build

# Get your Program ID
anchor keys sync

# !IMPORTANT! 
# 1. Run `solana address -k target/deploy/polygnosis-keypair.json`
# 2. Update `lib.rs` and `Anchor.toml` with this new address.
# 3. Update `programs/polygnosis/src/constants.rs` with YOUR Wallet Address (for Admin access).

# Deploy to Devnet
solana config set --url devnet
solana airdrop 2
anchor deploy
```

3. Frontend Setup
```code Bash
cd app
npm install

# Copy the IDL from backend to frontend
# (Run this from the project root)
cp ../target/idl/polygnosis.json src/idl/polygnosis.json

Configuration:
Open app/src/app/create/page.tsx and app/src/app/admin/page.tsx:

    Update ADMIN_ADDRESS with your Phantom Wallet address.

    Update COLLATERAL_MINT with the Devnet Token address you are using.
```
4. Run the App
```code Bash
# Inside /app folder
npm run dev
```
Open http://localhost:3000.

## Usage Guide
Phase 1: Onboarding

    Open the App.

    If you have 0 tokens, the Faucet Modal will appear.

    Click the link to get 1,000,000 Test Tokens airdropped to your wallet.

Phase 2: Administrator (You)

    Connect the wallet set in constants.rs.

    Go to Create Market.

    Enter a Question ("Will SOL hit $200?") and Expiry Date.

    Click Deploy.

        Note: This transaction will also auto-seed $10,000 liquidity.

Phase 3: Trader (User)

    Select a Market from the Home Page.

    View the Probability Graph.

    Enter an amount (e.g., 50 USDC).

    Click Buy YES.

    View your position in the Portfolio tab.

Phase 4: Resolution & Claiming

    Once the event is over, the Admin goes to /admin.

    Click "YES Won" or "NO Won".

    The User goes to Portfolio.

    The status changes to "RESOLVED".

    User clicks "Claim" to burn their YES tokens and receive USDC.

## Troubleshooting

1. "AccountNotInitialized" Error

    Cause: You are trying to buy with a wallet that has never held the Collateral Token before.

    Fix: The app attempts to auto-create the account. If it fails, use the Faucet to get your first drop of tokens.

2. "Unauthorized" Error

    Cause: You are trying to Create or Resolve a market from a non-admin wallet.

    Fix: Ensure constants.rs (Backend) and page.tsx (Frontend) both have your specific Phantom Wallet address hardcoded. Redeploy if you change Rust code.

3. "Phantom shows Unknown Tokens"

    Cause: This is normal for Devnet tokens without Metaplex metadata.

    Fix: Check the Portfolio page. If the numbers match your bet, your funds are safe. These are your winning tickets.

## License

This project is open-source and available under the MIT License.

Developed with ❤️ by Sanchit