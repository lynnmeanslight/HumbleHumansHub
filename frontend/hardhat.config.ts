import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    arcTestnet: {
      url: process.env.DEPLOY_RPC_URL || process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network",
      chainId: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID) || 5042002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [`0x${process.env.DEPLOYER_PRIVATE_KEY.replace('0x', '')}`] : [],
      timeout: 300000,
    },
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    root: "../",
    sources: "./contracts",
    tests: "./frontend/test",
    cache: "./frontend/cache",
    artifacts: "./frontend/artifacts",
  },
  etherscan: {
    apiKey: {
      arcTestnet: "nokey",
    },
    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app",
        },
      },
    ],
  },
};

export default config;
