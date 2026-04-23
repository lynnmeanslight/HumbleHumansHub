import hre from "hardhat";
import { getAddress } from "viem";

/**
 * Deploy script for HumbleHumansHub contracts on Arc Testnet.
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network arcTestnet
 *
 * Prerequisite env vars:
 *   DEPLOYER_PRIVATE_KEY — private key with testnet USDC for gas
 *   NEXT_PUBLIC_ARC_RPC_URL — Arc testnet RPC endpoint
 *   NEXT_PUBLIC_USYC_TOKEN_ADDRESS — USYC token on Arc
 *
 * NOTE: The production Hashnote Teller (NEXT_PUBLIC_USYC_TELLER_ADDRESS) uses
 * an ERC-4626 interface and requires callers to be on an on-chain allowlist
 * (maxDeposit returns 0 for non-whitelisted addresses). This script deploys
 * MockTeller instead, which has the subscribe()/redeem() interface expected by
 * ReaderVault and imposes no allowlist restrictions.
 * To use the real Teller, set USE_REAL_TELLER=true and ensure ReaderVault is
 * whitelisted by the Hashnote/Arc team.
 */

// Deploy a contract and wait for receipt with a long timeout
async function deployWithTimeout(
  publicClient: Awaited<ReturnType<typeof hre.viem.getPublicClient>>,
  walletClient: Awaited<ReturnType<typeof hre.viem.getWalletClients>>[0],
  contractName: string,
  args: unknown[] = []
): Promise<string> {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args,
  });
  console.log(`  tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 300_000, // 5 minutes
    pollingInterval: 4_000,
  });
  if (!receipt.contractAddress) throw new Error(`No contract address in receipt for ${contractName}`);
  return getAddress(receipt.contractAddress);
}

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  console.log("Deploying with address:", deployer.account.address);

  const usycTokenAddress = process.env.NEXT_PUBLIC_USYC_TOKEN_ADDRESS;
  const useRealTeller = process.env.USE_REAL_TELLER === "true";
  const realTellerAddress = process.env.NEXT_PUBLIC_USYC_TELLER_ADDRESS;

  if (!usycTokenAddress) {
    throw new Error("Missing required env var: NEXT_PUBLIC_USYC_TOKEN_ADDRESS");
  }

  // 1. Deploy or use Teller
  let tellerAddress: string;
  if (useRealTeller) {
    if (!realTellerAddress) throw new Error("USE_REAL_TELLER=true but NEXT_PUBLIC_USYC_TELLER_ADDRESS is not set");
    tellerAddress = realTellerAddress;
    console.log("\nUsing real Hashnote Teller:", tellerAddress);
    console.log("⚠️  Ensure ReaderVault is allowlisted on the Teller after deployment.");
  } else {
    console.log("\nDeploying MockTeller (no allowlist, subscribe/redeem interface)...");
    tellerAddress = await deployWithTimeout(publicClient, deployer, "MockTeller", []);
    console.log("MockTeller deployed to:", tellerAddress);
  }

  // 2. Deploy WriterVault first (ReaderVault needs its address)
  console.log("\nDeploying WriterVault...");
  const writerVaultAddress = await deployWithTimeout(publicClient, deployer, "WriterVault", [
    usycTokenAddress,
    tellerAddress,
  ]);
  console.log("WriterVault deployed to:", writerVaultAddress);

  // 3. Deploy ReaderVault with WriterVault address
  console.log("\nDeploying ReaderVault...");
  const readerVaultAddress = await deployWithTimeout(publicClient, deployer, "ReaderVault", [
    usycTokenAddress,
    tellerAddress,
    writerVaultAddress,
  ]);
  console.log("ReaderVault deployed to:", readerVaultAddress);

  // 4. Output env vars to update
  console.log("\n✅ Deployment complete! Update .env.local:");
  if (!useRealTeller) {
    console.log(`NEXT_PUBLIC_USYC_TELLER_ADDRESS=${tellerAddress}`);
  }
  console.log(`NEXT_PUBLIC_READER_VAULT_ADDRESS=${readerVaultAddress}`);
  console.log(`NEXT_PUBLIC_WRITER_VAULT_ADDRESS=${writerVaultAddress}`);

  // 5. Verify on Arc Explorer
  console.log("\nVerify contracts at:");
  if (!useRealTeller) {
    console.log(`https://testnet.arcscan.app/address/${tellerAddress}`);
  }
  console.log(`https://testnet.arcscan.app/address/${readerVaultAddress}`);
  console.log(`https://testnet.arcscan.app/address/${writerVaultAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
