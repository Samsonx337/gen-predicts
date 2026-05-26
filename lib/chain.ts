import { defineChain } from 'viem'

// TODO: Update with actual Genlayer chain configuration
export const genlayerChain = defineChain({
  id: 50312, // TODO: Update with actual Genlayer chain ID
  name: 'Genlayer',
  network: 'genlayer',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 }, // TODO: Update with actual token symbol
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://rpc.genlayer.io'] },
    public: { http: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://rpc.genlayer.io'] },
  },
} as const)


