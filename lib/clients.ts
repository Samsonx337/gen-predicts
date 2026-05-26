import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { genlayerChain } from './chain'

// NOTE: This file is for frontend wallet operations only
// Backend uses lib/genlayer-client.ts which auto-generates its own key
// RPC URL for frontend wallet connections (public, exposed to browser)
const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://rpc.genlayer.io'

// PRIVATE_KEY is optional and only for frontend wallet purposes (if needed)
// Backend does NOT use this - it auto-generates its own key
const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined

export const publicClient = createPublicClient({
  chain: genlayerChain,
  transport: http(rpcUrl),
})

// Only create walletClient if PRIVATE_KEY is provided (for frontend use)
export const walletClient = privateKey 
  ? createWalletClient({
  account: privateKeyToAccount(privateKey),
  chain: genlayerChain,
  transport: http(rpcUrl),
})
  : null


