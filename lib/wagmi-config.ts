import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { defineChain } from "viem";

// Genlayer Network
// RPC URL from environment variable (for frontend wallet connections)
const genlayerChain = defineChain({
  id: 20197, // Genlayer chain ID
  name: "Genlayer",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://rpc.genlayer.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Genlayer Explorer",
      url: "https://explorer.genlayer.io", // TODO: Update with actual Genlayer explorer URL
    },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [genlayerChain, mainnet, sepolia],
  connectors: [], // Connectors will be added via wallet adapters (thirdweb is used in this project)
  transports: {
    [genlayerChain.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

