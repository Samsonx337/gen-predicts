import { NextResponse } from 'next/server'
import { contract } from '@/lib/genlayer-client'
import { formatEther, parseEther } from 'viem'
import { getTokenBalance } from '@/lib/erc20-token'

// POST /api/bets - Place a bet
export async function POST(req: Request) {
  console.log(`[API] [POST /api/bets] Request received`)
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    console.log(`[API] [POST /api/bets] Request body:`, JSON.stringify(body, null, 2))
    
    const { marketId, bettor, option, amount } = body
    console.log(`[API] [POST /api/bets] Parsed fields:`, { marketId, bettor, option, amount })

    // Validate required fields
    if (!marketId || !bettor || !option || !amount) {
      const missingFields = []
      if (!marketId) missingFields.push('marketId')
      if (!bettor) missingFields.push('bettor')
      if (!option) missingFields.push('option')
      if (!amount) missingFields.push('amount')
      
      console.error(`[API] [POST /api/bets] Missing required fields:`, missingFields)
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate bettor address format (lenient for GenLayer addresses)
    if (!bettor || bettor.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid bettor address format' },
        { status: 400 }
      )
    }

    // Check ERC20 token balance before placing bet
    console.log(`[API] [POST /api/bets] Checking token balance for: ${bettor}`)
    const tokenBalance = await getTokenBalance(bettor.trim())
    const betAmount = parseFloat(amount.toString())
    
    if (tokenBalance < betAmount) {
      console.warn(`[API] [POST /api/bets] Insufficient token balance: ${tokenBalance} < ${betAmount}`)
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient GEN balance. You have ${tokenBalance.toFixed(2)} GEN but need ${betAmount} GEN to place this bet.`,
          balance: tokenBalance,
          required: betAmount
        },
        { status: 400 }
      )
    }

    console.log(`[API] [POST /api/bets] Token balance check passed: ${tokenBalance} >= ${betAmount}`)

    // Convert amount to wei (u256 format)
    const amountInWei = parseEther(amount.toString()).toString()
    console.log(`[API] [POST /api/bets] Amount converted: ${amount} GEN -> ${amountInWei} wei`)

    // Call contract
    console.log(`[API] [POST /api/bets] Calling contract.placeBet...`)
    const contractParams = {
      marketId,
      option,
      amount: amountInWei,
      bettor
    }
    console.log(`[API] [POST /api/bets] Contract params:`, JSON.stringify(contractParams, null, 2))
    
    const result = await contract.placeBet(contractParams)
    console.log(`[API] [POST /api/bets] Contract result:`, JSON.stringify(result, null, 2))

    // Check if result indicates an error
    if (typeof result === 'string' && (result.includes('❌') || result.includes('⚠️'))) {
      console.error(`[API] [POST /api/bets] Contract returned error:`, result)
      return NextResponse.json(
        { success: false, error: result },
        { status: 400 }
      )
    }

    // If result is an object with status, it's successful
    if (result && typeof result === 'object' && 'status' in result && (result as { status: string }).status === 'success') {
      const duration = Date.now() - startTime
      console.log(`[API] [POST /api/bets] Success in ${duration}ms`)
      return NextResponse.json({ 
        success: true, 
        tx: result, // In production, this would be a transaction hash
        data: result
      })
    }

    const duration = Date.now() - startTime
    console.log(`[API] [POST /api/bets] Success in ${duration}ms`)
    return NextResponse.json({ 
      success: true, 
      tx: result 
    })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`[API] [POST /api/bets] Error after ${duration}ms:`, err)
    if (err instanceof Error) {
      console.error(`[API] [POST /api/bets] Error message:`, err.message)
      console.error(`[API] [POST /api/bets] Error stack:`, err.stack)
    }
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to place bet' 
      },
      { status: 500 }
    )
  }
}

// GET /api/bets - Get all bets (optionally filtered by marketId)
export async function GET(req: Request) {
  console.log(`[API] [GET /api/bets] Request received`)
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(req.url)
    const marketId = searchParams.get('marketId')
    console.log(`[API] [GET /api/bets] Query params:`, { marketId })

    // If marketId is provided, get all bets and filter by marketId
    // Note: The contract doesn't have get_bets(marketId), so we use get_all_bets() and filter
    if (marketId) {
      console.log(`[API] [GET /api/bets] MarketId provided: ${marketId}, fetching all bets and filtering...`)
      
      try {
        // Get all bets and filter by marketId
        const betsRaw = await contract.getAllBets()
        console.log(`[API] [GET /api/bets] All bets received, filtering for market: ${marketId}`)
        
        // Handle different response formats from genlayer-js
        let allBets: unknown[] = []
        
        if (betsRaw instanceof Map) {
          allBets = Array.from(betsRaw.values())
        } else if (Array.isArray(betsRaw)) {
          allBets = betsRaw
        } else if (betsRaw && typeof betsRaw === 'object') {
          const obj = betsRaw as Record<string, unknown>
          if (Array.isArray(obj.data)) {
            allBets = obj.data
          } else if (Array.isArray(obj.result)) {
            allBets = obj.result
          } else if (Array.isArray(obj.bets)) {
            allBets = obj.bets
          }
        }
        
        // Filter bets for this market
        const marketBets = allBets.filter((bet: unknown) => {
          let betObj: Record<string, unknown> = {}
          if (bet instanceof Map) {
            for (const [key, value] of bet.entries()) {
              betObj[String(key)] = value
            }
          } else if (bet && typeof bet === 'object') {
            betObj = bet as Record<string, unknown>
          }
          const betMarketId = (betObj.market_id || '')?.toString() || ''
          return betMarketId === marketId
        })
        
        console.log(`[API] [GET /api/bets] Found ${marketBets.length} bets for market ${marketId}`)
        
        if (marketBets.length === 0) {
          return NextResponse.json({ success: true, data: [] })
        }

        // Format bets data
        const formattedBets = marketBets.map((bet: unknown, index: number) => {
          let betObj: Record<string, unknown> = {}
          if (bet instanceof Map) {
            for (const [key, value] of bet.entries()) {
              betObj[String(key)] = value
            }
          } else if (bet && typeof bet === 'object') {
            betObj = bet as Record<string, unknown>
          }
          
          const amountValue = betObj.amount || betObj[2] || '0'
          const amountWei = typeof amountValue === 'bigint' ? amountValue : BigInt(amountValue.toString())
          const amountFormatted = formatEther(amountWei)
          
          return {
            marketId,
            bettor: (betObj.bettor || betObj[0] || '')?.toString() || '',
            option: (betObj.option || betObj[1] || '')?.toString() || '',
            amount: amountWei.toString(),
            amountFormatted: amountFormatted,
            amountInEther: parseFloat(amountFormatted)
          }
        })

        const duration = Date.now() - startTime
        console.log(`[API] [GET /api/bets] Success in ${duration}ms, returning ${formattedBets.length} bets`)
        return NextResponse.json({ success: true, data: formattedBets })
      } catch (filterError) {
        console.error(`[API] [GET /api/bets] Error fetching/filtering bets:`, filterError)
        return NextResponse.json(
          { 
            success: false, 
            error: filterError instanceof Error ? filterError.message : 'Failed to fetch bets' 
          },
          { status: 500 }
        )
      }
    }

    // If no marketId, get all bets across all markets (optimized with batch getter)
    console.log(`[API] [GET /api/bets] No marketId provided, using getAllBets() batch getter`)
    
    try {
      // Use optimized batch getter - single call instead of N+1
      console.log(`[API] [GET /api/bets] Calling contract.getAllBets()...`)
      const betsRaw = await contract.getAllBets()
      console.log(`[API] [GET /api/bets] All bets received:`, betsRaw)
      console.log(`[API] [GET /api/bets] Is array:`, Array.isArray(betsRaw))
      console.log(`[API] [GET /api/bets] Is Map:`, betsRaw instanceof Map)
      
      // Handle different response formats from genlayer-js
      let bets: unknown[] = []
      
      if (betsRaw instanceof Map) {
        bets = Array.from(betsRaw.values())
        console.log(`[API] [GET /api/bets] Converted Map to array:`, bets.length)
      } else if (Array.isArray(betsRaw)) {
        bets = betsRaw
      } else if (betsRaw && typeof betsRaw === 'object') {
        const obj = betsRaw as Record<string, unknown>
        if (Array.isArray(obj.data)) {
          bets = obj.data
        } else if (Array.isArray(obj.result)) {
          bets = obj.result
        } else if (Array.isArray(obj.bets)) {
          bets = obj.bets
        }
      }
      
      console.log(`[API] [GET /api/bets] Processed bets:`, bets.length)
      
      if (!bets || bets.length === 0) {
        console.log(`[API] [GET /api/bets] No bets found`)
        return NextResponse.json({ success: true, data: [] })
      }

      // Format bets data
      console.log(`[API] [GET /api/bets] Formatting ${bets.length} bets...`)
      const formattedBets = bets.map((bet: unknown, index: number) => {
        try {
          // Handle Map or object bet
          let betObj: Record<string, unknown> = {}
          if (bet instanceof Map) {
            for (const [key, value] of bet.entries()) {
              betObj[String(key)] = value
            }
          } else if (bet && typeof bet === 'object') {
            betObj = bet as Record<string, unknown>
          } else {
            console.warn(`[API] [GET /api/bets] Unexpected bet data format at index ${index}`)
            return null
          }
          
          // Extract market_id from bet (contract includes it in get_all_bets)
          const marketId = (betObj.market_id || '')?.toString() || ''
          const amountValue = betObj.amount || betObj[2] || '0'
          const amountWei = typeof amountValue === 'bigint' ? amountValue : BigInt(amountValue.toString())
          const amountFormatted = formatEther(amountWei)
          
          return {
            marketId: marketId,
            bettor: (betObj.bettor || betObj[0] || '')?.toString() || '',
            option: (betObj.option || betObj[1] || '')?.toString() || '',
            amount: amountWei.toString(),
            amountFormatted: amountFormatted,
            amountInEther: parseFloat(amountFormatted)
          }
        } catch (err) {
          console.error(`[API] [GET /api/bets] Error formatting bet at index ${index}:`, err)
          return null
        }
      })

      // Filter out null values
      const validBets = formattedBets.filter((bet): bet is NonNullable<typeof bet> => bet !== null)
      
      const duration = Date.now() - startTime
      console.log(`[API] [GET /api/bets] Success in ${duration}ms, returning ${validBets.length} total bets`)
      return NextResponse.json({ success: true, data: validBets })
    } catch (aggregateError) {
      console.error(`[API] [GET /api/bets] Error fetching all bets:`, aggregateError)
      if (aggregateError instanceof Error) {
        console.error(`[API] [GET /api/bets] Error message:`, aggregateError.message)
        console.error(`[API] [GET /api/bets] Error stack:`, aggregateError.stack)
        // If it's a parameter error, return a more helpful message
        if (aggregateError.message.includes('Missing or invalid parameters') || 
            aggregateError.message.includes('parameters')) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Contract call failed: ${aggregateError.message}. Please verify the contract address and function names match your deployed contract.` 
            },
            { status: 500 }
          )
        }
      }
      // Fallback to empty array if batch fetch fails (for other errors)
      return NextResponse.json({ success: true, data: [] })
    }
  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`[API] [GET /api/bets] Error after ${duration}ms:`, err)
    if (err instanceof Error) {
      console.error(`[API] [GET /api/bets] Error message:`, err.message)
      console.error(`[API] [GET /api/bets] Error stack:`, err.stack)
    }
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch bets' 
      },
      { status: 500 }
    )
  }
}
