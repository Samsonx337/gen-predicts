import { NextResponse } from 'next/server'
import { contract } from '@/lib/genlayer-client'
import { formatEther } from 'viem'

// POST /api/markets - Create a new market
export async function POST(req: Request) {
  console.log(`[API] [POST /api/markets] Request received`)
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    console.log(`[API] [POST /api/markets] Request body:`, JSON.stringify(body, null, 2))
    
    const { marketId, question, category, deadline, options, price, imageUrl, creator, resolutionUrl } = body
    
    console.log(`[API] [POST /api/markets] Parsed fields:`, {
      marketId,
      question: question?.substring(0, 50) + '...',
      category,
      deadline,
      options,
      price,
      imageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'empty',
      creator,
      resolutionUrl
    })
    
    // Validate required fields
    // resolutionUrl is required but can be an empty string
    if (!marketId || !question || !category || deadline === undefined || deadline === null || !options || !price || !creator || resolutionUrl === undefined || resolutionUrl === null) {
      const missingFields = []
      if (!marketId) missingFields.push('marketId')
      if (!question) missingFields.push('question')
      if (!category) missingFields.push('category')
      if (deadline === undefined || deadline === null) missingFields.push('deadline')
      if (!options) missingFields.push('options')
      if (!price) missingFields.push('price')
      if (!creator) missingFields.push('creator')
      if (resolutionUrl === undefined || resolutionUrl === null) missingFields.push('resolutionUrl')
      
      console.error(`[API] [POST /api/markets] Missing required fields:`, missingFields)
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate creator address format
    if (!creator || typeof creator !== 'string' || !creator.startsWith('0x')) {
      return NextResponse.json(
        { success: false, error: 'Creator address is required and must be a valid address' },
        { status: 400 }
      )
    }

    // Ensure options is an array
    const optionsArray = Array.isArray(options) ? options : options.split(',').map((opt: string) => opt.trim())
    console.log(`[API] [POST /api/markets] Options array:`, optionsArray)
    
    // Call contract (it will handle conversions internally)
    console.log(`[API] [POST /api/markets] Calling contract.createMarket...`)
    const contractParams = {
      marketId,
      question,
      category,
      options: optionsArray,
      deadline: deadline, // Pass as milliseconds, function will convert to seconds
      price: parseFloat(price.toString()), // Pass as number in GEN, function will convert to wei
      imageUrl: imageUrl || '', // Base64 image URL
      creator,
      resolutionUrl
    }
    console.log(`[API] [POST /api/markets] Contract params:`, JSON.stringify({
      ...contractParams,
      imageUrl: contractParams.imageUrl.substring(0, 50) + '...'
    }, null, 2))
    
    const result = await contract.createMarket(contractParams)
    console.log(`[API] [POST /api/markets] Contract result:`, JSON.stringify(result, null, 2))

    // Check if result indicates an error
    if (typeof result === 'string' && result.includes('⚠️')) {
      console.error(`[API] [POST /api/markets] Contract returned warning:`, result)
      return NextResponse.json(
        { success: false, error: result },
        { status: 400 }
      )
    }

    // Extract transaction hash from result
    // Result could be: transaction hash (string), receipt object, or contract return value (string)
    let txHash: string | undefined = undefined
    let message: string = 'Market created successfully'
    
    if (typeof result === 'string') {
      // If it's a transaction hash (starts with 0x and is long enough)
      if (result.startsWith('0x') && result.length > 20) {
        txHash = result
      } else {
        // Otherwise it's a message from the contract
        message = result
      }
    } else if (result && typeof result === 'object') {
      // If it's an object (receipt), try to extract hash
      const receipt = result as { hash?: string; transactionHash?: string; [key: string]: unknown }
      txHash = receipt.hash || receipt.transactionHash as string | undefined
      // If there's a message in the receipt, use it
      if (receipt.message && typeof receipt.message === 'string') {
        message = receipt.message
      }
    }

    const duration = Date.now() - startTime
    console.log(`[API] [POST /api/markets] Success in ${duration}ms`)
    
    return NextResponse.json({ 
      success: true, 
      message: message,
      tx: txHash || message // Use transaction hash if available, otherwise use message
    })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`[API] [POST /api/markets] Error after ${duration}ms:`, err)
    if (err instanceof Error) {
      console.error(`[API] [POST /api/markets] Error message:`, err.message)
      console.error(`[API] [POST /api/markets] Error stack:`, err.stack)
    }
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create market' 
      },
      { status: 500 }
    )
  }
}

// GET /api/markets - Get all markets (optimized with batch getter)
export async function GET() {
  console.log(`[API] [GET /api/markets] Request received`)
  const startTime = Date.now()
  
  try {
    // Use optimized batch getter - single call instead of N+1
    console.log(`[API] [GET /api/markets] Calling contract.getAllMarkets()...`)
    const marketsRaw = await contract.getAllMarkets()

    console.log(`[API] [GET /api/markets] Markets received:`, marketsRaw)
    console.log(`[API] [GET /api/markets] Is array:`, Array.isArray(marketsRaw))
    console.log(`[API] [GET /api/markets] Is Map:`, marketsRaw instanceof Map)
    
    // Handle different response formats from genlayer-js
    let markets: unknown[] = []
    
    if (marketsRaw instanceof Map) {
      markets = Array.from(marketsRaw.values())
      console.log(`[API] [GET /api/markets] Converted Map to array:`, markets.length)
    } else if (Array.isArray(marketsRaw)) {
      markets = marketsRaw
    } else if (marketsRaw && typeof marketsRaw === 'object') {
      const obj = marketsRaw as Record<string, unknown>
      if (Array.isArray(obj.data)) {
        markets = obj.data
      } else if (Array.isArray(obj.result)) {
        markets = obj.result
      } else if (Array.isArray(obj.markets)) {
        markets = obj.markets
      }
    }
    
    console.log(`[API] [GET /api/markets] Processed markets:`, markets.length)
    
    if (!markets || markets.length === 0) {
      console.log(`[API] [GET /api/markets] No markets found, returning empty array`)
      return NextResponse.json({ success: true, data: [] })
    }

    // Format markets data
    console.log(`[API] [GET /api/markets] Formatting ${markets.length} markets...`)
    const formattedMarkets = markets.map((marketRaw: unknown, index: number) => {
        try {
          // Handle Map or object response from genlayer-js
          let marketData: Record<string, unknown> = {}
          if (marketRaw instanceof Map) {
            for (const [key, value] of marketRaw.entries()) {
              marketData[String(key)] = value
            }
          } else if (marketRaw && typeof marketRaw === 'object') {
            marketData = marketRaw as Record<string, unknown>
          } else {
            console.warn(`[API] [GET /api/markets] Unexpected market data format at index ${index}`)
            return null
          }
          
          // Check if market has error
          if (marketData.error) {
            console.warn(`[API] [GET /api/markets] Market has error:`, marketData.error)
            return null
          }

          // Convert price from wei to GEN (handle BigInt)
          const priceValue = marketData.price || marketData[4] || '0'
          const priceBigInt = typeof priceValue === 'bigint' ? priceValue : BigInt(priceValue.toString())
          const priceInGen = parseFloat(formatEther(priceBigInt))
          
          // Convert deadline from seconds to milliseconds (handle BigInt)
          const deadlineValue = marketData.deadline ?? marketData[3]
          const deadlineNum = deadlineValue !== undefined && deadlineValue !== null
            ? (typeof deadlineValue === 'bigint' ? Number(deadlineValue) : Number(deadlineValue))
            : null
          const deadlineMs = deadlineNum !== null ? deadlineNum * 1000 : null

          // Extract values (handle both named and indexed returns)
          const marketId = (marketData.market_id || '')?.toString() || ''
          const question = (marketData.question || marketData[0] || '')?.toString() || ''
          const category = (marketData.category || marketData[1] || '')?.toString() || ''
          const options = marketData.options || marketData[2] || []
          const creator = (marketData.creator || marketData[6] || '')?.toString() || ''
          
          // Extract image URL
          const rawImageUrl = marketData.image_url || 
                              marketData.images || 
                              marketData.imageUrl || 
                              marketData.image ||
                              marketData[5] || 
                              ''
          const imageUrl = rawImageUrl ? String(rawImageUrl) : ''
          
          const resolutionUrl = (marketData.resolution_url || '')?.toString() || ''
          const hasResolved = marketData.has_resolved || marketData[7] || false
          const result = (marketData.result || marketData[8] || '')?.toString() || ''

          // Extract creation timestamp if available
          const rawCreatedAt =
            marketData.created_at ??
            marketData.createdAt ??
            marketData.created ??
            marketData.timestamp ??
            marketData[9]
          let createdAtMs: number | null = null
          if (rawCreatedAt !== undefined && rawCreatedAt !== null) {
            const createdAtNum =
              typeof rawCreatedAt === 'bigint'
                ? Number(rawCreatedAt)
                : Number(rawCreatedAt)
            if (!Number.isNaN(createdAtNum) && createdAtNum > 0) {
              createdAtMs = createdAtNum > 1e12 ? createdAtNum : createdAtNum * 1000
            }
          }
          
          // Handle total_pool (bets)
          const totalPoolValue = marketData.total_pool || marketData.total_bets || '0'
          const totalPoolBigInt = typeof totalPoolValue === 'bigint' ? totalPoolValue : BigInt(totalPoolValue.toString())
          const totalPool = parseFloat(formatEther(totalPoolBigInt))
          
          // Process options array
          let optionsArray: string[] = []
          if (Array.isArray(options)) {
            optionsArray = options.map((opt: unknown) => 
              typeof opt === 'string' ? opt : opt?.toString() || ''
            )
          } else if (typeof options === 'string') {
            optionsArray = options.split(',').map(opt => opt.trim())
          }

          return {
            marketId: marketId,
            question: question,
            category: category,
            deadline: deadlineMs,
            deadlineFormatted: deadlineMs ? new Date(deadlineMs).toISOString() : null,
            options: optionsArray,
            rawOptions: optionsArray.join(','),
            price: priceInGen,
            imageUrl: imageUrl,
            creator: creator,
            resolved: hasResolved === true || hasResolved === 'true' || hasResolved === 1,
            result: result,
            resolutionUrl: resolutionUrl,
            totalPool: totalPool,
            createdAt: createdAtMs,
            createdAtFormatted: createdAtMs ? new Date(createdAtMs).toISOString() : null
          }
        } catch (err) {
          console.error(`[API] [GET /api/markets] Error formatting market at index ${index}:`, err)
          return null
        }
      })

    // Filter out null values
    const validMarkets = formattedMarkets.filter((market): market is NonNullable<typeof market> => market !== null)
    console.log(`[API] [GET /api/markets] Valid markets: ${validMarkets.length}/${formattedMarkets.length}`)

    const duration = Date.now() - startTime
    console.log(`[API] [GET /api/markets] Success in ${duration}ms, returning ${validMarkets.length} markets`)
    
    return NextResponse.json({ success: true, data: validMarkets })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`[API] [GET /api/markets] Error after ${duration}ms:`, err)
    if (err instanceof Error) {
      console.error(`[API] [GET /api/markets] Error message:`, err.message)
      console.error(`[API] [GET /api/markets] Error stack:`, err.stack)
    }
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch markets' 
      },
      { status: 500 }
    )
  }
}
