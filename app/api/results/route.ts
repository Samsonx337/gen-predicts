import { NextResponse } from 'next/server'
import { contract } from '@/lib/genlayer-client'

// POST /api/results - Resolve a market
export async function POST(req: Request) {
  console.log(`[API] [POST /api/results] Request received`)
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    console.log(`[API] [POST /api/results] Request body:`, JSON.stringify(body, null, 2))
    
    const { marketId, caller } = body
    console.log(`[API] [POST /api/results] Parsed fields:`, { marketId, caller })

    // Validate required fields
    if (!marketId || !caller) {
      const missingFields = []
      if (!marketId) missingFields.push('marketId')
      if (!caller) missingFields.push('caller')
      
      console.error(`[API] [POST /api/results] Missing required fields:`, missingFields)
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate caller address format
    if (!caller.startsWith('0x') || caller.length !== 42) {
      return NextResponse.json(
        { success: false, error: 'Invalid caller address format' },
        { status: 400 }
      )
    }

    // Call contract to resolve market
    console.log(`[API] [POST /api/results] Calling contract.resolveMarket...`)
    const result = await contract.resolveMarket(marketId, caller)
    console.log(`[API] [POST /api/results] Contract result:`, JSON.stringify(result, null, 2))

    // Check if result indicates an error
    if (typeof result === 'string' && (result.includes('❌') || result.includes('⚠️') || result.includes('🚫'))) {
      console.error(`[API] [POST /api/results] Contract returned error:`, result)
      return NextResponse.json(
        { success: false, error: result },
        { status: 400 }
      )
    }

    // If result is an object, check the transaction status
    if (result && typeof result === 'object') {
      const resultObj = result as Record<string, unknown>
      
      // Check transaction status from the receipt
      const status = resultObj.status
      const statusName = resultObj.status_name
      const resultName = resultObj.result_name
      
      console.log(`[API] [POST /api/results] Transaction status:`, { status, statusName, resultName })
      
      // Check if the transaction was actually successful and market was resolved
      // Status 6 = UNDETERMINED, Status 7 = FINALIZED
      // If status is UNDETERMINED or result_name is MAJORITY_DISAGREE, the market wasn't resolved
      if (status === 6 || statusName === 'UNDETERMINED' || resultName === 'MAJORITY_DISAGREE') {
        console.warn(`[API] [POST /api/results] Market resolution failed - validators disagreed or status undetermined`)
        
        // Verify by checking the market's resolved status on-chain
        try {
          const marketData = await contract.getMarket(marketId)
          let marketDataObj: Record<string, unknown> = {}
          if (marketData instanceof Map) {
            for (const [key, value] of marketData.entries()) {
              marketDataObj[String(key)] = value
            }
          } else if (marketData && typeof marketData === 'object') {
            marketDataObj = marketData as Record<string, unknown>
          }
          
          const hasResolved = marketDataObj.has_resolved || marketDataObj[7] || false
          console.log(`[API] [POST /api/results] Market has_resolved status:`, hasResolved)
          
          if (!hasResolved) {
            const duration = Date.now() - startTime
            console.log(`[API] [POST /api/results] Market resolution failed after ${duration}ms`)
            return NextResponse.json({
              success: false,
              error: 'Market resolution failed: Validators disagreed on the outcome. The market remains unresolved. You may try resolving again later.',
              tx: result,
              status: statusName,
              resultName: resultName
            }, { status: 400 })
          }
        } catch (verifyError) {
          console.error(`[API] [POST /api/results] Error verifying market status:`, verifyError)
          // If we can't verify, still return error based on transaction status
          const duration = Date.now() - startTime
          console.log(`[API] [POST /api/results] Market resolution failed (verification error) after ${duration}ms`)
          return NextResponse.json({
            success: false,
            error: 'Market resolution failed: Validators disagreed on the outcome. The market remains unresolved.',
            tx: result,
            status: statusName,
            resultName: resultName
          }, { status: 400 })
        }
      }
      
      // If we get here, the market was successfully resolved
      // Verify by checking the market's resolved status
      try {
        const marketData = await contract.getMarket(marketId)
        let marketDataObj: Record<string, unknown> = {}
        if (marketData instanceof Map) {
          for (const [key, value] of marketData.entries()) {
            marketDataObj[String(key)] = value
          }
        } else if (marketData && typeof marketData === 'object') {
          marketDataObj = marketData as Record<string, unknown>
        }
        
        const hasResolved = marketDataObj.has_resolved || marketDataObj[7] || false
        const marketResult = (marketDataObj.result || marketDataObj[8] || '')?.toString() || ''
        
        if (!hasResolved) {
          const duration = Date.now() - startTime
          console.warn(`[API] [POST /api/results] Market not resolved after transaction (${duration}ms), status: ${statusName}`)
          return NextResponse.json({
            success: false,
            error: 'Market resolution is pending. The transaction was submitted but validators are still reaching consensus. Please check again later.',
            tx: result,
            status: statusName
          }, { status: 202 }) // 202 Accepted - transaction submitted but not finalized
        }
        
        const duration = Date.now() - startTime
        console.log(`[API] [POST /api/results] Market successfully resolved in ${duration}ms`)
        return NextResponse.json({ 
          success: true, 
          tx: result,
          data: {
            marketId: (resultObj.market_id || marketId)?.toString() || marketId,
            outcome: marketResult || (resultObj.result || '')?.toString() || '',
            confidence: (resultObj.confidence || 'N/A')?.toString() || 'N/A',
            explanation: (resultObj.explanation || 'N/A')?.toString() || 'N/A'
          }
        })
      } catch (verifyError) {
        console.error(`[API] [POST /api/results] Error verifying market resolution:`, verifyError)
        // If verification fails but transaction looks successful, return success with warning
        const duration = Date.now() - startTime
        console.log(`[API] [POST /api/results] Success (verification failed) in ${duration}ms`)
        return NextResponse.json({ 
          success: true, 
          tx: result,
          data: {
            marketId: (resultObj.market_id || marketId)?.toString() || marketId,
            outcome: (resultObj.result || '')?.toString() || '',
            confidence: (resultObj.confidence || 'N/A')?.toString() || 'N/A',
            explanation: (resultObj.explanation || 'N/A')?.toString() || 'N/A'
          },
          warning: 'Could not verify market resolution status. Please refresh to check.'
        })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[API] [POST /api/results] Success in ${duration}ms`)
    return NextResponse.json({ 
      success: true, 
      tx: result 
    })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`[API] [POST /api/results] Error after ${duration}ms:`, err)
    if (err instanceof Error) {
      console.error(`[API] [POST /api/results] Error message:`, err.message)
      console.error(`[API] [POST /api/results] Error stack:`, err.stack)
    }
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to publish result' 
      },
      { status: 500 }
    )
  }
}

// GET /api/results - Get all resolved markets
export async function GET(req: Request) {
  console.log(`[API] [GET /api/results] Request received`)
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(req.url)
    const marketId = searchParams.get('marketId')
    console.log(`[API] [GET /api/results] Query params:`, { marketId })

    // If marketId is provided, get result for that specific market
    if (marketId) {
      console.log(`[API] [GET /api/results] Getting result for market: ${marketId}`)
      const marketDataRaw = await contract.getMarket(marketId)
      console.log(`[API] [GET /api/results] Market raw data:`, marketDataRaw)
      
      // Handle Map or object response from genlayer-js
      let marketData: Record<string, unknown> = {}
      if (marketDataRaw instanceof Map) {
        for (const [key, value] of marketDataRaw.entries()) {
          marketData[String(key)] = value
        }
        console.log(`[API] [GET /api/results] Converted Map to object:`, marketData)
      } else if (marketDataRaw && typeof marketDataRaw === 'object') {
        marketData = marketDataRaw as Record<string, unknown>
      }
      
      console.log(`[API] [GET /api/results] Market processed data:`, JSON.stringify(marketData, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      , 2))
      
      if (marketData.error) {
        console.error(`[API] [GET /api/results] Market has error:`, marketData.error)
        return NextResponse.json(
          { success: false, error: marketData.error },
          { status: 404 }
        )
      }

      const hasResolved = marketData.has_resolved || marketData[7] || false
      if (!hasResolved) {
        console.log(`[API] [GET /api/results] Market not resolved yet`)
        return NextResponse.json(
          { success: true, data: [] }
        )
      }

      // Convert resolvedAt from deadline if available, or use current time
      const deadlineValue = marketData.deadline || marketData[3]
      const deadlineNum = deadlineValue 
        ? (typeof deadlineValue === 'bigint' ? Number(deadlineValue) : Number(deadlineValue))
        : null
      const resolvedAt = deadlineNum ? deadlineNum * 1000 : Date.now()

      const result = {
        marketId: (marketData.market_id || marketId)?.toString() || marketId,
        outcome: (marketData.result || marketData[8] || '')?.toString() || '',
        resolvedAt: resolvedAt,
        resolvedAtFormatted: new Date(resolvedAt).toISOString()
      }
      console.log(`[API] [GET /api/results] Result formatted:`, JSON.stringify(result, null, 2))
      
      const duration = Date.now() - startTime
      console.log(`[API] [GET /api/results] Success in ${duration}ms`)
      return NextResponse.json({
        success: true,
        data: [result]
      })
    }

    // Get all markets and filter by resolved status
    // Note: list_resolved_markets() doesn't exist, so we use get_all_markets() and filter
    console.log(`[API] [GET /api/results] Getting all markets and filtering resolved ones...`)
    const marketsRaw = await contract.getAllMarkets()
    console.log(`[API] [GET /api/results] All markets received:`, marketsRaw)
    
    // Handle different response formats from genlayer-js
    let allMarkets: unknown[] = []
    
    if (marketsRaw instanceof Map) {
      allMarkets = Array.from(marketsRaw.values())
    } else if (Array.isArray(marketsRaw)) {
      allMarkets = marketsRaw
    } else if (marketsRaw && typeof marketsRaw === 'object') {
      const obj = marketsRaw as Record<string, unknown>
      if (Array.isArray(obj.data)) {
        allMarkets = obj.data
      } else if (Array.isArray(obj.result)) {
        allMarkets = obj.result
      } else if (Array.isArray(obj.markets)) {
        allMarkets = obj.markets
      }
    }
    
    console.log(`[API] [GET /api/results] Processed markets: ${allMarkets.length}`)
    
    // Filter resolved markets
    const resolvedMarkets = allMarkets.filter((market: unknown) => {
      let marketData: Record<string, unknown> = {}
      if (market instanceof Map) {
        for (const [key, value] of market.entries()) {
          marketData[String(key)] = value
        }
      } else if (market && typeof market === 'object') {
        marketData = market as Record<string, unknown>
      }
      
      const hasResolved = marketData.has_resolved || marketData[7] || false
      return hasResolved === true || hasResolved === 'true' || hasResolved === 1
    })
    
    console.log(`[API] [GET /api/results] Found ${resolvedMarkets.length} resolved markets`)
    
    if (resolvedMarkets.length === 0) {
      console.log(`[API] [GET /api/results] No resolved markets found`)
      return NextResponse.json({ success: true, data: [] })
    }

    // Format resolved markets as results
    console.log(`[API] [GET /api/results] Formatting ${resolvedMarkets.length} resolved markets...`)
    const results = resolvedMarkets.map((market: unknown) => {
      try {
        let marketData: Record<string, unknown> = {}
        if (market instanceof Map) {
          for (const [key, value] of market.entries()) {
            marketData[String(key)] = value
          }
        } else if (market && typeof market === 'object') {
          marketData = market as Record<string, unknown>
        }
        
        const marketId = (marketData.market_id || '')?.toString() || ''
        const deadlineValue = marketData.deadline || marketData[3]
        const deadlineNum = deadlineValue 
          ? (typeof deadlineValue === 'bigint' ? Number(deadlineValue) : Number(deadlineValue))
          : null
        const resolvedAt = deadlineNum ? deadlineNum * 1000 : Date.now()

        return {
          marketId: marketId,
          outcome: (marketData.result || marketData[8] || '')?.toString() || '',
          resolvedAt: resolvedAt,
          resolvedAtFormatted: new Date(resolvedAt).toISOString()
        }
      } catch (err) {
        console.error(`[API] [GET /api/results] Error formatting market:`, err)
        return null
      }
    })

    // Filter out null values
    const validResults = results.filter((result): result is NonNullable<typeof result> => result !== null)
    console.log(`[API] [GET /api/results] Valid results: ${validResults.length}/${results.length}`)

    const duration = Date.now() - startTime
    console.log(`[API] [GET /api/results] Success in ${duration}ms, returning ${validResults.length} results`)
    return NextResponse.json({ success: true, data: validResults })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`[API] [GET /api/results] Error after ${duration}ms:`, err)
    if (err instanceof Error) {
      console.error(`[API] [GET /api/results] Error message:`, err.message)
      console.error(`[API] [GET /api/results] Error stack:`, err.stack)
    }
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch results' 
      },
      { status: 500 }
    )
  }
}
