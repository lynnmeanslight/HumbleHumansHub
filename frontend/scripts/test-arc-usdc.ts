import { createPublicClient, http } from "viem";

async function main() {
  const publicClient = createPublicClient({
    chain: {
      id: 5042002,
      name: "Arc Testnet",
      nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
    },
    transport: http()
  });

  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

  // Check code at USDC_ADDRESS
  const code = await publicClient.getBytecode({ address: USDC_ADDRESS });
  console.log("USDC code length:", code?.length || 0);

  // Read balance of some random address or deployer
  const bal = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }],
    functionName: "balanceOf",
    args: ["0x0000000000000000000000000000000000000000"]
  }).catch(e => "Error: " + e.message);
  console.log("USDC balanceOf(0):", bal);
}
main().catch(console.error);
