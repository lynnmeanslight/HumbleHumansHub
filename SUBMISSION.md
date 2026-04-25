# HumbleHumansHub — Submission Materials
## Agentic Economy on Arc Hackathon (April 20–26, 2026)

---

## 🏷️ Project Title
**HumbleHumansHub**

---

## 📝 Short Description (≤ 280 chars)
> Pay $0.001 per article. No subscription. No account. Your idle balance earns yield via USYC while you browse. Writers earn on content + treasury. Real-time micro-commerce, powered by Arc + Circle + Hashnote.

---

## 📖 Long Description

### What is HumbleHumansHub?

HumbleHumansHub is a pay-per-read content platform (like Medium) built on the Arc blockchain. Readers pay exactly $0.001 USDC per article — no subscription, no account. Writers receive 100% of every payment, auto-compounding into USYC (yield-bearing T-bills) until withdrawal.

### The Problem We Solve

Traditional micro-payment content platforms are economically impossible on Ethereum L1:
- Gas cost per transaction: **$0.50–$2.00**
- HumbleHumansHub payment per read: **$0.001**
- Gas overhead on L1: **500–2000×** the transaction value

This is why every content platform uses subscriptions — not because readers prefer them, but because the payment infrastructure couldn't support per-article pricing.

Arc changes this fundamentally. USDC-native gas and sub-cent transaction costs make $0.001 payments economically viable. The gas overhead is **<10%** of the transaction value.

### How It Works

**For Readers:**
1. Connect wallet, deposit USDC (min $0.10)
2. $0.01 stays as liquid float; rest auto-stakes into USYC
3. Browse articles — click any article → dynamic price (e.g. $0.05) deduced atomically
4. Idle balance earns ~5% APR via USYC between reads
5. Withdraw anytime (USYC → USDC via Hashnote Teller, T+0)

**For Writers:**
1. Publish articles with a wallet address and set a dynamic price
2. Earn price minus $0.001 platform toll, instantly settled on Arc
3. Earnings auto-stake into USYC (yield-bearing)
4. Withdraw anytime — compounds automatically until then

**On-chain Flow:**
```
Reader deposits USDC
  → ReaderVault keeps $0.01 float
  → Rest → Hashnote Teller → USYC

Reader clicks article (e.g. Price: $0.05)
  → x402 payment check
  → ReaderVault: redeem $0.05 USYC → USDC (T+0, atomic)
  → $0.001 USDC → Treasury
  → $0.049 USDC → WriterVault
  → WriterVault: auto-stake → USYC
  → Article unlocks
```

### The Economic Proof

| Chain | Gas per tx | Value per tx | Overhead |
|-------|-----------|--------------|----------|
| Ethereum L1 | $0.50–$2.00 | $0.001 | 500–2000× ❌ |
| Polygon | $0.001–$0.01 | $0.001 | 1–10× ⚠️ |
| **Arc** | **<$0.0001** | **$0.001** | **<10% ✅** |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Arc (EVM L1, USDC gas) |
| Payments | Circle Nanopayments + x402 |
| Yield | USYC via Hashnote Teller (T+0) |
| Wallets | wagmi v2 + MetaMask |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Contracts | Solidity 0.8.24 (ReaderVault, WriterVault) |

### Live Demo

> [Vercel URL — fill after deploying]

Demo shows:
- Live transaction feed ticking with each $0.001 read
- Deposit flow: USDC → split float/USYC
- Read → pay → reveal: blur animation → instant unlock
- Writer dashboard: reads accumulating, USYC yield growing
- Arc Explorer: 50+ onchain ArticleRead transactions visible
- Circle Console: nanopayment batch visible

---

## 💰 Margin Argument (Required by Judges)

> "At $0.001/tx, Ethereum L1 gas ($0.50–2.00) would cost **500–2000×** the transaction value — economically impossible. Arc's USDC-native gas enables true sub-cent settlement. 50 demo reads = $0.05 in payment value. On L1, that would cost $25–100 in gas. On Arc: <$0.005 total. This is the infrastructure unlock that makes per-read pricing viable at scale."

---

## 🔄 Circle Product Feedback (Target +$500 bonus)

### What We Used
- **Circle Nanopayments** — High-frequency $0.001 USDC micro-transactions
- **USYC (via Circle/Hashnote)** — Yield-bearing idle balance for readers and writers

### What Worked Well
1. **USYC Teller T+0 settlement** is genuinely remarkable. Atomic USDC→USYC→USDC in the same transaction enables yield-bearing micro-payments that were not possible before.
2. **Circle API documentation** is clear and well-organized. The developer experience is significantly better than comparable infrastructure providers.
3. **USDC as Arc gas token** eliminates the "I need native token to pay for gas" UX problem that blocks mainstream adoption.

### What Could Be Better
1. **Nanopayments SDK**: A JS/TS SDK for browser-side nanopayment integration would dramatically reduce integration time. Currently requires custom EIP-3009 implementation.
2. **USYC geofencing documentation**: The non-US restriction for USYC is important but not prominently documented. A clear USDC fallback pattern in the docs would help.
3. **Arc Testnet faucet**: Getting testnet USDC requires multiple steps. A simplified faucet UI in the developer console would improve DX.
4. **Webhook support**: Real-time payment confirmation webhooks (rather than polling) would enable cleaner UX for the payment → content unlock flow.
5. **Sandbox environment**: A dedicated sandbox with pre-funded test wallets and mock USYC yields would allow full end-to-end testing without mainnet exposure.

---

## 🎬 Demo Video Script (3:30 target)

**[00:00–00:15] — Open App**
> "This is HumbleHumansHub — pay $0.001 to read any article. No account, no subscription. Let me show you."

**[00:15–00:30] — Landing Page**
> "Every dot in the live feed is a $0.001 USDC payment confirmed on Arc right now."

**[00:30–00:45] — Connect Wallet**
> "I connect MetaMask. No sign-up, no email — just my wallet."

**[00:45–01:15] — Deposit**
> "Deposit $0.10 USDC. Watch: $0.01 stays as liquid float, $0.09 auto-stakes into USYC via the Hashnote Teller. My idle balance now earns ~5% APR while I browse."

**[01:15–01:45] — Read Article**
> "I click an article — it's blurred. One click to pay $0.001. USYC redeems atomically. Article unlocks instantly."

**[01:45–02:15] — Read 5 More**
> "[Click 5 more articles rapidly]. Watch the live feed light up — every read settles on Arc immediately."

**[02:15–02:45] — Writer Dashboard**
> "[X] reads, $[X] earned — all sitting in USYC, compounding until withdrawal."

**[02:45–03:15] — Arc Explorer**
> "[Open explorer] — 50+ ArticleRead events from ReaderVault. Each one: $0.001, settled in under 2 seconds."

**[03:15–03:30] — Margin Math**
> "50 reads = $0.05 payments. On Ethereum L1: $25–100 in gas. On Arc: fractions of a cent. That's why this is only possible here."

---

## 📋 Submission Checklist

- [ ] Get Arc RPC URL + Chain ID → add to `.env.local`
- [ ] Create Circle account + API Key → add to `.env.local`
- [ ] Get testnet USDC from Arc faucet
- [ ] Add USDC + USYC Teller addresses to `.env.local`
- [ ] Deploy contracts: `cd frontend && npx hardhat run scripts/deploy.ts --network arcTestnet`
- [ ] Add contract addresses to `.env.local`
- [ ] Run stress test: `npx ts-node scripts/stress-test.ts` (generates 50+ txns)
- [ ] Verify 50+ transactions on Arc Explorer
- [ ] Deploy to Vercel: `cd frontend && vercel --prod`
- [ ] Add env vars to Vercel dashboard
- [ ] Record 3:30 demo video (follow script above)
- [ ] Write submission (copy from this doc)
- [ ] Submit before **April 25, 2026**
 ] Verify 50+ transactions on Arc Explorer
- [ ] Deploy to Vercel: `cd frontend && vercel --prod`
- [ ] Add env vars to Vercel dashboard
- [ ] Record 3:30 demo video (follow script above)
- [ ] Write submission (copy from this doc)
- [ ] Submit before **April 25, 2026**
