"use client";
import React, { useState } from "react";
import { Market } from "@/lib/api";
import { getCategoryEmoji } from "@/lib/category-images";
import Image from "next/image";
import Link from "next/link";

interface SearchResultsProps {
  results: Market[];
  onSelect?: (market: Market) => void;
  isLoading?: boolean;
}

function SearchResultImage({ src, alt, fallbackEmoji }: { src: string; alt: string; fallbackEmoji: string }) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    return (
      <span className="text-sm font-semibold tracking-[0.16em]">{fallbackEmoji || "MK"}</span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="w-full h-full object-cover rounded-full"
      onError={() => setImageError(true)}
      unoptimized={src.startsWith("data:image/")}
    />
  );
}

export function SearchResults({ results, onSelect, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Searching...
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          No markets found
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
      <div className="p-2">
        {results.map((market) => {
          const categoryEmoji = getCategoryEmoji(market.category);
          const displayImage = market.imageUrl && market.imageUrl.trim() !== "" 
            ? market.imageUrl 
            : null;
          const shouldShowImage = displayImage && 
            (displayImage.startsWith("/") || 
             displayImage.startsWith("http") || 
             displayImage.startsWith("data:image/"));

          return (
            <Link
              key={market.marketId}
              href={`/dashboard/market?highlight=${market.marketId}`}
              onClick={() => onSelect?.(market)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                {shouldShowImage ? (
                  <SearchResultImage
                    src={displayImage}
                    alt={market.category}
                    fallbackEmoji={categoryEmoji || "MK"}
                  />
                ) : (
                  <span className="text-sm font-semibold tracking-[0.16em]">{categoryEmoji || "MK"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {market.question}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {market.category} / {market.price} GEN
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

