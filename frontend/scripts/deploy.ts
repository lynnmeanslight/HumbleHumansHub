import hre from "hardhat";

/**
 * Deploy script for HumbleHumansHub contracts on Arc Testnet.
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network arcTestnet
 *
 * Prerequisite env vars:
 *   DEPLOYER_PRIVATE_KEY — private key with testnet USDC for gas
 *   NEXT_PUBLIC_ARC_RPC_URL — Arc testnet RPC endpoint
 *   NEXT_PUBLIC_USDC_ADDRESS — USDC contract on Arc (from Circle)
 *   NEXT_PUBLIC_USYC_TELLER_ADDRESS — Hashnote Teller on Arc
 *   NEXT_PUBLIC_USYC_TOKEN_ADDRESS — USYC token on Arc
 */
async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  console.log("Deploying with address:", deployer.account.address);

  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const usycTellerAddress = process.env.NEXT_PUBLIC_USYC_TELLER_ADDRESS;
  const usycTokenAddress = process.env.NEXT_PUBLIC_USYC_TOKEN_ADDRESS;

  if (!usdcAddress || !usycTellerAddress || !usycTokenAddress) {
    throw new Error(
      "Missing required env vars: NEXT_PUBLIC_USDC_ADDRESS, " +
      "NEXT_PUBLIC_USYC_TELLER_ADDRESS, NEXT_PUBLIC_USYC_TOKEN_ADDRESS"
    );
  }

  // 1. Deploy WriterVault first (ReaderVault needs its address)
  console.log("\nDeploying WriterVault...");
  const writerVault = await hre.viem.deployContract("WriterVault", [
    usdcAddress,
    usycTokenAddress,
    usycTellerAddress,
  ]);
  console.log("WriterVault deployed to:", writerVault.address);

  // 2. Deploy ReaderVault with WriterVault address
  console.log("\nDeploying ReaderVault...");
  const readerVault = await hre.viem.deployContract("ReaderVault", [
    usdcAddress,
    usycTokenAddress,
    usycTellerAddress,
    writerVault.address,
  ]);
  console.log("ReaderVault deployed to:", readerVault.address);

  // 3. Output env vars to update
  console.log("\n✅ Deployment complete! Update .env.local:");
  console.log(`NEXT_PUBLIC_READER_VAULT_ADDRESS=${readerVault.address}`);
  console.log(`NEXT_PUBLIC_WRITER_VAULT_ADDRESS=${writerVault.address}`);

  // 4. Verify on Arc Explorer
  console.log("\nVerify contracts at:");
  console.log(`https://testnet.arcscan.app/address/${readerVault.address}`);
  console.log(`https://testnet.arcscan.app/address/${writerVault.address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
