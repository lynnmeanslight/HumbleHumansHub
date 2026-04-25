# HumbleHumansHub: The Economic OS for Content

HumbleHumansHub is a decentralized, pay-per-read content ecosystem built on the **Arc L1 network** and powered by **Circle Nanopayments**. We dismantle the inefficient, fragmented subscription model by enabling a true micro-commerce economy where premium content is unlocked for as little as **$0.001 USDC**.

**Hackathon Track:** 🛒 Real-Time Micro-Commerce Flow

---

## 🚀 Key Features

- **Nanopayments:** Pay exactly $0.001 per article. No subscription, no account lock-in.
- **Yield-Bearing Float:** Your idle reading balance automatically earns ~5% APR via **Hashnote USYC** (Treasury bills). Your interest funds your reading.
- **Agentic Research Assistant:** A Gemini-powered AI that autonomously "buys" data from premium articles to synthesize expert answers for you.
- **Writer Liquidity:** Authors receive 100% of their revenue (minus a $0.001 toll) with instant, programmatic settlement into their own yield-bearing vaults.

---

## 🛠️ Technical Stack

- **Blockchain:** Arc Testnet (Chain ID: `5042002`)
- **Payments:** Circle Nanopayments + x402 Protocol
- **AI:** Gemini 3 Flash (via Google AI Studio)
- **Yield:** USYC via Hashnote Teller (T+0 instant settlement)
- **Smart Contracts:** Solidity 0.8.24 (`ReaderVault`, `WriterVault`)
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS (Apple-inspired Design System)
- **Database:** Prisma + PostgreSQL

---

## 💡 The Business Model

### 1. The Toll Model
We charge a flat **$0.001 USDC network toll** per read. This aligns platform success with the *velocity* of transactions rather than gatekeeping content.

### 2. The Float
User deposits into the `ReaderVault` are converted to **USYC**. The platform takes a small fee from the *yield* of the idle capital, making the service sustainable while keeping the user's capital productive.

### 3. Machine-to-Machine Commerce
Our AI Research Agent executes autonomous nanopayments to writers to "buy" the data it needs. This creates a high-frequency revenue stream for authors that doesn't rely on human clicks.

---

## 📊 Margin Comparison

| Chain | Gas per tx | Value per tx | Overhead |
|-------|-----------|--------------|----------|
| Ethereum L1 | $0.50–$2.00 | $0.001 | 500–2000× ❌ |
| **Arc** | **<$0.0001** | **$0.001** | **<10% ✅** |

---

## 📂 Project Structure

- `/contracts`: Solidity smart contracts for Reader and Writer vaults.
- `/frontend`: The Next.js application, including the x402 payment logic.
- `/subgraph`: (Optional) Event indexing for the Arc blockchain.

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- MetaMask with Arc Testnet configured
- Circle Developer Account

### Installation
1. Clone the repo
2. `cd frontend && npm install`
3. Copy `.env.example` to `.env.local` and fill in your Circle API keys and contract addresses.
4. `npx prisma generate`
5. `npm run dev`

---

## 🔗 Live Links

- **Vercel Deployment:** [https://humble-humans-hub.vercel.app/](https://humble-humans-hub.vercel.app/)
- **ReaderVault (Verified):** [0x708aE7F05f242C37eCdd8E07CCE434eb0D5614ef](https://testnet.arcscan.app/address/0x708aE7F05f242C37eCdd8E07CCE434eb0D5614ef#code)
- **WriterVault (Verified):** [0x3F4861bcc40f2CdC120AeA374ed9D04E6d93Df03](https://testnet.arcscan.app/address/0x3F4861bcc40f2CdC120AeA374ed9D04E6d93Df03#code)
- **MockTeller (Verified):** [0xB5276e8301a738C01b76B0BA5224e647a417BB1D](https://testnet.arcscan.app/address/0xB5276e8301a738C01b76B0BA5224e647a417BB1D#code)

---

## 🏆 Hackathon Submission Details

HumbleHumansHub provides the first technically viable foundation for a sub-cent economy where margin is not eroded by gas. We have verified over **50+ on-chain transactions** during our demo, proving the reliability of the Arc + Circle stack.

**Submission Video:** [Link to Demo]

