// Default category images mapping.

export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  Crypto: "/images/categories/crypto.png", // Bitcoin logo or crypto icon
  Sports: "/images/categories/sports.png", // Sports ball or trophy icon
  Gaming: "/images/categories/gaming.png", // Game controller icon
  Politics: "/images/categories/politics.png", // Government building or flag icon
  Technology: "/images/categories/technology.png", // Tech/computer icon
  Finance: "/images/categories/finance.png", // Dollar sign or chart icon
  Other: "/images/categories/other.png", // Generic/default icon
};

// Fallback category marks for when images do not exist.
export const CATEGORY_EMOJIS: Record<string, string> = {
  Crypto: "CR",
  Sports: "SP",
  Gaming: "GM",
  Politics: "PL",
  Technology: "TC",
  Finance: "FI",
  Other: "MK",
};

// Get default image for a category
export function getDefaultCategoryImage(category: string): string {
  return DEFAULT_CATEGORY_IMAGES[category] || DEFAULT_CATEGORY_IMAGES.Other;
}

// Get category mark for fallback display.
export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS.Other;
}

// Validate if image URL is valid
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  // Check if it's a valid URL or local path
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/") ||
    url.startsWith("data:image/")
  );
}

