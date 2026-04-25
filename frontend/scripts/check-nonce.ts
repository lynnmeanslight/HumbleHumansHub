import { createPublicClient, http } from "viem";

async function main() {
  const publicClient = createPublicClient({
    chain: {
      id: 5042002,
      name: "Arc Testnet",
      nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
      rpcUrls: { default: { http: [process.env.DEPLOY_RPC_URL || process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network"] } },
    },
    transport: http()
  });

  const address = "0x578c762aef3d4224c127835fa433d3db5d521679";
  const nonce = await publicClient.getTransactionCount({ address });
  console.log(`Current nonce for ${address}:`, nonce);
}
main().catch(console.error);
