// Helper functions to get user balance on Genlayer

import { formatEther } from 'viem'
import { publicClient } from './clients'

/**
 * Gets the native token (GEN) balance for a given wallet address
 * @param address - The wallet address to check balance for
 * @returns Balance in GEN (as a number, not wei)
 */
export async function getBalance(address: `0x${string}`): Promise<number> {
  try {
    const balance = await publicClient.getBalance({ address })
    // Convert from wei to GEN (18 decimals)
    const balanceInGen = parseFloat(formatEther(balance))
    return balanceInGen
  } catch (error) {
    console.error('Error fetching balance:', error)
    return 0
  }
}

/**
 * Gets the balance as a formatted string
 * @param address - The wallet address to check balance for
 * @returns Formatted balance string (e.g., "1,234.56 GEN")
 */
export async function getFormattedBalance(address: `0x${string}`): Promise<string> {
  try {
    const balance = await getBalance(address)
    return `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} GEN`
  } catch (error) {
    console.error('Error formatting balance:', error)
    return '0 GEN'
  }
}

