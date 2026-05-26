import { NextResponse } from 'next/server'
import { mintTokens } from '@/lib/erc20-token'

/**
 * POST /api/mint
 * Mints GEN tokens to a user's wallet address
 * Limited to 1000 GEN total supply (tracked separately since contract may have large initial supply)
 */
const MAX_TOTAL_SUPPLY = 1000 // Maximum total supply in GEN tokens

// In-memory tracking of minted amounts (in production, use a database)
// This tracks only amounts minted through this API
let trackedMintedAmount = 0

export async function POST(req: Request) {
  console.log(`[API] [POST /api/mint] Request received`)
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    console.log(`[API] [POST /api/mint] Request body:`, JSON.stringify(body, null, 2))
    
    const { address, amount } = body
    
    // Validate required fields
    if (!address || !amount) {
      const missingFields = []
      if (!address) missingFields.push('address')
      if (!amount) missingFields.push('amount')
      
      console.error(`[API] [POST /api/mint] Missing required fields:`, missingFields)
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate address format
    if (!address || address.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      )
    }

    // Validate amount
    const mintAmount = parseFloat(amount.toString())
    if (isNaN(mintAmount) || mintAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid mint amount. Must be a positive number.' },
        { status: 400 }
      )
    }

    // Check if minting would exceed max supply (using tracked amount)
    // Note: The contract may have a large initial supply, so we track our own minted amount
    const newTrackedSupply = trackedMintedAmount + mintAmount
    if (newTrackedSupply > MAX_TOTAL_SUPPLY) {
      const available = MAX_TOTAL_SUPPLY - trackedMintedAmount
      console.warn(`[API] [POST /api/mint] Mint would exceed max supply. Available: ${available} GEN`)
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot mint ${mintAmount} GEN. Maximum supply is ${MAX_TOTAL_SUPPLY} GEN. Already minted: ${trackedMintedAmount.toFixed(2)} GEN. Available: ${available.toFixed(2)} GEN.`,
          trackedMinted: trackedMintedAmount,
          maxSupply: MAX_TOTAL_SUPPLY,
          available
        },
        { status: 400 }
      )
    }

    console.log(`[API] [POST /api/mint] Minting ${mintAmount} GEN to ${address}`)
    console.log(`[API] [POST /api/mint] Tracked minted amount: ${trackedMintedAmount} GEN, will be: ${newTrackedSupply} GEN`)

    // Mint tokens
    const result = await mintTokens(address.trim(), mintAmount)
    
    // Update tracked amount after successful mint
    trackedMintedAmount = newTrackedSupply
    
    const duration = Date.now() - startTime
    console.log(`[API] [POST /api/mint] Success in ${duration}ms`)
    
    return NextResponse.json({ 
      success: true, 
      tx: result,
      amount: mintAmount,
      trackedMinted: trackedMintedAmount,
      maxSupply: MAX_TOTAL_SUPPLY
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API] [POST /api/mint] Error after ${duration}ms:`, error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to mint tokens'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mint
 * Returns current supply information
 * Uses tracked minted amount instead of contract total supply
 */
export async function GET(req: Request) {
  try {
    const available = Math.max(0, MAX_TOTAL_SUPPLY - trackedMintedAmount)
    
    return NextResponse.json({
      success: true,
      trackedMinted: trackedMintedAmount,
      maxSupply: MAX_TOTAL_SUPPLY,
      available,
      percentageUsed: (trackedMintedAmount / MAX_TOTAL_SUPPLY) * 100
    })
  } catch (error) {
    console.error('Error fetching mint info:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch mint info'
    }, { status: 500 })
  }
}

