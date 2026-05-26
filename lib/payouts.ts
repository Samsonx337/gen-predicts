// Utility functions for calculating prediction market payouts

/**
 * Calculates potential payouts for a prediction market using parimutuel system
 * @param totalYesBets - Total amount bet on YES (in GEN)
 * @param totalNoBets - Total amount bet on NO (in GEN)
 * @param yourBetAmount - Amount you're betting (in GEN)
 * @param marketFee - Market fee percentage (default 2%, e.g., 0.02)
 * @returns Object with yesPayout and noPayout in GEN
 */
export function calculatePayouts(
  totalYesBets: number,
  totalNoBets: number,
  yourBetAmount: number,
  marketFee: number = 0.02
): { yesPayout: number; noPayout: number } {
  const totalPool = totalYesBets + totalNoBets;

  // If no bets yet, return default payouts (1:1 odds)
  if (totalPool === 0) {
    return {
      yesPayout: yourBetAmount * (1 - marketFee),
      noPayout: yourBetAmount * (1 - marketFee),
    };
  }

  // Calculate payout per GEN bet for each outcome
  // Formula: (Total Pool / Total bets on that outcome) * (1 - fee)
  const yesPayoutPerGen = totalYesBets > 0 
    ? (totalPool / totalYesBets) * (1 - marketFee)
    : 0;
  
  const noPayoutPerGen = totalNoBets > 0
    ? (totalPool / totalNoBets) * (1 - marketFee)
    : 0;

  // Calculate your potential winnings
  const yesPayout = yesPayoutPerGen * yourBetAmount;
  const noPayout = noPayoutPerGen * yourBetAmount;

  return {
    yesPayout: Math.round(yesPayout * 100) / 100, // Round to 2 decimal places
    noPayout: Math.round(noPayout * 100) / 100,
  };
}

/**
 * Calculates potential payouts based on current odds percentages
 * This is a simplified version that uses percentages instead of actual bet amounts
 * @param yesPercentage - Current YES percentage (0-100)
 * @param noPercentage - Current NO percentage (0-100)
 * @param totalPool - Total pool size (estimated or actual)
 * @param yourBetAmount - Amount you're betting (in GEN)
 * @param marketFee - Market fee percentage (default 2%)
 * @returns Object with yesPayout and noPayout in GEN
 */
export function calculatePayoutsFromOdds(
  yesPercentage: number,
  noPercentage: number,
  totalPool: number,
  yourBetAmount: number,
  marketFee: number = 0.02
): { yesPayout: number; noPayout: number } {
  // Convert percentages to bet amounts
  const totalYesBets = (yesPercentage / 100) * totalPool;
  const totalNoBets = (noPercentage / 100) * totalPool;

  return calculatePayouts(totalYesBets, totalNoBets, yourBetAmount, marketFee);
}

/**
 * Estimates total pool size based on participants and average bet
 * This is a helper function when actual pool data isn't available
 * @param participants - Number of participants
 * @param averageBetPerParticipant - Average bet per participant (default 1.5 GEN)
 * @returns Estimated total pool size
 */
export function estimateTotalPool(
  participants: number,
  averageBetPerParticipant: number = 1.5
): number {
  return participants * averageBetPerParticipant;
}

