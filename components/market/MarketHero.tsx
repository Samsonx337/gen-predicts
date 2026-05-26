"use client";
import React, { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { createMarket, getMarkets } from "@/lib/api";
import { getDefaultCategoryImage, getCategoryEmoji, isValidImageUrl } from "@/lib/category-images";
import { optimizeImage, optimizeBase64Image, isBase64DataUrl } from "@/lib/image-optimization";
import Image from "next/image";
import { useMarketsRefresh } from "@/context/MarketsRefreshContext";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "next/navigation";
import { useWalletBalance } from "@/context/WalletBalanceContext";

// Function to auto-generate Market ID
const generateMarketId = (category: string): string => {
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${categoryPrefix}-${timestamp}-${randomStr}`;
};

// Zod validation schema
const marketFormSchema = z.object({
  question: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .max(200, "Question must not exceed 200 characters"),
  category: z.string().min(1, "Please select a category"),
  deadline: z
    .string()
    .min(1, "End date is required")
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const now = new Date();
        return selectedDate > now;
      },
      {
        message: "End date must be in the future",
      }
    ),
  options: z
    .string()
    .min(1, "Options are required")
    .refine(
      (options) => {
        const optionsArray = options.split(",").map((opt) => opt.trim()).filter((opt) => opt.length > 0);
        // Must have exactly 2 options
        if (optionsArray.length !== 2) {
          return false;
        }
        // Options must be unique
        if (optionsArray.length !== new Set(optionsArray).size) {
          return false;
        }
        // Each option must have at least 1 character
        return optionsArray.every((opt) => opt.length > 0);
      },
      {
        message: "Please provide exactly 2 unique options separated by commas (e.g., Yes,No or Good,Bad)",
      }
    ),
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (price) => {
        const numPrice = parseFloat(price);
        return !isNaN(numPrice) && numPrice > 0 && numPrice <= 10000;
      },
      {
        message: "Price must be a number between 0.01 and 10,000 GEN",
      }
    ),
  imageUrl: z
    .string()
    .optional()
    .refine(
      (url) => {
        if (!url || url.trim() === "") return true; // Optional field
        return isValidImageUrl(url);
      },
      {
        message: "Please provide a valid image URL or leave empty to use default",
      }
    ),
  resolutionUrl: z
    .string()
    .optional()
    .refine(
      (url) => {
        if (!url || url.trim() === "") return true; // Optional field, can be empty
        // Basic URL validation
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Please provide a valid URL or leave empty",
      }
    ),
});

type MarketFormData = z.infer<typeof marketFormSchema>;

export function MarketHero() {
  const account = useActiveAccount();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePreviewType, setImagePreviewType] = useState<"url" | "mark">("url");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshMarkets } = useMarketsRefresh();
  const { refreshBalance } = useWalletBalance();
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  // Auto-hide success message after 10 seconds
  useEffect(() => {
    if (mintStatus.type === 'success') {
      const timer = setTimeout(() => {
        setMintStatus({ type: null, message: '' });
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [mintStatus.type]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<MarketFormData>({
    resolver: zodResolver(marketFormSchema),
    defaultValues: {
      question: "",
      category: "",
      deadline: "",
      options: "Yes,No",
      price: "1.0",
      imageUrl: "",
      resolutionUrl: "",
    },
  });

  const category = watch("category");
  const imageUrl = watch("imageUrl");
  const options = watch("options");
  const generatedMarketId = category ? generateMarketId(category) : "";
  
  // Real-time validation for options
  const optionsArray = options ? options.split(",").map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0) : [];
  const isValidOptions = optionsArray.length === 2 && optionsArray.length === new Set(optionsArray).size;
  const isFormValid = !errors.question && !errors.category && !errors.deadline && isValidOptions && !errors.price;

  // Update image preview when category or imageUrl changes
  React.useEffect(() => {
    if (imageUrl && imageUrl.trim() !== "") {
      // User provided image URL or uploaded file
      setImagePreview(imageUrl);
      setImagePreviewType("url");
    } else if (category) {
      const categoryMark = getCategoryEmoji(category);
      setImagePreview(categoryMark);
      setImagePreviewType("mark");
    } else {
      setImagePreview(null);
      setImagePreviewType("url");
    }
  }, [category, imageUrl]);

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      
      // Show loading toast
      const loadingToast = toast.loading("Optimizing image...");
      
      try {
        // Optimize image before creating preview
        const optimizedDataUrl = await optimizeImage(file, 400, 400, 80);
        
        setImagePreview(optimizedDataUrl);
        setImagePreviewType("url"); // Set type to url for uploaded images
        setValue("imageUrl", optimizedDataUrl); // Set as optimized data URL
        
        toast.dismiss(loadingToast);
        toast.success("Image optimized and ready");
      } catch (error) {
        console.error("Error optimizing image:", error);
        toast.dismiss(loadingToast);
        // Fallback to non-optimized version
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setImagePreview(result);
          setImagePreviewType("url");
          setValue("imageUrl", result);
        };
        reader.readAsDataURL(file);
        toast.error("Failed to optimize image, using original");
      }
    }
  };

  // Handle image URL input
  const handleImageUrlChange = async (url: string) => {
    setValue("imageUrl", url);
    if (url && url.trim() !== "") {
      // If it's a base64 data URL, optimize it
      if (isBase64DataUrl(url)) {
        const loadingToast = toast.loading("Optimizing image...");
        try {
          const optimized = await optimizeBase64Image(url, 400, 400, 80);
          setValue("imageUrl", optimized);
          setImagePreview(optimized);
          setImagePreviewType("url");
          toast.dismiss(loadingToast);
          toast.success("Image optimized");
        } catch (error) {
          console.error("Error optimizing base64 image:", error);
          toast.dismiss(loadingToast);
          // Use original if optimization fails
          setImagePreview(url);
          setImagePreviewType("url");
        }
      } else {
        // Regular URL, no optimization needed
        setImagePreview(url);
        setImagePreviewType("url");
      }
      setImageFile(null); // Clear file if URL is provided
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else if (category) {
      const categoryMark = getCategoryEmoji(category);
      setImagePreview(categoryMark);
      setImagePreviewType("mark");
    }
  };

  // Handle remove image
  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setValue("imageUrl", "");
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // If category is selected, show its fallback mark.
    if (category) {
      const categoryMark = getCategoryEmoji(category);
      setImagePreview(categoryMark);
      setImagePreviewType("mark");
    }
  };

  const onSubmit = async (data: MarketFormData) => {
    // Check if wallet is connected
    if (!account?.address) {
      toast.error("Wallet not connected. Please connect your wallet to create a market.", {
        duration: 5000,
      });
      return;
    }

    const marketId = generateMarketId(data.category);
    
    // Convert deadline from datetime-local string to Unix timestamp (milliseconds)
    const deadlineTimestamp = new Date(data.deadline).getTime();
    
    // Determine image URL: use provided URL, or default category image, or empty string
    let finalImageUrl = "";
    if (data.imageUrl && data.imageUrl.trim() !== "") {
      finalImageUrl = data.imageUrl.trim();
    } else if (data.category) {
      finalImageUrl = getDefaultCategoryImage(data.category);
    }
    
    const formData = {
      marketId,
      question: data.question,
      category: data.category,
      deadline: deadlineTimestamp, // Convert to number (Unix timestamp in milliseconds)
      options: data.options, // Already a comma-separated string
      price: parseFloat(data.price), // Convert to number
      imageUrl: finalImageUrl, // Image URL or default
      creator: account.address, // Creator wallet address
      resolutionUrl: data.resolutionUrl?.trim() || "", // Resolution URL or empty string
    };

    // Show loading toast
    const loadingToast = toast.loading("Creating market...");

    try {
      // Send to backend
      const response = await createMarket(formData);

      // Success notification with transaction hash if available
      let successMessage = `Market "${marketId}" created successfully!`;
      if (response.tx) {
        // Handle both string and object formats
        if (typeof response.tx === 'string') {
          // If it's a transaction hash (starts with 0x), show truncated version
          if (response.tx.startsWith('0x') && response.tx.length > 10) {
            successMessage = `Market "${marketId}" created successfully! Transaction: ${response.tx.slice(0, 10)}...`;
          } else {
            // If it's a message string, just show the message
            successMessage = response.tx;
          }
        } else if (typeof response.tx === 'object' && response.tx !== null) {
          // If it's an object, try to extract hash or message
          const txHash = (response.tx as { hash?: string; message?: string }).hash || 
                        (response.tx as { hash?: string; message?: string }).message;
          if (txHash && typeof txHash === 'string') {
            if (txHash.startsWith('0x') && txHash.length > 10) {
              successMessage = `Market "${marketId}" created successfully! Transaction: ${txHash.slice(0, 10)}...`;
            } else {
              successMessage = txHash;
            }
          }
        }
      }

      toast.success(successMessage, {
        id: loadingToast,
        duration: 5000,
      });

      // Reset form and close modal first
      reset();
      setIsModalOpen(false);

      // Poll for the market to appear in the list, then redirect
      // The contract state update can take a few seconds to propagate
      let attempts = 0;
      const maxAttempts = 10; // Try for up to 10 seconds
      const pollInterval = 1000; // Check every second
      
      const pollForMarket = async () => {
        attempts++;
        try {
          const marketsResponse = await getMarkets();
          if (marketsResponse.success && marketsResponse.data) {
            const marketExists = marketsResponse.data.some(
              (m) => m.marketId === marketId
            );
            
            if (marketExists) {
              // Market found! Refresh the list and redirect
              refreshMarkets();
              // Small delay to ensure the refresh completes, then redirect
              setTimeout(() => {
                router.push(`/dashboard/market?highlight=${marketId}`);
              }, 500);
              return;
            }
          }
        } catch (error) {
          console.error("Error polling for market:", error);
        }
        
        // If market not found and we haven't exceeded max attempts, try again
        if (attempts < maxAttempts) {
          setTimeout(pollForMarket, pollInterval);
        } else {
          // Max attempts reached, refresh anyway and redirect
          // The market might appear on the next page load
          refreshMarkets();
          setTimeout(() => {
            router.push(`/dashboard/market?highlight=${marketId}`);
          }, 500);
        }
      };
      
      // Start polling after a 2 second delay to give the contract time to process
      setTimeout(pollForMarket, 2000);
    } catch (error) {
      // Error notification
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create market. Please try again.";
      
      toast.error(errorMessage, {
        id: loadingToast,
        duration: 5000,
      });
      
      console.error("Error creating market:", error);
    }
  };

  const handleClose = () => {
    reset();
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsModalOpen(false);
  };

  const handleMint = async () => {
    if (!account?.address) {
      setMintStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    setIsMinting(true);
    setMintStatus({ type: null, message: '' });

    try {
      // Mint 100 GEN tokens (or adjust amount as needed)
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: account.address,
          amount: 100, // Mint 100 GEN tokens per request
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMintStatus({ type: 'success', message: `Successfully minted ${data.amount} GEN tokens!` });
        // Refresh balance after minting with retries (contract state may need time to update)
        // Wait a bit longer initially, then retry a few times
        setTimeout(() => {
          refreshBalance();
        }, 3000);
        
        // Additional retries with increasing delays
        setTimeout(() => {
          refreshBalance();
        }, 6000);
        
        setTimeout(() => {
          refreshBalance();
        }, 10000);
      } else {
        setMintStatus({ type: 'error', message: data.error || 'Failed to mint tokens' });
      }
    } catch (error) {
      console.error('Error minting tokens:', error);
      setMintStatus({ type: 'error', message: 'An error occurred while minting tokens' });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <>
      <div className="mb-8 border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500 dark:text-brand-300">
              Market console
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-5xl">
              Create, trade, and resolve markets with GenLayer.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400 md:text-base">
              Open a market with a verifiable source, let participants back an outcome, and use the intelligent
              contract to resolve the result when the deadline passes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[340px]">
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-11 border border-gray-900 bg-gray-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:border-white dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            Create Market
          </button>
          <button 
            onClick={handleMint}
            disabled={isMinting || !account?.address}
            className="flex h-11 items-center justify-center gap-2 border border-brand-500 bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMinting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Minting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Mint Tokens
              </>
            )}
          </button>
          </div>
        </div>
        {!account?.address && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Connect your wallet to mint GEN tokens for placing bets
          </p>
        )}
        {mintStatus.type && (
          <div
            className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium ${
              mintStatus.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {mintStatus.message}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        className="max-w-2xl"
      >
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Create a New Prediction Market
          </h2>
          
          {/* Wallet Connection Warning */}
          {!account?.address && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 flex items-center gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0"
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
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  Wallet not connected
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                  Please connect your wallet to create a market
                </p>
              </div>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Auto-generated Market ID - Display only */}
            {category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Market ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={generatedMarketId}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Auto-generated unique identifier
                </p>
              </div>
            )}

            {/* Market Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Question <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("question")}
                placeholder="e.g., Will Bitcoin cost at least 180,000$ on the 13 of December?"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.question
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-700"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
              />
              {errors.question && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.question.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                {...register("category")}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.category
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-700"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500`}
              >
                <option value="">Select a category</option>
                <option value="Crypto">Crypto</option>
                <option value="Sports">Sports</option>
                <option value="Gaming">Gaming</option>
                <option value="Politics">Politics</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.category.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register("deadline")}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.deadline
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-700"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500`}
              />
              {errors.deadline && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.deadline.message}
                </p>
              )}
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Options <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("options")}
                placeholder="Yes,No"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.options
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-700"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Exactly 2 comma-separated options (e.g., Yes,No or Good,Bad)
              </p>
              {options && options.trim() !== "" && (
                <p className={`mt-1 text-xs ${isValidOptions ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                  {isValidOptions 
                    ? `✓ Valid: ${optionsArray[0]} or ${optionsArray[1]}`
                    : optionsArray.length === 0
                    ? "Please enter 2 options"
                    : optionsArray.length === 1
                    ? "Please enter a second option"
                    : optionsArray.length > 2
                    ? `Too many options (${optionsArray.length}). Please enter exactly 2 options.`
                    : "Options must be unique"
                  }
                </p>
              )}
              {errors.options && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.options.message}
                </p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price per Share (GEN) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10000"
                {...register("price")}
                placeholder="1.0"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.price
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-700"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cost to buy one share (YES or NO) in GEN
              </p>
              {errors.price && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* Image Upload/URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Image <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 flex items-center justify-center">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {(imagePreview.startsWith("/") || imagePreview.startsWith("http") || imagePreview.startsWith("data:image/")) && imagePreviewType === "url" ? (
                      <Image
                        src={imagePreview}
                        alt="Market preview"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        onError={() => {
                          // On error, show category fallback mark instead of hiding.
                          if (category) {
                            const categoryMark = getCategoryEmoji(category);
                            setImagePreview(categoryMark);
                            setImagePreviewType("mark");
                          } else {
                            setImagePreview(null);
                          }
                        }}
                      />
                    ) : (
                      // Show the category mark directly.
                      <div className="w-full h-full flex items-center justify-center text-xl font-semibold tracking-[0.18em] text-gray-700 dark:text-gray-200">
                        {imagePreview}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Show preview when category is selected but no imageUrl yet */}
              {!imagePreview && category && (
                <div className="mb-3 flex items-center justify-center">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center text-xl font-semibold tracking-[0.18em] text-gray-700 dark:text-gray-200">
                      {getCategoryEmoji(category)}
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Upload Image
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="file-input-wrapper">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="file-input-hide-text"
                      id="file-upload-input"
                    />
                    <label
                      htmlFor="file-upload-input"
                      className="file-input-label"
                    >
                      Choose file
                    </label>
                  </div>
                  {/* File name and delete button */}
                  {imageFile && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                        {imageFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 shrink-0"
                        title="Remove image"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Max size: 5MB. Supported formats: JPG, PNG, GIF, WebP
                </p>
              </div>

              {/* Or Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">OR</span>
                </div>
              </div>

              {/* Image URL Input */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Image URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    {...register("imageUrl")}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    placeholder="https://example.com/image.png or leave empty for default"
                    disabled={!!imageFile} // Disable when file is uploaded
                    className={`flex-1 px-4 py-3 rounded-lg border ${
                      errors.imageUrl
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-gray-700"
                    } ${
                      imageFile
                        ? "bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    } placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60`}
                  />
                  {/* Delete button for URL - only show when URL is provided and no file is uploaded */}
                  {!imageFile && imageUrl && imageUrl.trim() !== "" && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 shrink-0"
                      title="Remove image URL"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {imageFile && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Image URL is disabled while a file is uploaded. Remove the uploaded image to use URL instead.
                  </p>
                )}
                {!imageFile && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {category
                      ? `Default category mark: ${getCategoryEmoji(category)}`
                      : "Select a category first to see default image"}
                  </p>
                )}
                {errors.imageUrl && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                    {errors.imageUrl.message}
                  </p>
                )}
              </div>
            </div>

            {/* Resolution URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resolution URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                {...register("resolutionUrl")}
                placeholder="https://example.com/resolution or leave empty"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.resolutionUrl
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-700"
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                URL where the market resolution/result will be published (can be left empty for now)
              </p>
              {errors.resolutionUrl && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.resolutionUrl.message}
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !account?.address || !isFormValid}
                className="flex-1 px-6 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !account?.address 
                    ? "Please connect your wallet to create a market" 
                    : !isFormValid 
                    ? "Please fix form errors before submitting"
                    : ""
                }
              >
                {isSubmitting ? "Creating..." : "Create Market"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

