/**
 * Genlayer Client Utility
 * Uses genlayer-js SDK to interact with Genlayer contracts
 * Generates a new private key if none is provided (for accounts with GEN tokens)
 */

import { createClient, createAccount, generatePrivateKey } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Account } from 'viem'

// Contract address from environment variable
const CONTRACT_ADDRESS = (process.env.GENLAYER_CONTRACT_ADDRESS || '0x87bC6D1e5Ae83B8fe3e806b45Ffe96B4ED615924') as `0x${string}`

// RPC URL from environment variable
const GENLAYER_RPC_URL = process.env.GENLAYER_RPC_URL || 'https://devconnect-25-studio.genlayer.com/api'

// Path to store generated private key (backend only - NOT from env)
const PRIVATE_KEY_FILE = join(process.cwd(), '.genlayer-key.json')

/**
 * Get or generate a private key for BACKEND use only
 * NOTE: This is separate from frontend wallet private keys
 * Backend always generates its own key for contract interactions
 */
function getOrGeneratePrivateKey(): `0x${string}` {
  // Check if we have a stored key from previous runs
  try {
    if (existsSync(PRIVATE_KEY_FILE)) {
      const stored = JSON.parse(readFileSync(PRIVATE_KEY_FILE, 'utf-8'))
      if (stored.privateKey && stored.privateKey.startsWith('0x')) {
        console.log('[Genlayer] Using stored backend private key')
        return stored.privateKey as `0x${string}`
      }
    }
  } catch (error) {
    console.warn('[Genlayer] Could not read stored key, generating new one:', error)
  }

  // Generate a new private key for backend use
  // NOTE: This is NOT the same as frontend wallet private key
  const newPrivateKey = generatePrivateKey()
  const account = createAccount(newPrivateKey)
  
  console.log('[Genlayer] Generated new backend private key')
  console.log('[Genlayer] Backend account address:', account.address)
  console.log('[Genlayer] ⚠️  IMPORTANT: Fund this backend account with GEN tokens to use the contract!')
  console.log('[Genlayer] ⚠️  Backend Account:', account.address)

  // Store the key for future use
  try {
    writeFileSync(PRIVATE_KEY_FILE, JSON.stringify({ 
      privateKey: newPrivateKey,
      address: account.address,
      generatedAt: new Date().toISOString(),
      note: 'This is the backend account key, separate from frontend wallet keys'
    }, null, 2))
    console.log('[Genlayer] Backend private key stored in:', PRIVATE_KEY_FILE)
  } catch (error) {
    console.warn('[Genlayer] Could not store private key:', error)
  }

  return newPrivateKey
}

/**
 * Get or create the Genlayer account
 */
function getAccount(): Account {
  const privateKey = getOrGeneratePrivateKey()
  return createAccount(privateKey)
}

/**
 * Get or create the Genlayer client
 * Uses studionet chain by default
 */
let clientInstance: ReturnType<typeof createClient> | null = null

function getClient(): ReturnType<typeof createClient> {
  if (clientInstance) {
    return clientInstance
  }

  const account = getAccount()
  console.log('[Genlayer] Creating client with backend account:', account.address)
  console.log('[Genlayer] Using chain: studionet')
  console.log('[Genlayer] RPC URL:', GENLAYER_RPC_URL)
  
  clientInstance = createClient({
    chain: studionet,
    account: account, // Account object ensures HTTP transport is used
    endpoint: GENLAYER_RPC_URL,
  })

  return clientInstance
}

/**
 * Helper to convert values to contract format
 */
function toU256(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    return value
  }
  if (typeof value === 'number') {
    return BigInt(Math.floor(value * 1e18)) // Convert to wei (18 decimals)
  }
  // Assume it's already a string representation
  return BigInt(value.toString())
}

function toU64(value: number | string): bigint {
  if (typeof value === 'number') {
    return BigInt(Math.floor(value / 1000)) // Convert milliseconds to seconds
  }
  return BigInt(value.toString())
}

/**
 * Helper function to safely stringify values that may contain BigInt
 */
function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    2
  )
}

/**
 * Call a view function on the contract
 */
export async function callContractView(functionName: string, args: unknown[] = [], contractAddress?: `0x${string}`): Promise<unknown> {
  const address = contractAddress || CONTRACT_ADDRESS
  console.log(`[Genlayer] [VIEW] Starting contract view call`)
  console.log(`[Genlayer] [VIEW] Function: ${functionName}`)
  console.log(`[Genlayer] [VIEW] Args:`, safeStringify(args))
  console.log(`[Genlayer] [VIEW] Contract: ${address}`)
  
  try {
    const client = getClient()
    
    console.log(`[Genlayer] [VIEW] Calling client.readContract...`)
    // Build the readContract params - only include args if there are any
    const readParams: {
      address: `0x${string}`
      functionName: string
      args?: never[]
    } = {
      address: address,
      functionName: functionName,
    }
    
    // Only add args if the array is not empty
    if (args.length > 0) {
      readParams.args = args as never[]
    }
    
    const result = await client.readContract(readParams)

    console.log(`[Genlayer] [VIEW] Success, result:`, safeStringify(result))
    return result
  } catch (error) {
    console.error(`[Genlayer] [VIEW] Error calling contract view ${functionName}:`, error)
    if (error instanceof Error) {
      console.error(`[Genlayer] [VIEW] Error message:`, error.message)
      console.error(`[Genlayer] [VIEW] Error stack:`, error.stack)
    }
    throw error
  }
}

/**
 * Wait for transaction receipt with timeout
 */
async function waitForTransactionReceipt(
  client: ReturnType<typeof createClient>,
  hash: `0x${string}`,
  timeout: number = 30_000
): Promise<unknown> {
  const startTime = Date.now()
  const pollInterval = 1000 // Poll every 1 second
  
  console.log(`[Genlayer] [WAIT] Waiting for transaction receipt: ${hash}`)
  console.log(`[Genlayer] [WAIT] Timeout: ${timeout}ms`)
  
  while (Date.now() - startTime < timeout) {
    try {
      // Check if client has waitForTransactionReceipt method (viem-compatible)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = client as any
      if (typeof clientAny.waitForTransactionReceipt === 'function') {
        const receipt = await clientAny.waitForTransactionReceipt({
          hash,
          timeout: timeout - (Date.now() - startTime),
        })
        console.log(`[Genlayer] [WAIT] Transaction receipt received`)
        return receipt
      }
      
      // Fallback: Try getTransactionReceipt
      if (typeof clientAny.getTransactionReceipt === 'function') {
        const receipt = await clientAny.getTransactionReceipt({ hash })
        if (receipt) {
          console.log(`[Genlayer] [WAIT] Transaction receipt received`)
          return receipt
        }
      }
      
      // If no receipt methods available, wait a bit and return hash
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    } catch (error) {
      // If transaction not found yet, continue polling
      if (error instanceof Error && error.message.includes('not found')) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        continue
      }
      throw error
    }
  }
  
  throw new Error(`Transaction receipt timeout after ${timeout}ms`)
}

/**
 * Send transaction with retry logic
 */
async function sendWithRetry(
  client: ReturnType<typeof createClient>,
  account: Account,
  params: {
    address: `0x${string}`
    functionName: string
    args: never[]
    value: bigint
  },
  maxAttempts: number = 3
): Promise<{ hash: `0x${string}`, receipt?: unknown }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Genlayer] [RETRY] Attempt ${attempt}/${maxAttempts}`)
      
      const hash = await client.writeContract({
        account: account,
        address: params.address,
        functionName: params.functionName,
        args: params.args,
        value: params.value,
      }) as `0x${string}`

      console.log(`[Genlayer] [RETRY] Transaction hash received: ${hash}`)
      
      // Wait for receipt with increasing timeout
      const timeout = 30_000 * attempt
      try {
        const receipt = await waitForTransactionReceipt(client, hash, timeout)
        console.log(`[Genlayer] [RETRY] Transaction confirmed on attempt ${attempt}`)
        return { hash, receipt }
      } catch (receiptError) {
        // If receipt wait fails but we have a hash, still return it
        console.warn(`[Genlayer] [RETRY] Could not wait for receipt:`, receiptError)
        return { hash }
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[Genlayer] [RETRY] All ${maxAttempts} attempts failed`)
        throw error
      }
      
      console.log(`[Genlayer] [RETRY] Attempt ${attempt} failed, retrying...`)
      if (error instanceof Error) {
        console.log(`[Genlayer] [RETRY] Error: ${error.message}`)
      }
      
      // Exponential backoff: wait longer with each attempt
      const backoffDelay = 1000 * attempt
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
    }
  }
  
  throw new Error('Max retry attempts reached')
}

/**
 * Call a write function on the contract with receipt waiting and retry logic
 */
export async function callContractWrite(functionName: string, args: unknown[] = [], contractAddress?: `0x${string}`): Promise<unknown> {
  const address = contractAddress || CONTRACT_ADDRESS
  const stringifyWithBigInt = (value: unknown) =>
    JSON.stringify(
      value,
      (_, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    )

  console.log(`[Genlayer] [WRITE] Starting contract write call`)
  console.log(`[Genlayer] [WRITE] Function: ${functionName}`)
  console.log(`[Genlayer] [WRITE] Args:`, stringifyWithBigInt(args))
  
  try {
    const client = getClient()
    const account = getAccount()
    
    console.log(`[Genlayer] [WRITE] Using account: ${account.address}`)
    console.log(`[Genlayer] [WRITE] Contract: ${address}`)
    console.log(`[Genlayer] [WRITE] Calling sendWithRetry...`)

    const result = await sendWithRetry(
      client,
      account,
      {
        address: address,
        functionName: functionName,
        args: args as never[],
        value: BigInt(0),
      },
      3 // maxAttempts
    )

    console.log(`[Genlayer] [WRITE] Success, transaction hash: ${result.hash}`)
    if (result.receipt) {
      console.log(`[Genlayer] [WRITE] Transaction receipt received`)
      // Log receipt details for debugging
      try {
        const receiptStr = JSON.stringify(
          result.receipt,
          (_, v) => (typeof v === 'bigint' ? v.toString() : v),
          2
        )
        console.log(`[Genlayer] [WRITE] Receipt details:`, receiptStr.substring(0, 500))
      } catch (e) {
        console.log(`[Genlayer] [WRITE] Could not stringify receipt:`, e)
      }
    }
    
    // Return the receipt if available, otherwise return the hash
    return result.receipt || result.hash
  } catch (error) {
    console.error(`[Genlayer] [WRITE] Error calling contract write ${functionName}:`, error)
    if (error instanceof Error) {
      console.error(`[Genlayer] [WRITE] Error message:`, error.message)
      console.error(`[Genlayer] [WRITE] Error stack:`, error.stack)
    }
    throw error
  }
}

/**
 * Contract interaction helpers
 */
export const contract = {
  // Market operations
  async createMarket(params: {
    marketId: string
    question: string
    category: string
    options: string[]
    deadline: number // milliseconds
    price: number // in GEN
    imageUrl: string // base64
    creator: string
    resolutionUrl: string
  }) {
    console.log(`[Genlayer] [contract.createMarket] Called with params:`, {
      ...params,
      imageUrl: params.imageUrl.substring(0, 50) + '...'
    })
    
    return callContractWrite('create_market', [
      params.marketId,
      params.question,
      params.category,
      params.options,
      toU64(params.deadline),
      toU256(params.price),
      params.imageUrl,
      params.creator,
      params.resolutionUrl
    ])
  },

  async getMarket(marketId: string) {
    console.log(`[Genlayer] [contract.getMarket] Called with marketId:`, marketId)
    return callContractView('get_market', [marketId])
  },

  async getAllMarkets() {
    console.log(`[Genlayer] [contract.getAllMarkets] Called`)
    return callContractView('get_all_markets', [])
  },

  // Note: list_markets, list_resolved_markets, and list_unresolved_markets don't exist in the contract
  // Use getAllMarkets() and filter by has_resolved on the backend instead

  async getMarketsByCategory(category: string) {
    console.log(`[Genlayer] [contract.getMarketsByCategory] Called with category:`, category)
    return callContractView('get_markets_by_category', [category])
  },

  async getMarketsPaginated(offset: number, limit: number) {
    console.log(`[Genlayer] [contract.getMarketsPaginated] Called with offset: ${offset}, limit: ${limit}`)
    return callContractView('get_markets_paginated', [offset, limit])
  },

  async getMarketStats(marketId: string) {
    console.log(`[Genlayer] [contract.getMarketStats] Called with marketId:`, marketId)
    return callContractView('get_market_stats', [marketId])
  },

  // Bet operations
  async placeBet(params: {
    marketId: string
    option: string
    amount: string // in wei
    bettor: string
  }) {
    console.log(`[Genlayer] [contract.placeBet] Called with params:`, params)
    return callContractWrite('place_bet', [
      params.marketId,
      params.option,
      BigInt(params.amount),
      params.bettor
    ])
  },

  // Note: get_bets(marketId) doesn't exist in the contract
  // Use getAllBets() and filter by marketId on the backend instead
  async getAllBets() {
    console.log(`[Genlayer] [contract.getAllBets] Called`)
    return callContractView('get_all_bets', [])
  },

  async getUserBets(bettor: string) {
    console.log(`[Genlayer] [contract.getUserBets] Called with bettor:`, bettor)
    return callContractView('get_user_bets', [bettor])
  },

  async getUserMarkets(creator: string) {
    console.log(`[Genlayer] [contract.getUserMarkets] Called with creator:`, creator)
    return callContractView('get_user_markets', [creator])
  },

  async hasUserBet(marketId: string, bettor: string) {
    console.log(`[Genlayer] [contract.hasUserBet] Called with marketId: ${marketId}, bettor: ${bettor}`)
    return callContractView('has_user_bet', [marketId, bettor])
  },

  // Resolution operations
  async resolveMarket(marketId: string, caller: string) {
    console.log(`[Genlayer] [contract.resolveMarket] Called with marketId: ${marketId}, caller: ${caller}`)
    return callContractWrite('resolve_market', [marketId, caller])
  }
}

/**
 * Get the current account address
 * Useful for displaying which account is being used
 */
export function getAccountAddress(): string {
  const account = getAccount()
  return account.address
}

/**
 * Get account balance
 */
export async function getAccountBalance(address?: string) {
  try {
    const client = getClient()
    const account = getAccount()
    const addressToCheck = (address as `0x${string}`) || account.address
    
    console.log(`[Genlayer] [getAccountBalance] Getting balance for:`, addressToCheck)
    const balance = await client.getBalance({ address: addressToCheck })
    
    const result = {
      wei: balance,
      gen: Number(balance) / 1e18,
      formatted: `${Number(balance) / 1e18} GEN`
    }
    
    console.log(`[Genlayer] [getAccountBalance] Balance:`, result.formatted)
    return result
  } catch (error) {
    console.error(`[Genlayer] [getAccountBalance] Error:`, error)
    throw error
  }
}

export { CONTRACT_ADDRESS, toU256, toU64, getAccount, getClient }
