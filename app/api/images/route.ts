import { NextResponse } from 'next/server'

/**
 * Image Upload API Endpoint
 * 
 * Currently converts images to base64 data URLs for storage.
 * 
 * TODO: For production, consider migrating to:
 * - IPFS (decentralized storage) - recommended for blockchain apps
 * - Cloud storage (AWS S3, Cloudinary, etc.) - centralized but reliable
 * 
 * This endpoint accepts:
 * - File uploads (multipart/form-data)
 * - Base64 data URLs (application/json)
 * 
 * Returns: { success: true, imageUrl: string }
 */

// POST /api/images
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''
    
    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: 'File must be an image' },
          { status: 400 }
        )
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'Image size must be less than 5MB' },
          { status: 400 }
        )
      }
      
      // Convert to base64 data URL
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`
      
      return NextResponse.json({
        success: true,
        imageUrl: dataUrl,
      })
    }
    
    // Handle base64 data URL (application/json)
    if (contentType.includes('application/json')) {
      const { imageUrl } = await req.json()
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Invalid imageUrl provided' },
          { status: 400 }
        )
      }
      
      // Validate it's a data URL or HTTP(S) URL
      if (imageUrl.startsWith('data:image/') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return NextResponse.json({
          success: true,
          imageUrl: imageUrl,
        })
      }
      
      return NextResponse.json(
        { success: false, error: 'Invalid image URL format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Unsupported content type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Image upload failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process image' },
      { status: 500 }
    )
  }
}

