// API utility functions for market operations

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ==================== Market Types ====================

export interface CreateMarketRequest {
  marketId: string;
  question: string;
  category: string;
  deadline: number; // Unix timestamp in milliseconds
  options: string; // Comma-separated string
  price: number; // Price per share in GEN
  imageUrl: string; // Image URL or default category image
  creator: string; // Creator wallet address
  resolutionUrl: string; // URL for market resolution/result
}

export interface CreateMarketResponse {
  success: boolean;
  tx?: string; // Transaction hash
  error?: string;
}

export interface Market {
  marketId: string;
  question: string;
  category: string;
  deadline: number | null; // Unix timestamp in milliseconds
  deadlineFormatted: string | null; // ISO string
  createdAt?: number | null;
  createdAtFormatted?: string | null;
  options: string[]; // Array of option strings
  rawOptions: string; // Original comma-separated string
  price: number; // Price per share in GEN
  imageUrl: string; // Image URL or default category image
  creator: string; // Creator wallet address
  resolved?: boolean;
  result?: string;
  resolutionUrl?: string;
  totalPool?: number;
}

export interface GetMarketsResponse {
  success: boolean;
  data: Market[];
  error?: string;
}

// ==================== Bet Types ====================

export interface CreateBetRequest {
  marketId: string;
  bettor: string; // Ethereum address
  option: string; // Selected option
  amount: string; // Amount in wei (as string)
}

export interface CreateBetResponse {
  success: boolean;
  tx?: string; // Transaction hash
  error?: string;
}

export interface Bet {
  marketId: string;
  bettor: string; // Ethereum address
  option: string;
  amount: string; // Amount in wei (as string)
  amountFormatted: string; // Amount in ether (as string)
  amountInEther: number; // Amount in ether (as number)
}

export interface GetBetsResponse {
  success: boolean;
  data: Bet[];
  error?: string;
}

// ==================== Result Types ====================

export interface CreateResultRequest {
  marketId: string;
  outcome: string; // The winning outcome
}

export interface CreateResultResponse {
  success: boolean;
  tx?: string; // Transaction hash
  error?: string;
}

// ==================== Market API Functions ====================

/**
 * Creates a new prediction market
 */
export async function createMarket(
  marketData: CreateMarketRequest
): Promise<CreateMarketResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/markets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(marketData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create market');
    }

    return data;
  } catch (error) {
    console.error('Error creating market:', error);
    throw error;
  }
}

/**
 * Fetches all markets
 */
export async function getMarkets(): Promise<GetMarketsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/markets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch markets');
    }

    return data;
  } catch (error) {
    console.error('Error fetching markets:', error);
    throw error;
  }
}

// ==================== Image Upload Functions ====================

export interface UploadImageResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * Uploads an image file and returns the image URL
 * Currently converts to base64 data URL for storage
 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/images`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload image');
    }

    return data;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// ==================== Bet API Functions ====================

/**
 * Places a bet on a market
 */
export async function createBet(
  betData: CreateBetRequest
): Promise<CreateBetResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(betData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to place bet');
    }

    return data;
  } catch (error) {
    console.error('Error placing bet:', error);
    throw error;
  }
}

/**
 * Fetches all bets (optionally filtered by marketId)
 */
export async function getBets(marketId?: string): Promise<GetBetsResponse> {
  try {
    const url = marketId 
      ? `${API_BASE_URL}/bets?marketId=${encodeURIComponent(marketId)}`
      : `${API_BASE_URL}/bets`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch bets');
    }

    return data;
  } catch (error) {
    console.error('Error fetching bets:', error);
    throw error;
  }
}

// ==================== Result Types ====================

export interface Result {
  marketId: string;
  outcome: string;
  resolvedAt: number; // Unix timestamp in milliseconds
  resolvedAtFormatted: string | null; // ISO string
}

export interface GetResultsResponse {
  success: boolean;
  data: Result[];
  error?: string;
}

// ==================== Result API Functions ====================

/**
 * Publishes the result for a market
 */
export async function createResult(
  resultData: CreateResultRequest
): Promise<CreateResultResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resultData),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to publish result');
    }

    return data;
  } catch (error) {
    console.error('Error publishing result:', error);
    throw error;
  }
}

/**
 * Fetches all results
 */
export async function getResults(): Promise<GetResultsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/results`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch results');
    }

    return data;
  } catch (error) {
    console.error('Error fetching results:', error);
    throw error;
  }
}

