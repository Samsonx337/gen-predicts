"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { MarketCard } from "./MarketCard";
import { useWalletBalance } from "@/context/WalletBalanceContext";
import { getMarkets, getBets, createBet, type Market, type Bet } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { getCategoryEmoji } from "@/lib/category-images";
import { useMarketsRefresh } from "@/context/MarketsRefreshContext";
import { LoaderFour } from "@/components/ui/loader";
import { useSearchParams } from "next/navigation";

// Component for handling image display with error fallback in list view
function MarketListImage({ src, alt, fallbackEmoji }: { src: string; alt: string; fallbackEmoji: string }) {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    return (
      <span className="text-2xl font-bold text-gray-900 dark:text-white">
        {fallbackEmoji || "MK"}
      </span>
    );
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      className="w-full h-full object-cover rounded-full"
      onError={() => {
        setImageError(true);
      }}
      unoptimized={src.startsWith("data:image/")}
    />
  );
}

// Helper function to format time remaining from deadline timestamp
function formatTimeRemaining(deadline: number | null): string {
  if (deadline === null || deadline === undefined) return "Ended";
  
  const now = Date.now();
  const remaining = deadline - now;
  
  if (remaining <= 0) return "Ended";
  
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  return `${days}d:${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m`;
}

// Extended market type with calculated stats
interface MarketWithStats extends Market {
  participants: number;
  yesPercentage: number;
  noPercentage: number;
  timeRemaining: string;
  createdAt: number;
}

export function MarketsGrid() {
  const searchParams = useSearchParams();
  const highlightMarketId = searchParams.get("highlight");
  const [activeTab, setActiveTab] = useState("trending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFilter, setSelectedFilter] = useState("all-markets");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(undefined);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const highlightedCardRef = useRef<HTMLDivElement>(null);
  
  // Update dropdown width when filter button is available
  useEffect(() => {
    if (isFilterOpen && filterButtonRef.current) {
      setDropdownWidth(filterButtonRef.current.offsetWidth);
    }
  }, [isFilterOpen, selectedFilter]);
  const { balance, isLoading, isConnected, address, refreshBalance } = useWalletBalance();
  const { theme } = useTheme();
  
  // Determine which logo to use based on theme
  const logoPath = theme === "dark" ? "/genlayer_light.svg" : "/genlayer_dark.svg";
  
  // State for markets and bets
  const [markets, setMarkets] = useState<Market[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingMarketId, setResolvingMarketId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [showErrorInButton, setShowErrorInButton] = useState<string | null>(null); // Track which market is showing error in button

  // Auto-clear error from button after 20 seconds
  useEffect(() => {
    if (resolveError && showErrorInButton) {
      const timer = setTimeout(() => {
        setShowErrorInButton(null);
        setResolveError(null);
      }, 20000); // 20 seconds

      return () => clearTimeout(timer);
    }
  }, [resolveError, showErrorInButton]);
  const [placingBetMarketId, setPlacingBetMarketId] = useState<string | null>(null);
  const [placingBetOption, setPlacingBetOption] = useState<string | null>(null);
  // Get refresh trigger and optimistic bets from context
  const { refreshTrigger, refreshMarkets, optimisticBets: contextOptimisticBets, optimisticBetsVersion, clearOptimisticBet } = useMarketsRefresh();
  
  // Handle bet placement in list view
  const handleListBetClick = async (marketId: string, option: string) => {
    if (!address || !isConnected) {
      return;
    }
    
    setPlacingBetMarketId(marketId);
    setPlacingBetOption(option);
    
    try {
      const market = markets.find(m => m.marketId === marketId);
      if (!market) {
        console.error("Market not found");
        return;
      }
      
      const response = await createBet({
        marketId,
        bettor: address,
        option,
        amount: market.price.toString(),
      });
      
      if (response.success) {
        refreshMarkets();
        refreshBalance();
      } else {
        console.error("Failed to place bet:", response.error);
      }
    } catch (error) {
      console.error("Error placing bet:", error);
    } finally {
      setPlacingBetMarketId(null);
      setPlacingBetOption(null);
    }
  };

  // Immediately merge optimistic bets into bets array when they're added
  useEffect(() => {
    if (contextOptimisticBets.size > 0 && address) {
      setBets(prevBets => {
        const betsMap = new Map<string, Bet>();
        
        // Add existing bets
        prevBets.forEach(bet => {
          const key = `${bet.marketId}-${bet.bettor.toLowerCase()}`;
          betsMap.set(key, bet);
        });
        
        // Add optimistic bets that aren't already in the array
        contextOptimisticBets.forEach((optimisticBet, key) => {
          if (!betsMap.has(key)) {
            betsMap.set(key, optimisticBet);
          }
        });
        
        return Array.from(betsMap.values());
      });
    }
  }, [optimisticBetsVersion, address, contextOptimisticBets]);

  // Fetch markets and bets on mount and when refreshTrigger changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingMarkets(true);
        setError(null);
        
        const [marketsResponse, betsResponse] = await Promise.all([
          getMarkets(),
          getBets(),
        ]);
        
        if (marketsResponse.success && marketsResponse.data) {
          setMarkets(marketsResponse.data);
        }
        
        if (betsResponse.success && betsResponse.data) {
          // Merge real bets with optimistic bets (real bets take precedence)
          const realBetsMap = new Map<string, Bet>();
          betsResponse.data.forEach((bet) => {
            const key = `${bet.marketId}-${bet.bettor.toLowerCase()}`;
            realBetsMap.set(key, bet);
            
            // Clear optimistic bet if real bet is found
            if (contextOptimisticBets.has(key)) {
              clearOptimisticBet(bet.marketId, bet.bettor);
            }
          });
          
          // Add optimistic bets from context that aren't in real data yet
          contextOptimisticBets.forEach((optimisticBet, key) => {
            if (!realBetsMap.has(key)) {
              realBetsMap.set(key, optimisticBet);
            }
          });
          
          setBets(Array.from(realBetsMap.values()));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load markets');
      } finally {
        setIsLoadingMarkets(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger, clearOptimisticBet]); // Re-fetch when refreshTrigger changes

  const tabs = [
    { id: "trending", label: "Trending", icon: null },
    { id: "ending-soon", label: "Ending Soon", icon: null },
    { id: "high-value", label: "High Value", icon: null },
    { id: "newest", label: "Newest", icon: null },
  ];

  const filterOptions = [
    { id: "all-markets", label: "All Markets", icon: null },
    { id: "crypto", label: "Crypto", icon: null },
    { id: "sports", label: "Sports", icon: null },
    { id: "gaming", label: "Gaming", icon: null },
    { id: "politics", label: "Politics", icon: null },
    { id: "technology", label: "Technology", icon: null },
    { id: "finance", label: "Finance", icon: null },
    { id: "other", label: "Other", icon: null },
  ];

  const selectedFilterOption = filterOptions.find(
    (opt) => opt.id === selectedFilter
  ) || filterOptions[0];

  // Calculate market stats from bets
  const marketsWithStats = useMemo((): MarketWithStats[] => {
    return markets.map((market) => {
      // Filter bets for this market
      const marketBets = bets.filter((bet) => bet.marketId === market.marketId);
      
      // Calculate participants (unique bettors)
      const uniqueBettors = new Set(marketBets.map((bet) => bet.bettor));
      const participants = uniqueBettors.size;
      
      // Calculate percentages based on bet amounts using actual market options
      // First option (index 0) = negative/red, Second option (index 1) = positive/green
      const firstOption = market.options[0] || "No";
      const secondOption = market.options[1] || "Yes";
      
      let totalFirstAmount = 0;
      let totalSecondAmount = 0;
      
      marketBets.forEach((bet) => {
        const amount = bet.amountInEther || 0;
        // Compare case-insensitively
        if (bet.option.toLowerCase() === firstOption.toLowerCase()) {
          totalFirstAmount += amount;
        } else if (bet.option.toLowerCase() === secondOption.toLowerCase()) {
          totalSecondAmount += amount;
        }
      });
      
      const totalAmount = totalFirstAmount + totalSecondAmount;
      const yesPercentage = totalAmount > 0 ? Math.round((totalSecondAmount / totalAmount) * 100) : 50;
      const noPercentage = totalAmount > 0 ? Math.round((totalFirstAmount / totalAmount) * 100) : 50;
      
      // Format time remaining
      const timeRemaining = formatTimeRemaining(market.deadline);
      const normalizedCreatedAt =
        (typeof market.createdAt === "number" && market.createdAt > 0
          ? market.createdAt
          : null) ??
        market.deadline ??
        Date.now();
      
      return {
        ...market,
        participants,
        yesPercentage,
        noPercentage,
        timeRemaining,
        createdAt: normalizedCreatedAt,
      };
    });
  }, [markets, bets]);
  
  // Filter and sort markets based on activeTab, selectedFilter, and searchQuery
  const sortedMarkets = useMemo(() => {
    let filteredMarkets = [...marketsWithStats];
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredMarkets = filteredMarkets.filter((market) => {
        const questionMatch = market.question.toLowerCase().includes(query);
        const categoryMatch = market.category?.toLowerCase().includes(query);
        const marketIdMatch = market.marketId.toLowerCase().includes(query);
        return questionMatch || categoryMatch || marketIdMatch;
      });
    }
    
    // Apply category filter
    if (selectedFilter !== "all-markets") {
      // Map filter IDs to category names (case-insensitive)
      const categoryMap: Record<string, string> = {
        "crypto": "Crypto",
        "sports": "Sports",
        "gaming": "Gaming",
        "politics": "Politics",
        "technology": "Technology",
        "finance": "Finance",
        "other": "Other",
      };
      
      const selectedCategory = categoryMap[selectedFilter];
      if (selectedCategory) {
        filteredMarkets = filteredMarkets.filter(
          (market) => market.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
    }
    
    // Apply sorting based on activeTab
    switch (activeTab) {
      case "trending":
        // Sort by highest participants
        return filteredMarkets.sort((a, b) => b.participants - a.participants);
      
      case "ending-soon":
        // Show only active markets with upcoming deadlines, sorted by closest deadline
        return filteredMarkets
          .filter((market) => {
            const deadline = market.deadline;
            if (deadline === null || deadline === undefined) {
              return false;
            }
            return deadline > Date.now() && !market.resolved;
          })
          .sort((a, b) => {
            const deadlineA = a.deadline ?? Infinity;
            const deadlineB = b.deadline ?? Infinity;
            return deadlineA - deadlineB;
          });
      
      case "newest":
        // Sort by most recent creation timestamp
        return filteredMarkets.sort(
          (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
        );
      
      case "high-value":
        // Sort by highest price
        return filteredMarkets.sort((a, b) => b.price - a.price);
      
      default:
        return filteredMarkets;
    }
  }, [marketsWithStats, activeTab, selectedFilter, searchQuery]);

  // Scroll to highlighted market when it's available
  useEffect(() => {
    if (highlightMarketId && !isLoadingMarkets && sortedMarkets.length > 0) {
      // Wait for DOM to render
      const timer = setTimeout(() => {
        if (highlightedCardRef.current) {
          highlightedCardRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          // Add a highlight effect
          highlightedCardRef.current.classList.add("ring-4", "ring-brand-500", "ring-opacity-50");
          setTimeout(() => {
            highlightedCardRef.current?.classList.remove("ring-4", "ring-brand-500", "ring-opacity-50");
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightMarketId, isLoadingMarkets, sortedMarkets.length]);

  return (
    <div id="markets-list">
      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {tab.icon && <span className="mr-1">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 w-48 text-sm"
            />
          </div>
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              ref={filterButtonRef}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`dropdown-toggle flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 transition-colors ${
                isFilterOpen
                  ? "border-yellow-400 dark:border-yellow-500"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              {selectedFilterOption.icon && <span>{selectedFilterOption.icon}</span>}
              <span className="text-sm font-medium">{selectedFilterOption.label}</span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  isFilterOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <Dropdown
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              className="left-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
              style={dropdownWidth ? { 
                width: `${dropdownWidth}px`,
                minWidth: '200px'
              } : { minWidth: '200px' }}
            >
              {filterOptions.map((option) => (
                <DropdownItem
                  key={option.id}
                  onClick={() => {
                    setSelectedFilter(option.id);
                    setIsFilterOpen(false);
                  }}
                  baseClassName={`flex items-center gap-3 px-4 py-3 text-sm transition-colors w-full ${
                    selectedFilter === option.id
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {option.icon && <span>{option.icon}</span>}
                  <span>{option.label}</span>
                </DropdownItem>
              ))}
            </Dropdown>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-brand-500 text-white border-2 border-brand-500"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <rect x="11" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <rect x="3" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <rect x="11" y="11" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-brand-500 text-white border-2 border-brand-500"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="3" y1="4" x2="17" y2="4" stroke="currentColor" strokeWidth="1.5" />
                <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" />
                <line x1="3" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingMarkets && (
        <div className="flex items-center justify-center py-12">
          <LoaderFour text="Loading markets..." />
        </div>
      )}
      
      {/* Error State */}
      {error && !isLoadingMarkets && (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500 dark:text-red-400">Error: {error}</div>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoadingMarkets && !error && sortedMarkets.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">No markets found. Create one to get started!</div>
        </div>
      )}
      
      {/* Market Cards Grid or List View */}
      {!isLoadingMarkets && !error && sortedMarkets.length > 0 && (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedMarkets.map((market) => {
              // Determine image to display: use imageUrl if valid, otherwise use category mark.
              const categoryEmoji = getCategoryEmoji(market.category);
              const displayImageUrl = market.imageUrl && market.imageUrl.trim() !== "" 
                ? market.imageUrl 
                : undefined;
              const isHighlighted = highlightMarketId === market.marketId;
              
              return (
                <div
                  key={market.marketId}
                  ref={isHighlighted ? highlightedCardRef : null}
                >
                  <MarketCard
                    id={market.marketId}
                    icon={categoryEmoji}
                    iconAlt={market.category}
                    imageUrl={displayImageUrl}
                    question={market.question}
                    participants={market.participants}
                    price={market.price}
                    noPercentage={market.noPercentage}
                    yesPercentage={market.yesPercentage}
                    timeRemaining={market.timeRemaining}
                    balance={balance}
                    isLoading={isLoading}
                    isConnected={isConnected}
                    deadline={market.deadline}
                    resolved={Boolean(market.resolved)}
                    creator={market.creator}
                    walletAddress={address}
                    onResolved={refreshMarkets}
                    result={market.result}
                    options={market.options}
                  />
                </div>
              );
            })}
          </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="[&>tr]:border-b [&>tr]:!border-[#E4E7EC] dark:[&>tr]:!border-[#374151]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Market
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Deadline
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Ticket Price
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Votes
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Options
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                  {sortedMarkets.map((market) => {
                    const categoryEmoji = getCategoryEmoji(market.category);
                    const displayImage = market.imageUrl && market.imageUrl.trim() !== "" 
                      ? market.imageUrl 
                      : null;
                    const displayAlt = market.category || market.question;
                    const shouldShowImage = displayImage && 
                      (displayImage.startsWith("/") || 
                       displayImage.startsWith("http") || 
                       displayImage.startsWith("data:image/"));
                    const isHighlighted = highlightMarketId === market.marketId;
                const deadlinePassed = market.deadline === null || market.deadline === undefined
                  ? true
                  : market.deadline <= Date.now();
                const marketResolved = Boolean(market.resolved);
                const marketOpen = !deadlinePassed && !marketResolved;
                const isCreator = address && market.creator && 
                  address.toLowerCase() === market.creator.toLowerCase();
                const showResolveButton = !marketResolved && deadlinePassed && isCreator;
                
                // Check if user has placed a bet on this market
                const userBet = address 
                  ? bets.find(
                      (bet) =>
                        bet.marketId === market.marketId &&
                        bet.bettor.toLowerCase() === address.toLowerCase()
                    )
                  : null;
                const hasPlacedBet = !!userBet;
                    
                    return (
                      <TableRow 
                        key={market.marketId}
                        className={isHighlighted ? "ring-4 ring-brand-500 ring-opacity-50" : ""}
                      >
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div 
                            className="flex items-center gap-3"
                            ref={isHighlighted ? highlightedCardRef : null}
                          >
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                              {shouldShowImage ? (
                                <MarketListImage 
                                  src={displayImage!}
                                  alt={displayAlt}
                                  fallbackEmoji={categoryEmoji}
                                />
                              ) : (
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {categoryEmoji || "MK"}
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                              {market.question}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2 text-gray-500 text-theme-sm dark:text-gray-400">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14ZM8.5 4H7.5V8.5L11 10.5L11.5 9.5L8.5 8V4Z"
                                fill="currentColor"
                              />
                            </svg>
                            <span>{market.timeRemaining}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2 text-theme-sm">
                            <Image
                              src={logoPath}
                              alt="GEN token"
                              width={16}
                              height={16}
                              className="w-4 h-4 object-contain"
                            />
                            <span className="text-gray-500 dark:text-gray-400">{market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-red-600 dark:text-red-400">
                                {(market.options[0] || "NO").toUpperCase()} {market.noPercentage}%
                              </span>
                              <span className="text-green-600 dark:text-green-400">
                                {(market.options[1] || "YES").toUpperCase()} {market.yesPercentage}%
                              </span>
                            </div>
                            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-full">
                              <div
                                className="absolute left-0 top-0 h-full bg-red-500"
                                style={{ width: `${market.noPercentage}%` }}
                              />
                              <div
                                className="absolute right-0 top-0 h-full bg-green-500"
                                style={{ width: `${market.yesPercentage}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          {marketResolved ? (
                            <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 text-xs font-semibold min-h-[42px] flex items-center justify-center">
                              Market resolved
                            </div>
                          ) : showResolveButton ? (
                            <div className="relative w-full rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 flex items-center justify-between gap-2 min-h-[42px]">
                              {showErrorInButton === market.marketId && resolveError ? (
                                <>
                                  <p className="text-xs text-red-700 dark:text-red-300 font-semibold leading-tight flex-1 truncate">
                                    {resolveError}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setShowErrorInButton(null);
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
                                    onClick={async () => {
                                      if (!address) return;
                                      setResolvingMarketId(market.marketId);
                                      setResolveError(null);
                                      setShowErrorInButton(null);
                                      try {
                                        const response = await fetch("/api/results", {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            marketId: market.marketId,
                                            caller: address,
                                          }),
                                        });
                                        const data = await response.json();
                                        
                                        // Handle different response statuses
                                        if (response.status === 202) {
                                          // 202 Accepted - transaction submitted but pending consensus
                                          const errorMsg = "Market resolution is pending. Validators are reaching consensus. Please check again in a few moments.";
                                          setResolveError(errorMsg);
                                          setShowErrorInButton(market.marketId);
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
                                        setResolveError(null);
                                        setShowErrorInButton(null);
                                        refreshMarkets();
                                      } catch (error) {
                                        const message =
                                          error instanceof Error ? error.message : "Failed to resolve market";
                                        setResolveError(message);
                                        setShowErrorInButton(market.marketId);
                                      } finally {
                                        setResolvingMarketId(null);
                                      }
                                    }}
                                    disabled={resolvingMarketId === market.marketId}
                                    className={`shrink-0 px-3 py-2 rounded-md font-semibold text-xs transition-colors border whitespace-nowrap ${
                                      resolvingMarketId === market.marketId
                                        ? "bg-blue-100 dark:bg-blue-800/40 text-blue-300 dark:text-blue-500 border-blue-200 dark:border-blue-700 cursor-wait"
                                        : "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 dark:border-blue-400"
                                    }`}
                                  >
                                    {resolvingMarketId === market.marketId ? "Resolving..." : "Resolve"}
                                  </button>
                                </>
                              )}
                            </div>
                          ) : deadlinePassed ? (
                            <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-semibold min-h-[42px] flex items-center justify-center">
                              Awaiting resolution
                            </div>
                          ) : hasPlacedBet ? (
                            <div className="w-full px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 flex items-center justify-center gap-2 h-[42px]">
                              <svg
                                className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
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
                                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold leading-tight text-center">
                                  Bet placed: {userBet?.option}
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 leading-tight text-center">
                                  Amount: {userBet?.amountFormatted} GEN
                                </p>
                              </div>
                            </div>
                          ) : isConnected && balance !== null && !isLoading && balance < market.price ? (
                            <div className="px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 flex items-center justify-center gap-2 min-h-[42px]">
                              <svg
                                className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 self-center"
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
                                <p className="text-xs text-yellow-800 dark:text-yellow-300 font-semibold leading-tight">
                                  Not enough balance
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-tight">
                                  Need {market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GEN
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleListBetClick(market.marketId, market.options[0] || "No")}
                                disabled={!marketOpen || !isConnected || (balance !== null && balance < market.price) || isLoading || hasPlacedBet || (placingBetMarketId === market.marketId && placingBetOption === market.options[0])}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors border text-sm h-[42px] flex items-center justify-center ${
                                  marketOpen && isConnected && balance !== null && balance >= market.price && !isLoading && !hasPlacedBet
                                    ? "bg-red-50 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-gray-600 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 cursor-pointer"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                                }`}
                              >
                                {(placingBetMarketId === market.marketId && placingBetOption === market.options[0]) ? "..." : (market.options[0] || "NO").toUpperCase()}
                              </button>
                              <button
                                onClick={() => handleListBetClick(market.marketId, market.options[1] || "Yes")}
                                disabled={!marketOpen || !isConnected || (balance !== null && balance < market.price) || isLoading || hasPlacedBet || (placingBetMarketId === market.marketId && placingBetOption === market.options[1])}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors border text-sm h-[42px] flex items-center justify-center ${
                                  marketOpen && isConnected && balance !== null && balance >= market.price && !isLoading && !hasPlacedBet
                                    ? "bg-green-50 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-gray-600 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50 cursor-pointer"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                                }`}
                              >
                                {(placingBetMarketId === market.marketId && placingBetOption === market.options[1]) ? "..." : (market.options[1] || "YES").toUpperCase()}
                              </button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        )
      )}
    </div>
  );
}

