# HumbleHumansHub: Project Overview & Architecture

## 1. Project Vision (Arc Hackathon Submission)
**HumbleHumansHub** is a next-generation, pay-per-read content platform built specifically for the **Arc Hackathon**. 

**Hackathon Track:** 🛒 Real-Time Micro-Commerce Flow

We are eliminating the "false binary" of $15/month subscriptions by allowing readers to pay dynamic micropayments (e.g., **$0.01 to $0.10 USDC**) per article. Economic activity is triggered and settled per interaction (a single read, a single comment, a single editorial correction). 

The platform takes a fixed **$0.001 toll per read**, and writers receive the rest. This payment is automatically converted into yield-bearing USYC (Treasury bills) that compounds in their Vault over time.

Beyond just reading, we use Nanopayments to unlock two additional Micro-Commerce flows:
*   **"Proof of Value" Comments (Anti-Spam):** Readers must pay a sub-cent micro-fee to leave a comment, instantly destroying bot spam while creating a secondary revenue stream for authors.
*   **Micro-Bounties:** Readers who submit typo corrections or editorial feedback are instantly rewarded with a micro-bounty paid directly to their wallet by the author.

This model is economically impossible on traditional Ethereum L1s due to high gas fees. However, by combining the **Arc L1 Blockchain** (which uses USDC natively for gas) with **Circle's Gateway Nanopayments**, we process thousands of micro-transactions for fractions of a cent, preserving the margin for the creator.

## 2. Technical Stack
- **Blockchain**: Arc Testnet (Chain ID: `5042002`)
- **Payments**: Circle Gateway Nanopayments & x402 Protocol
- **Yield**: USYC via Hashnote Teller (T+0 instant settlement)
- **Smart Contracts**: Solidity 0.8.24 (`ReaderVault`, `WriterVault`)
- **Frontend & Backend API**: Next.js 14, TypeScript, Tailwind CSS, Prisma (PostgreSQL)
- **Web3 Integration**: Wagmi v2 + Viem

## 3. How the Payment Flow Works (Gas-Free for Users)
We use **Circle Nanopayments** and the **x402 HTTP Protocol** to handle sub-cent micro-payments without forcing the user to pay gas fees on every click. 

**The End-to-End Flow:**
1. **Deposit:** The reader deposits USDC into their `ReaderVault` (a one-time on-chain transaction). The idle balance automatically earns yield via USYC.
2. **Request:** The reader clicks a blurred article. The Next.js backend (`api/articles/[slug]`) detects no payment and returns a **402 Payment Required** status.
3. **Sign:** The reader’s MetaMask wallet prompts them to sign an off-chain EIP-3009 payment authorization for exactly $0.001. **(This costs $0 in gas).**
4. **Serve:** The frontend retries the request with this signature. The backend verifies it and unblurs the article instantly.
5. **Settle:** The backend forwards the authorization to the Circle Gateway, which batches thousands of these signatures and settles them on-chain in bulk, drastically reducing infrastructure overhead. The writer's `WriterVault` is credited, and funds are automatically staked into USYC to earn yield.

## 4. Current Development Status
**We are in the final deployment phase.** 
The core application, smart contracts, and payment integrations are fully written. The environment has been heavily configured to connect to the official **Arc Testnet** (`rpc.testnet.arc.network`). 

### Completed:
- ✅ Smart Contracts written and deployment scripts configured.
- ✅ Next.js Frontend + Prisma Database + Tailwind UI built out.
- ✅ Circle x402 and Nanopayments backend logic integrated.
- ✅ All hardcoded testnet environments updated to the official Arc Testnet (`Chain ID 5042002`).

## 5. Next Steps for Deployment (Action Required)
To get the platform fully live for the hackathon submission, the following steps must be completed by the team:

1. **Obtain Keys & Funding:**
   - Get testnet USDC from the Circle Faucet (`faucet.circle.com`).
   - Create a Circle Web3 Services account and generate an API Key, Entity Secret, and App ID.
   - Extract a deployer wallet's Private Key.
2. **Update Environment (`.env.local`):**
   - Fill in the missing contract addresses for the USYC Teller and USDC testnet token.
   - Insert the Circle API keys and your Deployer Private Key.
3. **Deploy Smart Contracts:**
   - Run the hardhat deploy script (`npx hardhat run scripts/deploy.ts --network arcTestnet`).
   - Copy the deployed `ReaderVault` and `WriterVault` addresses back into `.env.local`.
4. **Deploy Application:**
   - Push the local PostgreSQL database schema via Prisma.
   - Deploy the Next.js app to **Vercel** and copy over all environment variables.
   - Record the 3.5-minute demo video according to the script in `SUBMISSION.md`.
