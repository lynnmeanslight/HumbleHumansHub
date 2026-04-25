import { createPublicClient, http, createWalletClient, getAddress, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

  const pkey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  if (!pkey) throw new Error("No DEPLOYER_PRIVATE_KEY");
  const account = privateKeyToAccount(pkey);
  
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Native Balance:", formatUnits(balance, 18), "USDC");

  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
  const erc20Balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }],
    functionName: "balanceOf",
    args: [account.address]
  }).catch(e => "Error: " + e.message);
  
  console.log("ERC20 Balance:", formatUnits(BigInt(erc20Balance as string), 18), "USDC");
}
main().catch(console.error);