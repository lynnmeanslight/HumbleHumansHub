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
  console.log(`  🔍 Track pending TX here: https://testnet.arcscan.app/tx/${hash}`);
  
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 900_000, // 15 minutes to wait for congested network
    pollingInterval: 4_000,
  });
  if (!receipt.contractAddress) throw new Error(`No contract address in receipt for ${contractName}`);
  return getAddress(receipt.contractAddress);
}

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  console.log("Deploying with address:", deployer.account.address);

  // Official Arc Testnet Addresses
  const usycTokenAddress = "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C";
  const tellerAddress = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A";

  console.log("\nUsing official Hashnote Teller on Arc Testnet:", tellerAddress);
  console.log("⚠️  Ensure ReaderVault and WriterVault are allowlisted on the Teller after deployment by Arc/Hashnote team.");

  // 1. Deploy WriterVault first (ReaderVault needs its address)
  console.log("\nDeploying WriterVault...");
  const writerVaultAddress = await deployWithTimeout(publicClient, deployer, "WriterVault", [
    usycTokenAddress,
    tellerAddress,
  ]);
  console.log("WriterVault deployed to:", writerVaultAddress);

  // 2. Deploy ReaderVault with WriterVault address
  console.log("\nDeploying ReaderVault...");
  const readerVaultAddress = await deployWithTimeout(publicClient, deployer, "ReaderVault", [
    usycTokenAddress,
    tellerAddress,
    writerVaultAddress,
  ]);
  console.log("ReaderVault deployed to:", readerVaultAddress);

  // 3. Output env vars to update
  console.log("\n✅ Deployment complete! Update .env.local:");
  console.log(`NEXT_PUBLIC_READER_VAULT_ADDRESS=${readerVaultAddress}`);
  console.log(`NEXT_PUBLIC_WRITER_VAULT_ADDRESS=${writerVaultAddress}`);

  // 4. Verify on Arc Explorer
  console.log("\nVerify contracts at:");
  console.log(`https://testnet.arcscan.app/address/${readerVaultAddress}`);
  console.log(`https://testnet.arcscan.app/address/${writerVaultAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
