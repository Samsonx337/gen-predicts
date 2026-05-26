import { NextResponse } from 'next/server'
import { getTokenBalance } from '@/lib/erc20-token'

/**
 * GET /api/balance?address=0x...
 * Returns the ERC20 token balance for a given wallet address
 * Token Address: 0x3c4fa9dBB58cc64FD31Aaef01a92f8875E26b577
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address parameter is required' },
        { status: 400 }
      )
    }

    // Validate address format (supports both hex and other formats for GenLayer)
    // GenLayer addresses might not always be standard hex, so we'll be lenient
    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      )
    }

    // Get ERC20 token balance (GEN tokens)
    // Default to 0 if address doesn't have GEN tokens (all EVM addresses supported)
    const balance = await getTokenBalance(address.trim())

    return NextResponse.json({
      success: true,
      balance: balance,
      balanceFormatted: `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      tokenAddress: process.env.ERC20_TOKEN_ADDRESS || '0x3c4fa9dBB58cc64FD31Aaef01a92f8875E26b577',
    })
  } catch (error) {
    console.error('Error fetching ERC20 token balance:', error)
    // Return 0 balance on error (default behavior for addresses without GEN tokens)
    return NextResponse.json({
      success: true,
      balance: 0,
      balanceFormatted: '0',
      tokenAddress: process.env.ERC20_TOKEN_ADDRESS || '0x3c4fa9dBB58cc64FD31Aaef01a92f8875E26b577',
      error: error instanceof Error ? error.message : 'Failed to fetch balance, defaulting to 0',
    })
  }
}

