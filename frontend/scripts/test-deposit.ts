import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const arcTestnet = {
    id: 5042002,
    name: "Arc Testnet",
    nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [process.env.DEPLOY_RPC_URL || process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network"] } },
  };

  const pkRaw = process.env.DEPLOYER_PRIVATE_KEY || "";
  const privateKey = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as `0x${string}`;
  const readerVaultAddress = process.env.NEXT_PUBLIC_READER_VAULT_ADDRESS as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(arcTestnet.rpcUrls.default.http[0]) });
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(arcTestnet.rpcUrls.default.http[0]) });

  console.log("Testing deposit for", account.address);
  console.log("ReaderVault:", readerVaultAddress);
  
  try {
    const { request } = await publicClient.simulateContract({
      address: readerVaultAddress,
      abi: [{ name: "deposit", type: "function", inputs: [], outputs: [], stateMutability: "payable" }],
      functionName: "deposit",
      value: parseUnits("0.1", 18),
      account
    });
    console.log("Simulation successful. Ready to send tx...");
    const hash = await walletClient.writeContract(request);
    console.log("TX Hash:", hash);
  } catch (e: any) {
    console.error("Simulation failed with error:");
    console.error(e.message || e);
  }
}
main();
