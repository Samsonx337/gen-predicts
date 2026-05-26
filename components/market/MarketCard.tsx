"use client";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { calculatePayoutsFromOdds, estimateTotalPool } from "@/lib/payouts";
import { useTheme } from "@/context/ThemeContext";
import { createBet, getBets, type Bet } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { useMarketsRefresh } from "@/context/MarketsRefreshContext";
import { useWalletBalance } from "@/context/WalletBalanceContext";

interface MarketCardProps {
  id: string;
  icon?: string; // Deprecated - use imageUrl instead
  iconAlt?: string; // Deprecated - use imageUrl instead
  imageUrl?: string; // Image URL or default category image
  question: string;
  participants: number;
  price: number; // Price per share in GEN
  noPercentage: number;
  yesPercentage: number;
  timeRemaining: string;
  deadline?: number | null;
  resolved?: boolean;
  result?: string;
  creator?: string;
  walletAddress?: string | null;
  options?: string[]; // Market options (e.g., ["Yes", "No"] or ["Good", "Bad"])
  // Balance props passed from parent
  balance: number | null;
  isLoading: boolean;
  isConnected: boolean;
  onResolved?: () => void;
}

export function MarketCard({
  id,
  icon,
  iconAlt,
  imageUrl,
  question,
  participants,
  price,
  noPercentage,
  yesPercentage,
  timeRemaining,
  deadline = null,
  resolved = false,
  result,
  creator,
  walletAddress,
  options = ["No", "Yes"], // Default to Yes/No if not provided
  balance,
  isLoading,
  isConnected,
  onResolved,
}: MarketCardProps) {
  // Get the actual option labels (first option = No/negative, second option = Yes/positive)
  const firstOption = options[0] || "No";
  const secondOption = options[1] || "Yes";
  // Use imageUrl if provided, otherwise fall back to icon (for backward compatibility)
  const displayImage = imageUrl || icon || "";
  const displayAlt = iconAlt || question;
  const [imageError, setImageError] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveSuccess, setResolveSuccess] = useState(false);
  const [showErrorInButton, setShowErrorInButton] = useState(false);
  const [userBet, setUserBet] = useState<Bet | null>(null);
  const [isLoadingBets, setIsLoadingBets] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { refreshMarkets, refreshTrigger } = useMarketsRefresh();
  const { refreshBalance } = useWalletBalance();
  
  // Determine which logo to use based on theme
  const logoPath = theme === "dark" ? "/genlayer_light.svg" : "/genlayer_dark.svg";
  
  // Determine what to display: image URL, category mark, or default
  const shouldShowImage = displayImage && 
    (displayImage.startsWith("/") || 
     displayImage.startsWith("http") || 
     displayImage.startsWith("data:image/")) &&
    !imageError;
  
  const fallbackMark = icon || "MK";
  // Calculate potential payouts based on current odds and market price
  const payouts = useMemo(() => {
    // Estimate total pool based on participants (average 1.5 GEN per participant)
    const estimatedPool = estimateTotalPool(participants, 1.5);
    // Calculate payouts if user bets the market price
    return calculatePayoutsFromOdds(
      yesPercentage,
      noPercentage,
      estimatedPool,
      price,
      0.02 // 2% market fee
    );
  }, [participants, yesPercentage, noPercentage, price]);

  // Check if user has enough balance to vote
  // Only check balance if wallet is connected and balance has been loaded
  const hasEnoughBalance = isConnected && balance !== null && balance >= price;
  const deadlinePassed =
    deadline === null || deadline === undefined ? true : deadline <= Date.now();
  const marketResolved = resolved;
  const isMarketOpen = !marketResolved && !deadlinePassed;
  const showInsufficientBalance =
    isMarketOpen && isConnected && balance !== null && !isLoading && balance < price;
  const hasPlacedBet = !!userBet;
  const disableBetButtons = !isMarketOpen || !hasEnoughBalance || isLoading || hasPlacedBet || isLoadingBets;
  const timeLabel = marketResolved ? "Resolved" : deadlinePassed ? "Ended" : timeRemaining;
  const isCreator =
    !!walletAddress &&
    !!creator &&
    walletAddress.toLowerCase() === creator.toLowerCase();
  const showResolveButton = !marketResolved && deadlinePassed && isCreator;

  // Fetch user's bet for this market
  useEffect(() => {
    const fetchUserBet = async () => {
      if (!walletAddress || !isConnected) {
        setUserBet(null);
        return;
      }

      // Don't refetch if we're currently placing a bet (optimistic update is in place)
      if (isPlacingBet) {
        return;
      }

      setIsLoadingBets(true);
      try {
        const response = await getBets(id);
        if (response.success && response.data) {
          // Filter bets for this user
          const userBetForMarket = response.data.find(
            (bet) =>
              bet.bettor.toLowerCase() === walletAddress.toLowerCase()
          );
          // Always update with fetched data (will replace optimistic bet with real data)
          setUserBet(userBetForMarket || null);
        }
      } catch (error) {
        console.error("Error fetching user bets:", error);
      } finally {
        setIsLoadingBets(false);
      }
    };

    fetchUserBet();
  }, [id, walletAddress, isConnected, refreshTrigger, isPlacingBet]); // Added refreshTrigger to refetch when markets refresh

  // Auto-clear error from button after 20 seconds
  useEffect(() => {
    if (resolveError && showErrorInButton) {
      const timer = setTimeout(() => {
        setShowErrorInButton(false);
        setResolveError(null);
      }, 20000); // 20 seconds

      return () => clearTimeout(timer);
    }
  }, [resolveError, showErrorInButton]);

  const handleResolveMarket = useCallback(async () => {
    if (!walletAddress) {
      return;
    }
    setIsResolving(true);
    setResolveError(null);
    setResolveSuccess(false);
    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketId: id,
          caller: walletAddress,
        }),
      });
      const data = await response.json();
      
      // Handle different response statuses
      if (response.status === 202) {
        // 202 Accepted - transaction submitted but pending consensus
        const errorMsg = "Market resolution is pending. Validators are reaching consensus. Please check again in a few moments.";
        setResolveError(errorMsg);
        setShowErrorInButton(true);
        // Refresh markets after a delay to check status
        setTimeout(() => {
          refreshMarkets();
        }, 5000);
        return;
      }
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to resolve market");
      }
      
      // Success - market was resolved
      setResolveSuccess(true);
      setResolveError(null);
      setShowErrorInButton(false);
      // Refresh markets to show updated status
      refreshMarkets();
      onResolved?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve market";
      setResolveError(message);
      setShowErrorInButton(true);
    } finally {
      setIsResolving(false);
    }
  }, [id, onResolved, walletAddress, refreshMarkets]);

  const handleBetClick = (option: string) => {
    if (!walletAddress || !isConnected) {
      return;
    }
    setSelectedOption(option);
    setBetError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmBet = useCallback(async () => {
    if (!walletAddress || !selectedOption) {
      return;
    }

    setIsPlacingBet(true);
    setBetError(null);

    // Optimistic UI update: Set userBet immediately to prevent multiple clicks
    const optimisticBet: Bet = {
      marketId: id,
      bettor: walletAddress,
      option: selectedOption,
      amount: "0", // Will be updated with actual amount after API call
      amountFormatted: price.toString(),
      amountInEther: price,
    };
    setUserBet(optimisticBet);
    setShowConfirmModal(false);
    setSelectedOption(null);

    try {
      const response = await createBet({
        marketId: id,
        bettor: walletAddress,
        option: selectedOption,
        amount: price.toString(), // Amount in GEN (as string), API will convert to wei
      });

      if (response.success) {
        // Refetch user bet to get the actual data from the contract
        try {
          const betsResponse = await getBets(id);
          if (betsResponse.success && betsResponse.data) {
            const userBetForMarket = betsResponse.data.find(
              (bet) =>
                bet.bettor.toLowerCase() === walletAddress.toLowerCase()
            );
            if (userBetForMarket) {
              // Update with actual bet data from contract
              setUserBet(userBetForMarket);
            } else {
              // If not found, keep optimistic bet (shouldn't happen, but fallback)
              setUserBet(optimisticBet);
            }
          }
        } catch (error) {
          console.error("Error refetching user bet:", error);
          // Keep optimistic bet on error
          setUserBet(optimisticBet);
        }
        
        // Trigger refresh of markets and bets to update participants count
        // Pass optimistic bet to context so list view can update immediately
        refreshMarkets(optimisticBet);
        // Refresh wallet balance after placing bet
        refreshBalance();
      } else {
        // If bet placement failed, clear the optimistic bet
        setUserBet(null);
        throw new Error(response.error || "Failed to place bet");
      }
    } catch (error) {
      // If bet placement failed, clear the optimistic bet
      setUserBet(null);
      const message =
        error instanceof Error ? error.message : "Failed to place bet";
      setBetError(message);
      // Reopen modal to show error
      setShowConfirmModal(true);
      setSelectedOption(selectedOption);
    } finally {
      setIsPlacingBet(false);
    }
  }, [id, walletAddress, selectedOption, price, refreshMarkets]);

  const handleCancelBet = () => {
    setShowConfirmModal(false);
    setSelectedOption(null);
    setBetError(null);
  };

  // Show insufficient balance message only when connected, balance loaded, and insufficient
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-brand-500/50 transition-all duration-200 flex flex-col">
      {/* Top Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z"
              fill="currentColor"
            />
            <path
              d="M8 9.5C5.23858 9.5 0 11.1193 0 13.75V16H16V13.75C16 11.1193 10.7614 9.5 8 9.5Z"
              fill="currentColor"
            />
          </svg>
          <span>{participants.toLocaleString()}</span>
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center">
          {shouldShowImage ? (
            <Image
              src={displayImage}
              alt={displayAlt}
              width={64}
              height={64}
              className="w-full h-full object-cover rounded-full"
              onError={() => {
                setImageError(true);
              }}
              unoptimized={displayImage.startsWith("data:image/")}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-900 dark:text-white">
              {fallbackMark}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-brand-500 text-sm font-medium">
          <Image
            src={logoPath}
            alt="GEN token"
            width={16}
            height={16}
            className="w-4 h-4 object-contain"
          />
          <span>{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Progress Bar & Timer */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 text-xs text-gray-600 dark:text-white/60">
          <span className="text-red-600 dark:text-red-400">{firstOption.toUpperCase()} {noPercentage}%</span>
          <span className="text-gray-900 dark:text-white/80 font-medium">{timeLabel}</span>
          <span className="text-green-600 dark:text-green-400">{secondOption.toUpperCase()} {yesPercentage}%</span>
        </div>
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-red-500"
            style={{ width: `${noPercentage}%` }}
          />
          <div
            className="absolute right-0 top-0 h-full bg-green-500"
            style={{ width: `${yesPercentage}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h3 className="text-gray-900 dark:text-white font-medium mb-4 line-clamp-2 min-h-12">
        {question}
      </h3>

      {/* Payouts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-white/60 mb-1">If No Wins</p>
          <div className="flex items-center gap-1 text-brand-500 font-semibold">
            <Image
              src={logoPath}
              alt="GEN token"
              width={12}
              height={12}
              className="w-3 h-3 object-contain"
            />
            <span>+{payouts.noPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-white/60 mb-1">If Yes Wins</p>
          <div className="flex items-center gap-1 text-brand-500 font-semibold">
            <Image
              src={logoPath}
              alt="GEN token"
              width={12}
              height={12}
              className="w-3 h-3 object-contain"
            />
            <span>+{payouts.yesPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto">
      {marketResolved ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 px-4 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 text-sm font-semibold min-h-[48px] flex flex-col gap-1 items-center justify-center">
            <span>Market resolved</span>
            {result && (
              <span className="text-xs text-green-700 dark:text-green-200 font-medium">
                Outcome: {result}
              </span>
            )}
          </div>
        </div>
      ) : showResolveButton ? (
        <div className="relative w-full rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 flex items-center justify-between gap-2 min-h-[48px]">
          {showErrorInButton && resolveError ? (
            <>
              <p className="text-xs text-red-700 dark:text-red-300 font-semibold leading-tight flex-1 truncate">
                Validators disagreed, try again later
              </p>
              <button
                onClick={() => {
                  setShowErrorInButton(false);
                  setResolveError(null);
                }}
                className="shrink-0 px-2 py-1 rounded text-[10px] font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                title="Dismiss error"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-blue-800 dark:text-blue-200 font-semibold leading-tight flex-1 text-left whitespace-normal">
                Deadline passed. Resolve the market
              </p>
              <button
                onClick={handleResolveMarket}
                disabled={isResolving}
                className={`shrink-0 px-3 py-2 rounded-md font-semibold text-xs transition-colors border whitespace-nowrap ${
                  isResolving
                    ? "bg-blue-100 dark:bg-blue-800/40 text-blue-300 dark:text-blue-500 border-blue-200 dark:border-blue-700 cursor-wait"
                    : "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 dark:border-blue-400"
                }`}
              >
                {isResolving ? "Resolving..." : "Resolve"}
              </button>
            </>
          )}
          {resolveSuccess && !showErrorInButton && (
            <div className="absolute -bottom-5 left-0 right-0 text-[10px] leading-tight px-3">
              <p className="text-green-600 dark:text-green-400 truncate">Market resolved successfully!</p>
            </div>
          )}
        </div>
      ) : !isMarketOpen ? (
        <div className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold flex items-center justify-center whitespace-nowrap">
          Market closed. Awaiting creator resolution.
        </div>
      ) : showInsufficientBalance ? (
        <div className="w-full px-4 py-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 flex items-center justify-center gap-2 min-h-[48px]">
          <svg
            className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 self-center"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex flex-col items-start justify-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold leading-tight">
              Not enough balance
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-tight">
              Need {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GEN
            </p>
          </div>
        </div>
      ) : hasPlacedBet ? (
        <div className="w-full px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 flex items-center justify-center gap-2 h-[48px]">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex flex-col items-center justify-center">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold leading-tight text-center">
              Bet placed: {userBet.option}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-tight text-center">
              Amount: {userBet.amountFormatted} GEN
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleBetClick(firstOption)}
            disabled={disableBetButtons}
            className={`px-4 py-3 rounded-lg font-semibold transition-colors border h-[48px] flex items-center justify-center ${
              !disableBetButtons
                ? "bg-red-50 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-gray-600 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 cursor-pointer"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed"
            }`}
          >
            {firstOption.toUpperCase()}
          </button>
          <button
            onClick={() => handleBetClick(secondOption)}
            disabled={disableBetButtons}
            className={`px-4 py-3 rounded-lg font-semibold transition-colors border h-[48px] flex items-center justify-center ${
              !disableBetButtons
                ? "bg-green-50 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-gray-600 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50 cursor-pointer"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed"
            }`}
          >
            {secondOption.toUpperCase()}
          </button>
        </div>
      )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={handleCancelBet}
        className="max-w-md"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Confirm Your Bet
          </h2>
          
          <div className="mb-6 space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    Important: Bet is Immutable
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Once you place this bet, it cannot be changed or canceled. Make sure you&apos;re confident in your prediction.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Market:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{question}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Your Choice:</span>
                <span className={`text-sm font-semibold ${
                  selectedOption === secondOption
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {selectedOption?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Bet Amount:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GEN
                </span>
              </div>
            </div>
          </div>

          {betError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{betError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCancelBet}
              disabled={isPlacingBet}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBet}
              disabled={isPlacingBet}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedOption === secondOption
                  ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              }`}
            >
              {isPlacingBet ? "Placing Bet..." : "Confirm Bet"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

