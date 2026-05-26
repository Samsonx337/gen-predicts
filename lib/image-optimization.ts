/**
 * Image Optimization Utility
 * 
 * Optimizes images by resizing and compressing before converting to base64.
 * This reduces the size of base64 strings stored in the contract.
 */

/**
 * Optimize an image file by resizing and compressing
 * Returns optimized base64 data URL
 * 
 * @param file - Image file to optimize
 * @param maxWidth - Maximum width (default: 400px)
 * @param maxHeight - Maximum height (default: 400px)
 * @param quality - JPEG quality 0-100 (default: 80)
 * @returns Optimized base64 data URL
 */
export async function optimizeImage(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 80
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw image with better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        // Use JPEG format for better compression (unless it's a PNG with transparency)
        const isPngWithTransparency = file.type === 'image/png';
        const outputFormat = isPngWithTransparency ? 'image/png' : 'image/jpeg';
        const outputQuality = isPngWithTransparency ? undefined : quality / 100;
        
        const dataUrl = canvas.toDataURL(outputFormat, outputQuality);
        
        // Log size reduction
        const originalSize = file.size;
        const optimizedSize = Math.round((dataUrl.length - dataUrl.split(',')[0].length - 1) * 0.75); // Approximate base64 size
        const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
        
        console.log(`[Image Optimization] Original: ${(originalSize / 1024).toFixed(2)}KB, Optimized: ${(optimizedSize / 1024).toFixed(2)}KB, Reduction: ${reduction}%`);
        
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Optimize a base64 data URL image
 * Useful for optimizing images that are already in base64 format
 * 
 * @param dataUrl - Base64 data URL to optimize
 * @param maxWidth - Maximum width (default: 400px)
 * @param maxHeight - Maximum height (default: 400px)
 * @param quality - JPEG quality 0-100 (default: 80)
 * @returns Optimized base64 data URL
 */
export async function optimizeBase64Image(
  dataUrl: string,
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 80
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw image with better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Determine output format based on original
      const isPng = dataUrl.startsWith('data:image/png');
      const outputFormat = isPng ? 'image/png' : 'image/jpeg';
      const outputQuality = isPng ? undefined : quality / 100;
      
      const optimizedDataUrl = canvas.toDataURL(outputFormat, outputQuality);
      
      // Log size reduction
      const originalSize = dataUrl.length;
      const optimizedSize = optimizedDataUrl.length;
      const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      
      console.log(`[Image Optimization] Original: ${(originalSize / 1024).toFixed(2)}KB, Optimized: ${(optimizedSize / 1024).toFixed(2)}KB, Reduction: ${reduction}%`);
      
      resolve(optimizedDataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image from data URL'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Check if a string is a base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/');
}

/**
 * Get approximate size of base64 data URL in bytes
 */
export function getBase64Size(dataUrl: string): number {
  // Remove data URL prefix to get base64 string
  const base64 = dataUrl.split(',')[1] || '';
  // Base64 encoding increases size by ~33%, so decode to get approximate original size
  return Math.round(base64.length * 0.75);
}



