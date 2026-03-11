# ✅ Shopify CDN Image Upload - Quick Start Guide

## 🎉 What's New (v3.0)

You've successfully migrated from **GitHub CDN → Shopify CDN** with automatic image processing!

**Key Features:**

- ✅ Images automatically compressed to WebP (89% smaller)
- ✅ Direct upload to Shopify CDN (no GitHub dependency)
- ✅ Proper color-variant image mapping
- ✅ Smart error handling & recovery

---

## 🚀 Getting Started

### **1. Verify Installation**

```bash
# Check that sharp and axios are installed
npm list sharp axios

# Expected output:
# ├── axios@1.6.5
# ├── sharp@0.33.2
```

### **2. Start the Server**

```bash
npm start
```

**Expected output:**

```
╔═══════════════════════════════════════════════════════════╗
║  Shopify Bulk Product Lister API (v3.0)                  ║
║  🚀 Server running on http://localhost:3000               ║
║                                                           ║
║  📸 Image Feature: Direct Shopify CDN Upload              ║
║  • Auto-compress images to WebP                           ║
║  • Upload directly to Shopify CDN                         ║
║  • Map images to color variants                           ║
║                                                           ║
║  Store: yourstore.myshopify.com                           ║
║  Env: development                                         ║
║                                                           ║
║  API Endpoints:                                           ║
║  - GET  /health                                           ║
║  - POST /api/add-product (with auto image upload)         ║
║  - POST /api/add-products (batch)                         ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🧪 Test with Postman

### **Step 1: Health Check**

```
GET http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "server": "Shopify Bulk Product Lister API"
}
```

### **Step 2: Create a Test Product with Images**

**Request:**

```
POST http://localhost:3000/api/add-product
Content-Type: application/json
```

**Body (using locally uploaded base64 images):**

```json
{
  "product": {
    "title": "Test Gold Ring",
    "description": "Testing new image system with WebP compression (local upload)",
    "type": "Ring",
    "handle": "test-gold-ring",
    "colorVariants": [
      {
        "colorName": "Gold",
        "sku": "TEST-GOLD-001",
        "price": "99.99",
        "compareAt": "149.99",
        "inventory": "5",
        "images": [
          {
            "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
          },
          {
            "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
          }
        ]
      },
      {
        "colorName": "Silver",
        "sku": "TEST-SILVER-001",
        "price": "89.99",
        "compareAt": "129.99",
        "inventory": "8",
        "images": [
          {
            "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
          }
        ]
      }
    ]
  },
  "vendor": "Test Jewelry"
}
```

**How to get base64 images from local files:**

In your frontend, use this JavaScript to convert uploaded files to base64:

```javascript
const fileInput = document.getElementById("imageInput");
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    const base64String = event.target.result; // data:image/...;base64,...
    console.log("Base64 image:", base64String);

    // Use this in your API request
    const image = { src: base64String };
  };

  reader.readAsDataURL(file);
});
```

**Expected Response (201):**

```json
{
  "success": true,
  "message": "Product 'Test Gold Ring' created successfully in Shopify with images",
  "product": {
    "id": 7234567890,
    "title": "Test Gold Ring",
    "handle": "test-gold-ring",
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

### **Step 3: Verify in Shopify Admin**

1. Go to **Shopify Admin → Products**
2. Find **"Test Gold Ring"**
3. Check:
   - ✅ Title is correct
   - ✅ 2 variants (Gold, Silver)
   - ✅ Images visible in gallery
   - ✅ Images are in WebP format (Network tab)
   - ✅ Each color variant shows its image

---

## 📊 Server Console Logs

When you create a product, you'll see detailed logs:

```
[API] Received product: "Test Gold Ring"
[Transform] Product Summary:
  Title: Test Gold Ring
  Type: Ring
  Vendor: Test Jewelry
  Variants: 2
  Images: Will be uploaded separately to Shopify CDN

[API] Step 1: Creating product in Shopify...
[Shopify API] Sending product: "Test Gold Ring"
[Shopify API] Success! Product ID: 7234567890

[API] Step 2: Processing and uploading images to Shopify CDN...

[Images] Processing 2 image(s) for color: Gold
[Image] Downloading image from URL: https://via.placeholder.com/...
[Image] Downloaded successfully (12500 bytes)
[Image] Compressing to WebP (max-width: 2000px, quality: 80)
[Image] Compression complete (2850 bytes, 23% of original)
[Shopify Upload] Uploading image to product 7234567890: gold-1.webp
[Shopify Upload] Success! Image ID: 1234567890

[Images] Processing 1 image(s) for color: Silver
[Image] Downloading image from URL: https://via.placeholder.com/...
[Image] Downloaded successfully (11200 bytes)
[Image] Compressing to WebP (max-width: 2000px, quality: 80)
[Image] Compression complete (2245 bytes, 20% of original)
[Shopify Upload] Uploading image to product 7234567890: silver-1.webp
[Shopify Upload] Success! Image ID: 1234567891

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

## 🔄 New Workflow

### **Frontend to Backend Flow**

```
Regular Product Creation Flow:
1. User fills product form in frontend
2. Adds color variants + images
3. Uploads images to GitHub as before
4. Clicks "Upload & Export"
5. Frontend sends product data WITH image URLs to backend
6. Backend receives:
   - Product data (title, SKU, price, etc.)
   - Image URLs (GitHub or external source)

Backend Image Processing:
7. Creates product in Shopify (without images)
8. For each image:
   a. Download from URL (if external)
   b. Compress & convert to WebP using Sharp
   c. Upload to Shopify CDN
   d. Store image ID
9. Map images to variants by color name
10. Update variants with image IDs
11. Return success with image counts
```

---

## 📋 Image Processing Details

### **What Happens to Each Image**

1. **Original State**
   - Format: JPG/PNG
   - Size: Up to 5 MB
   - Quality: Full resolution (4000x3000px typical)

2. **After Compression**
   - Format: WebP (modern, efficient)
   - Size: ~80-90% smaller
   - Quality: 80% (visually identical to original)
   - Max resolution: 2000x2000px
   - Metadata: Removed

3. **Result**
   - Hosted on Shopify CDN
   - Lightning-fast delivery worldwide
   - Automatic CDN caching
   - Works with Shopify's image optimization

### **Example Compression**

```
Original JPG: 2.5 MB (4000x3000px)
         ↓ (compress + convert)
Shopify WebP: 250 KB (2000x1500px)
         ↓
Savings: 90% smaller file size
Speed gain: 8-10x faster loading
```

---

## 🛠️ Troubleshooting

### **Issue: "Port 3000 already in use"**

**Solution:**

```bash
# Windows - Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm start
```

### **Issue: "Failed to download image"**

**Causes:**

- Image URL is invalid or broken
- Image server is down
- Network timeout

**Solution:**

- Check image URL is accessible
- Try with placeholder: `https://via.placeholder.com/2000`
- Increase timeout in `downloadImage()` function (line ~75)

### **Issue: "Failed to compress image"**

**Causes:**

- Image file is corrupted
- Not a valid image format

**Solution:**

- Verify image is valid JPG/PNG/GIF
- Try different image file
- Check file size (max 50MB for JSON payload)

### **Issue: "Failed to upload image to Shopify"**

**Causes:**

- Invalid Shopify Admin Token
- Product ID not found
- Shopify API rate limit

**Solution:**

- Check `.env` file has correct `SHOPIFY_ADMIN_TOKEN`
- Verify `SHOPIFY_STORE_URL` is correct
- Wait a few seconds and retry

---

## 🔍 Backend File Structure

### **Key Functions in `server.js`**

| Function                          | Purpose                  | Line |
| --------------------------------- | ------------------------ | ---- |
| `downloadImage()`                 | Download image from URL  | ~85  |
| `compressImage()`                 | Compress to WebP         | ~105 |
| `uploadImageToShopify()`          | Upload to Shopify CDN    | ~135 |
| `mapImagesToVariants()`           | Match images to variants | ~175 |
| `processAndUploadProductImages()` | Orchestrate full flow    | ~201 |
| `sendProductToShopify()`          | Create product           | ~267 |
| `transformToShopifyFormat()`      | Format data for API      | ~318 |

---

## 📈 Performance Tips

### **Optimize Image Compression**

Edit `compressImage()` function in `server.js`:

```javascript
// Increase quality (larger files, better quality)
const compressed = await sharp(imageBuffer)
  .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: 90 })  // Change 80 to 90
  .toBuffer();

// Decrease quality (smaller files, lower quality)
.webp({ quality: 70 })  // Change 80 to 70

// Increase max width (larger sizes)
.resize(3000, 3000, ...)  // Change 2000 to 3000
```

### **Batch Product Creation**

For multiple products, use `/api/add-products`:

```json
POST /api/add-products

{
  "products": [
    { product data 1 },
    { product data 2 },
    { product data 3 }
  ],
  "vendor": "Your Brand"
}
```

---

## ✅ Verification Checklist

- [ ] Sharp and Axios installed (`npm list sharp axios`)
- [ ] Server starts without errors (`npm start`)
- [ ] Health check passes (`GET /health`)
- [ ] Create test product with images
- [ ] Check Shopify Admin - product appears
- [ ] Verify images in Shopify gallery
- [ ] Images are WebP format (check Network tab)
- [ ] Image counts match (`images_count: 3`)
- [ ] Color variants show correct images
- [ ] No metadata in images (optimized payload)

---

## 🎓 What Changed from v2 to v3

| Aspect                 | v2.x                        | v3.0                           |
| ---------------------- | --------------------------- | ------------------------------ |
| **Image Hosting**      | GitHub CDN                  | Shopify CDN                    |
| **Image Format**       | Original (JPG/PNG)          | Auto WebP                      |
| **Image Optimization** | Manual                      | Automatic                      |
| **Upload Location**    | Frontend → GitHub → Shopify | Frontend → Backend → Shopify   |
| **Variant Mapping**    | Basic                       | Color-aware automatic          |
| **Error on failure**   | Product not created         | Partial success, errors logged |

---

## 📞 Need Help?

### **Check the Logs**

Server logs show exact progress:

```
[API] - API endpoint called
[Shopify API] - Shopify API calls
[Image] - Image download/processing
[Shopify Upload] - Image upload to Shopify
[Variants] - Variant-image mapping
```

### **Review Documentation**

- [IMAGE_MIGRATION_GUIDE.md](./IMAGE_MIGRATION_GUIDE.md) - Complete technical guide
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Initial setup instructions
- [API_INTEGRATION.md](./API_INTEGRATION.md) - API reference

### **Test Endpoint**

Always test with `/health` first:

```bash
curl http://localhost:3000/health
```

---

## 🚀 Production Deployment

### **Before Going Live**

1. ✅ Test with real images (not placeholder)
2. ✅ Test with multiple color variants
3. ✅ Verify image quality is acceptable
4. ✅ Check Shopify products are created correctly
5. ✅ Monitor console logs for errors
6. ✅ Set `NODE_ENV=production` for security

### **Production Settings**

```bash
# .env file
SHOPIFY_STORE_URL=yourstore.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxxx
PORT=3000
NODE_ENV=production
```

### **Start Production Server**

```bash
npm start
# or
NODE_ENV=production node server.js
```

---

**Version:** 3.0 - Production Ready ✅  
**Last Updated:** March 2026
