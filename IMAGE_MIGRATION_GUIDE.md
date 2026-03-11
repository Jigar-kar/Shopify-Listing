# 📸 Image System Migration Guide

## GitHub CDN → Shopify CDN (v3.0)

---

## 🎯 What Changed

### **Before (v2.x)**

- Frontend uploads images to GitHub
- Gets GitHub RAW URLs
- Sends URLs to backend
- Backend creates product with GitHub URLs in Shopify

**Problem:** Image hosting depends on external service (GitHub)

### **After (v3.0 - NEW)**

- Frontend uploads images **locally** (from user's computer)
- Sends images as base64/buffer to backend
- Backend automatically:
  1. ✅ Converts base64 to image buffer (no download needed)
  2. ✅ Compresses & converts to WebP
  3. ✅ Uploads to Shopify CDN
  4. ✅ Maps images to color variants
  5. ✅ Creates product with Shopify CDN images

**Benefits:**

- ✅ Images hosted on Shopify (official CDN)
- ✅ Better performance & reliability
- ✅ No GitHub dependency
- ✅ Automatic format optimization (WebP)
- ✅ No download step needed (faster)
- ✅ Proper variant-to-image mapping

---

## 🚀 New Image Processing Pipeline

```
┌──────────────────────────────────────────┐
│  Frontend uploads images from computer   │
│  (User selects local image files)        │
│  Converts to base64 or buffer            │
└────────────────────┬─────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ POST /api/add-product      │
        │ {                          │
        │   product: {...},          │
        │   images: [base64 strings] │
        │ }                          │
        └────────────────────┬───────┘
                             │
                             ▼
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃  Step 1: CREATE PRODUCT         ┃
    ┃  (WITHOUT images yet)           ┃
    ┃  → Get product ID               ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                     │
                     ▼
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃  Step 2: PROCESS IMAGES         ┃
    ┃  For each image:                ┃
    ┃  • Convert base64 → buffer     ┃
    ┃  • Compress to WebP             ┃
    ┃  • Upload to Shopify CDN        ┃
    ┃  → Get image IDs                ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                     │
                     ▼
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃  Step 3: MAP IMAGES             ┃
    ┃  Match images → variants        ┃
    ┃  by color name                  ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                     │
                     ▼
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃  Step 4: ATTACH IMAGES          ┃
    ┃  Update variants with           ┃
    ┃  image IDs from Shopify         ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                     │
                     ▼
        ┌────────────────────────────┐
        │ ✅ Product created in      │
        │   Shopify with WebP images │
        │   hosted on Shopify CDN    │
        └────────────────────────────┘
```

---

## 📋 Image Specifications

### **Compression Settings**

| Setting        | Value                   |
| -------------- | ----------------------- |
| **Format**     | WebP                    |
| **Quality**    | 80%                     |
| **Max Width**  | 2000px                  |
| **Max Height** | 2000px                  |
| **Fit**        | Inside (no enlargement) |
| **Metadata**   | Removed                 |

### **Example Compression Result**

```
Original: 2.5 MB JPG (4000x3000px)
   ↓
Compressed: 285 KB WebP (2000x1500px, Q80)
   ↓
Savings: 89% smaller, same visual quality
```

---

## 🔧 New Functions in server.js

### **1. `downloadImage(imageUrl) → Buffer`**

Downloads image from URL via Axios

```javascript
const buffer = await downloadImage("https://example.com/image.jpg");
```

### **2. `compressImage(buffer, maxWidth, quality) → Buffer`**

Compresses and converts to WebP using Sharp

```javascript
const webp = await compressImage(imageBuffer, 2000, 80);
// Returns optimized WebP buffer
```

### **3. `uploadImageToShopify(productId, buffer, filename) → Object`**

Uploads image to Shopify CDN via Admin API

```javascript
const image = await uploadImageToShopify(
  productId,
  webpBuffer,
  "gold-ring.webp",
);
// Returns: { id, src, created_at, ... }
```

### **4. `mapImagesToVariants(variants, imagesByColor) → Array`**

Maps images to variants by color name

```javascript
const updated = await mapImagesToVariants(variants, [
  { color: "Gold", imageIds: [123, 124] },
  { color: "Silver", imageIds: [125, 126] },
]);
```

### **5. `processAndUploadProductImages(productId, colorVariants) → Array`**

Orchestrates the entire image upload process

```javascript
const imagesByColor = await processAndUploadProductImages(productId, [
  {
    colorName: "Gold",
    images: [{ src: "https://..." }, { src: "https://..." }],
  },
  {
    colorName: "Silver",
    images: [{ src: "https://..." }],
  },
]);
```

---

## 🔌 Updated API Endpoints

### **POST /api/add-product**

#### Request

```json
{
  "product": {
    "title": "Gold Ring",
    "description": "Premium jewelry",
    "type": "Ring",
    "handle": "gold-ring",
    "colorVariants": [
      {
        "colorName": "Gold",
        "sku": "RING-GOLD-10",
        "price": "99.99",
        "inventory": "5",
        "images": [
          { "src": "https://example.com/ring-gold-1.jpg" },
          { "src": "https://example.com/ring-gold-2.jpg" }
        ]
      },
      {
        "colorName": "Silver",
        "sku": "RING-SILVER-10",
        "price": "89.99",
        "inventory": "8",
        "images": [{ "src": "https://example.com/ring-silver-1.jpg" }]
      }
    ]
  },
  "vendor": "Premium Rings Co"
}
```

#### Response (201 Success)

```json
{
  "success": true,
  "message": "Product 'Gold Ring' created successfully in Shopify with images",
  "product": {
    "id": 7234567890,
    "title": "Gold Ring",
    "handle": "gold-ring",
    "variants_count": 2,
    "images_count": 3,
    "images_by_color": [
      {
        "color": "Gold",
        "imageIds": [1234567890, 1234567891]
      },
      {
        "color": "Silver",
        "imageIds": [1234567892]
      }
    ]
  }
}
```

#### Response (Error)

```json
{
  "success": false,
  "error": "Failed to compress image: Invalid image format"
}
```

---

## 📊 Product Creation Process

### **Example: Creating a Gold & Silver Ring with Images**

1. **Frontend sends:**
   - Title: "Gold & Silver Ring"
   - 2 color variants (Gold, Silver)
   - 3 images total (2 for Gold, 1 for Silver)

2. **Backend Step 1: Create Product**

   ```
   POST /admin/api/2024-01/products.json
   - Title: "Gold & Silver Ring"
   - Variants: [Gold/10, Gold/12, Silver/10, Silver/12]
   - NO images included
   → Returns: Product ID = 123456789
   ```

3. **Backend Step 2: Process Images**

   ```
   For each image:
   ✓ Download from GitHub/URL
   ✓ Compress to WebP (89% smaller)
   ✓ Upload to Shopify

   Results:
   - Gold image 1 → Image ID: 9876543210
   - Gold image 2 → Image ID: 9876543211
   - Silver image 1 → Image ID: 9876543212
   ```

4. **Backend Step 3: Map to Variants**

   ```
   Match by color:
   - Variant "Gold/10" → Image 9876543210
   - Variant "Gold/12" → Image 9876543210
   - Variant "Silver/10" → Image 9876543212
   - Variant "Silver/12" → Image 9876543212
   ```

5. **Backend Step 4: Update Variants**

   ```
   PUT /admin/api/2024-01/variants/{id}.json
   - Variant 1: image_id = 9876543210
   - Variant 2: image_id = 9876543210
   - Variant 3: image_id = 9876543212
   - Variant 4: image_id = 9876543212
   ```

6. **Result in Shopify:**
   ✅ Product has correct variants
   ✅ Images in Shopify CDN (WebP format)
   ✅ Images properly mapped to colors
   ✅ All images optimized for fast loading

---

## 🔍 Server Logging

### **Example Console Output**

```
[API] Received product: "Gold Ring"
[Transform] Product Summary:
  Title: Gold Ring
  Type: Ring
  Vendor: Premium Rings Co
  Variants: 2
  Images: Will be uploaded separately to Shopify CDN

[API] Step 1: Creating product in Shopify...
[Shopify API] Sending product: "Gold Ring"
[Shopify API] Success! Product ID: 7234567890

[API] Step 2: Processing and uploading images to Shopify CDN...

[Images] Processing 2 image(s) for color: Gold
[Image] Downloading image from URL: https://example.com/ring-gold-1.jpg
[Image] Downloaded successfully (2500000 bytes)
[Image] Compressing to WebP (max-width: 2000px, quality: 80)
[Image] Compression complete (285000 bytes, 11% of original)
[Shopify Upload] Uploading image to product 7234567890: gold-1.webp
[Shopify Upload] Success! Image ID: 1234567890, URL: https://cdn.shopify.com/.../gold-1_...

[Images] Processing 1 image(s) for color: Silver
[Image] Downloading image from URL: https://example.com/ring-silver-1.jpg
[Image] Downloaded successfully (1800000 bytes)
[Image] Compressing to WebP (max-width: 2000px, quality: 80)
[Image] Compression complete (198000 bytes, 11% of original)
[Shopify Upload] Uploading image to product 7234567890: silver-1.webp
[Shopify Upload] Success! Image ID: 1234567891, URL: https://cdn.shopify.com/.../silver-1_...

[API] Step 3: Mapping images to variants...
[Variants] Mapping 2 variant(s) to 2 color group(s)
  ✓ Variant "Gold" → Image ID: 1234567890
  ✓ Variant "Silver" → Image ID: 1234567891

[API] Step 4: Updating variants with image IDs...
  ✓ Updated variant 456789012 with image 1234567890
  ✓ Updated variant 456789013 with image 1234567891

[Images] Total images processed and uploaded: 2
```

---

## ⚠️ Error Handling

### **Common Errors & Solutions**

| Error                                          | Cause                      | Solution                           |
| ---------------------------------------------- | -------------------------- | ---------------------------------- |
| `Failed to download image`                     | Invalid URL or timeout     | Check image URL is accessible      |
| `Failed to compress image`                     | Corrupted image file       | Ensure image file is valid         |
| `Failed to upload image to Shopify`            | Token invalid or API limit | Check SHOPIFY_ADMIN_TOKEN          |
| `Product must have at least one color variant` | No variants provided       | Add at least 1 color variant       |
| `Variant image mapping failed`                 | Color names don't match    | Ensure variant names match exactly |

### **Error Response Example**

```json
{
  "success": false,
  "error": "Failed to compress image: Invalid image format",
  "details": "Stack trace here (only in development mode)"
}
```

---

## 🔐 Security Features

✅ **Token Security**

- Admin token stored in `.env` file
- Never exposed in logs or responses
- Transmitted only over HTTPS

✅ **Image Processing**

- Metadata removed during compression
- No temporary files left on disk
- Streams directly to Shopify

✅ **Error Handling**

- Stack traces hidden in production
- Graceful error recovery
- Continues processing other images if one fails

---

## 📈 Performance Metrics

### **Typical Image Upload**

```
File: ring.jpg (3000x2250px, 2.8 MB)
Time: ~5-8 seconds total

Breakdown:
1. Download: 1s (network speed dependent)
2. Compress: 0.5s (WebP conversion on Sharp)
3. Upload: 2-5s (Shopify CDN upload)
4. Variant update: 0.5s (API call)
```

### **Batch Product Example**

```
Creating 5 products with 3 images each = 15 images total

Expected time: 60-120 seconds
- Product creation: 5-10s
- Image processing & upload: 40-100s
- Variant mapping: 5-10s
```

---

## 🧪 Testing the New System

### **Test with Postman**

1. **Create a test image** (small test PNG/JPG)

2. **Upload to temporary hosting** (e.g., imgur.com)

3. **Send POST request:**

```bash
POST http://localhost:3000/api/add-product
Content-Type: application/json

{
  "product": {
    "title": "Test Product",
    "description": "Testing new image system",
    "type": "Test",
    "handle": "test-product",
    "colorVariants": [
      {
        "colorName": "Test Color",
        "sku": "TEST-001",
        "price": "9.99",
        "inventory": "10",
        "images": [
          { "src": "https://your-image-url.jpg" }
        ]
      }
    ]
  },
  "vendor": "Test Vendor"
}
```

4. **Check Shopify Admin:**
   - Product should appear with image in Shopify CDN
   - Image should be in WebP format
   - Image size should be optimized

---

## ✅ Checklist: Migration Complete

- ✅ `npm install` (added sharp, axios)
- ✅ Updated `server.js` with image processing functions
- ✅ Modified `/api/add-product` endpoint
- ✅ Created image-to-variant mapping logic
- ✅ All logs implemented for debugging
- ✅ Error handling in place
- ✅ API response updated with image counts
- ✅ Frontend expects new response format

---

## 🚀 Next Steps

1. **Start the server:**

   ```bash
   npm start
   ```

2. **Verify in browser console:**
   - Should see detailed image processing logs
   - Images should be WebP format (check Network tab)
   - Product should appear in Shopify with Shopify CDN images

3. **Test with real product:**
   - Create product with multiple color variants
   - Upload 2-3 images per color
   - Verify all images appear correctly in Shopify

4. **Monitor performance:**
   - Check logs for processing time
   - Verify WebP size reduction
   - Confirm variant-image mapping worked

---

## 📞 Support & Issues

### **Common Questions**

**Q: Why are images converted to WebP?**
A: WebP is modern format with 25-35% better compression ratio while maintaining quality. Shopify CDN supports WebP.

**Q: Can I still use GitHub images?**
A: Yes! Frontend still uploads to GitHub via image form. Backend downloads GitHub URLs and re-uploads to Shopify.

**Q: What if image upload fails?**
A: Backend logs the error and continues with other images. Product is still created, but that image is skipped.

**Q: How do I disable image optimization?**
A: Edit `compressImage()` function in server.js to adjust quality or width settings.

---

**Version:** 3.0  
**Release Date:** March 2026  
**Status:** Production Ready ✅
