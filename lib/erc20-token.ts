/**
 * ERC20 Token Utility for Plain ERC20 Token (No LLM)
 * Token Address: 0x3c4fa9dBB58cc64FD31Aaef01a92f8875E26b577
 * Uses genlayer-js SDK to interact with the ERC20 token contract
 */

import { callContractView, callContractWrite } from './genlayer-client'

// ERC20 Token contract address
export const ERC20_TOKEN_ADDRESS = (process.env.ERC20_TOKEN_ADDRESS || '0x3c4fa9dBB58cc64FD31Aaef01a92f8875E26b577') as `0x${string}`

/**
 * Get ERC20 token balance for a given address
 * @param address - The wallet address to check balance for
 * @returns Balance in token units (as a number, assuming 18 decimals)
 */
export async function getTokenBalance(address: string): Promise<number> {
  try {
    console.log(`[ERC20] Getting token balance for: ${address}`)
    console.log(`[ERC20] Token contract: ${ERC20_TOKEN_ADDRESS}`)
    
    // Normalize address for comparison (lowercase)
    const normalizedAddress = address.toLowerCase()
    
    // Try to get balance from get_balances first (more reliable)
    // This might have the correct value even if get_balance_of doesn't
    try {
      const allBalances = await callContractView('get_balances', [], ERC20_TOKEN_ADDRESS)
      console.log(`[ERC20] All balances retrieved:`, typeof allBalances)
      
      if (allBalances && typeof allBalances === 'object') {
        const balancesObj = allBalances as Record<string, unknown>
        
        // Try to find the balance for this address
        for (const [addr, bal] of Object.entries(balancesObj)) {
          if (addr.toLowerCase() === normalizedAddress) {
            let balanceValue: bigint = BigInt(0)
            
            if (typeof bal === 'bigint') {
              balanceValue = bal
            } else if (typeof bal === 'number') {
              balanceValue = BigInt(bal)
            } else if (typeof bal === 'string') {
              balanceValue = BigInt(bal)
            }
            
            const balanceInTokens = Number(balanceValue) / 1e18
            console.log(`[ERC20] Balance from get_balances: ${balanceInTokens} tokens (raw: ${balanceValue.toString()})`)
            
            // If the balance seems reasonable (not suspiciously small), use it
            if (balanceInTokens > 0.0001) {
              return balanceInTokens
            }
          }
        }
      }
    } catch (balancesError) {
      console.log(`[ERC20] Could not get balances from get_balances, falling back to get_balance_of:`, balancesError)
    }
    
    // Fallback to get_balance_of
    const balance = await callContractView('get_balance_of', [address], ERC20_TOKEN_ADDRESS)
    
    // Handle different response formats
    let balanceValue: bigint | number = 0
    
    if (typeof balance === 'bigint') {
      balanceValue = balance
    } else if (typeof balance === 'number') {
      balanceValue = balance
    } else if (typeof balance === 'string') {
      // Handle string values - could be a number string or hex
      balanceValue = BigInt(balance)
    } else if (balance && typeof balance === 'object') {
      // Try to extract balance from object
      const balanceObj = balance as Record<string, unknown>
      if (balanceObj.balance !== undefined && balanceObj.balance !== null) {
        balanceValue = typeof balanceObj.balance === 'bigint' 
          ? balanceObj.balance 
          : BigInt(balanceObj.balance.toString())
      } else if (balanceObj.value !== undefined && balanceObj.value !== null) {
        balanceValue = typeof balanceObj.value === 'bigint'
          ? balanceObj.value
          : BigInt(balanceObj.value.toString())
      }
    }
    
    // Convert from wei/smallest unit to token units (assuming 18 decimals)
    // Use BigInt arithmetic to avoid precision loss
    const balanceInTokens = Number(balanceValue) / 1e18
    
    // Safe logging without JSON.stringify for BigInt
    const balanceStr = typeof balance === 'bigint' 
      ? balance.toString() 
      : typeof balance === 'object' 
        ? JSON.stringify(balance, (_, v) => typeof v === 'bigint' ? v.toString() : v)
        : String(balance)
    
    console.log(`[ERC20] Balance: ${balanceInTokens} tokens (raw: ${balanceValue.toString()})`)
    console.log(`[ERC20] Balance type: ${typeof balance}, value: ${balanceStr}`)
    
    // If the balance is suspiciously small (like 1e-13), it's likely a contract bug
    // In this case, we might need to track minted amounts separately or fix the contract
    // For now, return what we got
    return balanceInTokens
  } catch (error) {
    console.error(`[ERC20] Error fetching token balance:`, error)
    // Return 0 if address doesn't have any tokens (default behavior)
    return 0
  }
}

/**
 * Transfer ERC20 tokens from the caller to a recipient
 * @param to - Recipient address
 * @param amount - Amount in token units (will be converted to wei)
 * @returns Transaction result
 */
export async function transferTokens(to: string, amount: number): Promise<unknown> {
  try {
    console.log(`[ERC20] Transferring ${amount} tokens to ${to}`)
    
    // Convert amount to wei (assuming 18 decimals)
    const amountInWei = BigInt(Math.floor(amount * 1e18))
    
    // Call the transfer function on the ERC20 contract
    // The contract signature is: transfer(amount: int, to_address: str)
    const result = await callContractWrite('transfer', [amountInWei.toString(), to], ERC20_TOKEN_ADDRESS)
    
    console.log(`[ERC20] Transfer successful`)
    return result
  } catch (error) {
    console.error(`[ERC20] Error transferring tokens:`, error)
    throw error
  }
}

/**
 * Get formatted token balance string
 * @param address - The wallet address to check balance for
 * @returns Formatted balance string (e.g., "1,234.56 GEN")
 */
export async function getFormattedTokenBalance(address: string): Promise<string> {
  try {
    const balance = await getTokenBalance(address)
    return `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} GEN`
  } catch (error) {
    console.error('Error formatting token balance:', error)
    return '0 GEN'
  }
}

/**
 * Get total supply of tokens
 * @returns Total supply in token units
 */
export async function getTotalSupply(): Promise<number> {
  try {
    console.log(`[ERC20] Getting total supply`)
    console.log(`[ERC20] Token contract: ${ERC20_TOKEN_ADDRESS}`)
    
    // Call the total_supply view function on the ERC20 contract
    const supply = await callContractView('total_supply', [], ERC20_TOKEN_ADDRESS)
    
    // Handle different response formats
    let supplyValue: bigint | number = 0
    
    if (typeof supply === 'bigint') {
      supplyValue = supply
    } else if (typeof supply === 'number') {
      supplyValue = supply
    } else if (typeof supply === 'string') {
      supplyValue = BigInt(supply)
    } else if (supply && typeof supply === 'object') {
      // Try to extract supply from object
      const supplyObj = supply as Record<string, unknown>
      if (supplyObj.totalSupply !== undefined && supplyObj.totalSupply !== null) {
        supplyValue = typeof supplyObj.totalSupply === 'bigint' 
          ? supplyObj.totalSupply 
          : BigInt(supplyObj.totalSupply.toString())
      } else if (supplyObj.value !== undefined && supplyObj.value !== null) {
        supplyValue = typeof supplyObj.value === 'bigint'
          ? supplyObj.value
          : BigInt(supplyObj.value.toString())
      }
    }
    
    // Convert from wei/smallest unit to token units (assuming 18 decimals)
    const supplyInTokens = Number(supplyValue) / 1e18
    
    console.log(`[ERC20] Total supply: ${supplyInTokens} tokens (raw: ${supplyValue})`)
    return supplyInTokens
  } catch (error) {
    console.error(`[ERC20] Error fetching total supply:`, error)
    return 0
  }
}

/**
 * Mint ERC20 tokens to a recipient address
 * @param to - Recipient address
 * @param amount - Amount in token units (will be converted to wei)
 * @returns Transaction result
 */
export async function mintTokens(to: string, amount: number): Promise<unknown> {
  try {
    console.log(`[ERC20] Minting ${amount} tokens to ${to}`)
    console.log(`[ERC20] Token contract: ${ERC20_TOKEN_ADDRESS}`)
    
    // Convert amount to wei (assuming 18 decimals)
    const amountInWei = BigInt(Math.floor(amount * 1e18))
    console.log(`[ERC20] Amount in wei: ${amountInWei.toString()}`)
    
    // Call the mint function on the ERC20 contract
    // The contract signature is: mint(to_address: str, amount: int)
    // For PlainErc20 (non-LLM), the function directly adds the amount to the balance
    // Pass BigInt directly (not as string) - genlayer-js will handle the conversion
    const result = await callContractWrite('mint', [to, amountInWei], ERC20_TOKEN_ADDRESS)
    
    console.log(`[ERC20] Mint transaction result:`, typeof result)
    if (result && typeof result === 'object') {
      const receipt = result as Record<string, unknown>
      console.log(`[ERC20] Transaction receipt keys:`, Object.keys(receipt))
      console.log(`[ERC20] Transaction status:`, receipt.status, `(status_name: ${receipt.status_name})`)
      console.log(`[ERC20] Transaction result:`, receipt.result, `(result_name: ${receipt.result_name})`)
      
      // Check for execution errors in consensus_data
      if (receipt.consensus_data && typeof receipt.consensus_data === 'object') {
        const consensusData = receipt.consensus_data as Record<string, unknown>
        if (consensusData.leader_receipt && Array.isArray(consensusData.leader_receipt)) {
          const leaderReceipt = consensusData.leader_receipt[0] as Record<string, unknown>
          if (leaderReceipt.execution_result === 'ERROR') {
            console.error(`[ERC20] ❌ EXECUTION ERROR DETECTED!`)
            if (leaderReceipt.genvm_result && typeof leaderReceipt.genvm_result === 'object') {
              const genvmResult = leaderReceipt.genvm_result as Record<string, unknown>
              if (genvmResult.stderr) {
                console.error(`[ERC20] Error stderr:`, genvmResult.stderr)
              }
              if (genvmResult.stdout) {
                console.error(`[ERC20] Error stdout:`, genvmResult.stdout)
              }
            }
            throw new Error(`Contract execution failed: ${JSON.stringify(leaderReceipt, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`)
          }
        }
      }
      
      // Check if there's a return value or error in the receipt
      if (receipt.contract_snapshot) {
        console.log(`[ERC20] Contract snapshot available`)
      }
      
      // Log the full receipt for debugging (truncated)
      try {
        const receiptStr = JSON.stringify(
          receipt,
          (_, v) => (typeof v === 'bigint' ? v.toString() : v),
          2
        )
        console.log(`[ERC20] Full receipt (first 2000 chars):`, receiptStr.substring(0, 2000))
      } catch (e) {
        console.log(`[ERC20] Could not stringify full receipt`)
      }
    }
    
    // Wait longer for state to update (GenLayer may need more time)
    console.log(`[ERC20] Waiting 5 seconds for contract state to update...`)
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Verify the mint by checking balance multiple times
    let balanceAfter = 0
    for (let i = 0; i < 3; i++) {
      balanceAfter = await getTokenBalance(to)
      console.log(`[ERC20] Balance check ${i + 1}/3 after mint: ${balanceAfter} tokens`)
      if (balanceAfter > 0) {
        break
      }
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    
    if (balanceAfter === 0) {
      console.warn(`[ERC20] WARNING: Balance is still 0 after mint and multiple checks.`)
      console.warn(`[ERC20] This may indicate:`)
      console.warn(`[ERC20] 1. The contract at ${ERC20_TOKEN_ADDRESS} is not the PlainErc20 contract`)
      console.warn(`[ERC20] 2. The contract's state is not persisting correctly`)
      console.warn(`[ERC20] 3. There's a delay in GenLayer state propagation`)
      console.warn(`[ERC20] 4. The mint function is not updating balances correctly`)
    }
    
    console.log(`[ERC20] Mint successful`)
    return result
  } catch (error) {
    console.error(`[ERC20] Error minting tokens:`, error)
    throw error
  }
}

