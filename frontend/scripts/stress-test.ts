/**
 * Stress test script — generates 50+ Arc transactions for demo.
 *
 * Run AFTER deploying contracts:
 *   npx ts-node scripts/stress-test.ts
 *
 * Shows 50+ ArticleRead events in Arc Explorer + Circle Console.
 */

import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "../src/lib/arc";

const READER_VAULT_ABI = [
  {
    name: "payForRead",
    type: "function",
    inputs: [
      { name: "reader", type: "address" },
      { name: "writer", type: "address" },
      { name: "slug", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "deposit",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
] as const;



const ARTICLES = [
  { slug: "why-micro-payments-will-replace-subscriptions", writer: "0x1234567890123456789012345678901234567890" as `0x${string}` },
  { slug: "the-future-of-creator-economy-on-web3",         writer: "0x2345678901234567890123456789012345678901" as `0x${string}` },
  { slug: "understanding-zero-knowledge-proofs",            writer: "0x3456789012345678901234567890123456789012" as `0x${string}` },
  { slug: "defi-yield-strategies-for-2026",                 writer: "0x4567890123456789012345678901234567890123" as `0x${string}` },
  { slug: "building-on-arc-a-developers-guide",             writer: "0x5678901234567890123456789012345678901234" as `0x${string}` },
  { slug: "how-usyc-makes-idle-funds-work",                 writer: "0x6789012345678901234567890123456789012345" as `0x${string}` },
  { slug: "the-death-of-the-paywall",                       writer: "0x1234567890123456789012345678901234567890" as `0x${string}` },
  { slug: "real-time-settlement-why-speed-matters",         writer: "0x2345678901234567890123456789012345678901" as `0x${string}` },
];

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  const readerVaultAddress = process.env.NEXT_PUBLIC_READER_VAULT_ADDRESS as `0x${string}`;

  if (!privateKey || !readerVaultAddress) {
    console.error("Missing env vars. Set: DEPLOYER_PRIVATE_KEY, NEXT_PUBLIC_READER_VAULT_ADDRESS");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });

  console.log(`\n🚀 HumbleHumansHub Stress Test`);
  console.log(`   Reader: ${account.address}`);
  console.log(`   ReaderVault: ${readerVaultAddress}`);
  console.log(`   Target: 55 transactions\n`);

  // Step 1: Deposit 0.10 USDC
  console.log("1. Depositing 0.10 USDC...");
  const depositTx = await walletClient.writeContract({
    address: readerVaultAddress,
    abi: READER_VAULT_ABI,
    functionName: "deposit",
    value: parseUnits("0.10", 6),
  });
  await publicClient.waitForTransactionReceipt({ hash: depositTx });
  console.log(`   ✅ Deposited | tx: ${depositTx}\n`);

  // Step 2: 50 article reads
  console.log("2. Sending 50 payForRead transactions...\n");
  const hashes: string[] = [];

  for (let i = 0; i < 50; i++) {
    const article = ARTICLES[i % ARTICLES.length];
    const tx = await walletClient.writeContract({
      address: readerVaultAddress,
      abi: READER_VAULT_ABI,
      functionName: "payForRead",
      args: [account.address, article.writer, article.slug],
    });

    hashes.push(tx);
    console.log(`   [${String(i + 1).padStart(2, "0")}] ${article.slug.slice(0, 30)}… | tx: ${tx.slice(0, 20)}…`);

    // Small delay to avoid nonce issues
    await new Promise(r => setTimeout(r, 300));
  }

  // Step 3: Wait for all receipts
  console.log("\n3. Confirming all transactions...");
  let confirmed = 0;
  for (const hash of hashes) {
    await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
    confirmed++;
    process.stdout.write(`\r   ${confirmed}/${hashes.length} confirmed`);
  }

  console.log(`\n\n✅ DONE! ${hashes.length + 2} total transactions`);
  console.log(`\n📊 View on Arc Explorer:`);
  console.log(`   https://testnet.arcscan.app/address/${readerVaultAddress}`);
  console.log(`\n💰 Total settled: $${(hashes.length * 0.001).toFixed(3)} USDC`);
}

main().catch(console.error);
