# 🔗 Shopify Direct API Integration — Technical Documentation

This document explains how the Shopify Direct API integration works, how to extend it, and troubleshooting information.

---

## 📐 Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Browser)                        │
│                      index.html + app.js                       │
├────────────────────────────────────────────────────────────────┤
│ • Collect product data (title, variants, images)               │
│ • Upload images to GitHub                                      │
│ • Attach image URLs to product data                            │
│ • Send to backend API                                          │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS POST
                           │ /api/add-product
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                   │
│                      server.js                                 │
├────────────────────────────────────────────────────────────────┤
│ • Receive product JSON                                         │
│ • Validate data structure                                      │
│ • Transform to Shopify Admin API format                        │
│ • Send to Shopify with Admin token                             │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS POST
                           │ X-Shopify-Access-Token
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                   SHOPIFY ADMIN API                            │
│            POST /admin/api/2024-01/products.json               │
├────────────────────────────────────────────────────────────────┤
│ • Create product with variants                                 │
│ • Attach images                                                │
│ • Return product ID and details                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📦 Data Flow & Transformation

### Phase 1: Frontend Collects Data

**Product object structure (from collectProductData()):**

```javascript
{
  title: "Silver Ring",
  handle: "silver-ring",
  type: "Ring",
  category: "Jewelry",
  description: "Premium silver jewelry",
  tags: "gift, luxury",
  seoTitle: "Elegant Silver Ring",
  seoDesc: "Beautiful silver ring for any occasion",
  noSize: false,
  sizes: [
    { name: "8", skuSuffix: "-8", inventory: "5", price: "49.99" },
    { name: "9", skuSuffix: "-9", inventory: "3", price: "49.99" }
  ],
  colorVariants: [
    {
      colorName: "Silver",
      colorSlug: "silver",
      sku: "SR-001",
      price: "49.99",
      compareAt: "99.99",
      inventory: "10",
      images: [
        { src: "data:image/jpeg;base64,..." },
        { src: "..." }
      ],
      videoFile: File,
      videoCard: DOM Element
    },
    {
      colorName: "Rose Gold",
      colorSlug: "rose-gold",
      ...
    }
  ]
}
```

### Phase 2: Images Upload to GitHub

**Using GitHub API:**

```bash
PUT https://api.github.com/repos/{user}/{repo}/contents/product-images/{handle}/{color}/{filename}
Authorization: token {GITHUB_TOKEN}
```

**Result:** Image URLs are stored in `uploadedImageMap`:

```javascript
uploadedImageMap = {
  "silver-ring": {
    silver: [
      "https://raw.githubusercontent.com/user/repo/main/product-images/silver-ring/silver/1234_ring_silver.jpg",
      "https://raw.githubusercontent.com/user/repo/main/product-images/silver-ring/silver/1235_ring_silver_alt.jpg",
    ],
  },
};
```

### Phase 3: Frontend Enriches Product Data

**Using `attachImageURLsToProduct()`:**

```javascript
const enrichedProduct = {
  title: "Silver Ring",
  handle: "silver-ring",
  type: "Ring",
  description: "Premium silver jewelry",
  colorVariants: [
    {
      colorName: "Silver",
      colorSlug: "silver",
      sku: "SR-001",
      price: "49.99",
      compareAt: "99.99",
      inventory: "10",
      images: [
        { src: "https://raw.githubusercontent.com/..." }, // ← GitHub URL
        { src: "https://raw.githubusercontent.com/..." },
      ],
    },
  ],
};
```

### Phase 4: Backend Transforms to Shopify Format

**Using `transformToShopifyFormat()`:**

Frontend product JSON → Shopify Admin API format

**Input:**

```javascript
{
  title: "Silver Ring",
  type: "Ring",
  description: "Premium silver jewelry",
  colorVariants: [
    {
      colorName: "Silver",
      price: "49.99",
      compareAt: "99.99",
      sku: "SR-001",
      inventory: "10",
      images: [
        { src: "https://raw.githubusercontent.com/..." }
      ]
    }
  ]
}
```

**Output (Shopify format):**

```javascript
{
  "product": {
    "title": "Silver Ring",
    "body_html": "<p>Premium silver jewelry</p>",
    "vendor": "My Jewels",
    "product_type": "Ring",
    "variants": [
      {
        "option1": "Silver",
        "price": "49.99",
        "compare_at_price": "99.99",
        "sku": "SR-001",
        "inventory_quantity": 10
      }
    ],
    "images": [
      { "src": "https://raw.githubusercontent.com/..." }
    ],
    "options": [
      { "name": "Color" }
    ]
  }
}
```

### Phase 5: Backend Sends to Shopify

**HTTP Request:**

```http
POST https://yourstore.myshopify.com/admin/api/2024-01/products.json HTTP/1.1
Content-Type: application/json
X-Shopify-Access-Token: shpat_xxxxx

{ "product": { ... } }
```

**Success Response:**

```javascript
{
  "product": {
    "id": 9876543210,
    "title": "Silver Ring",
    "handle": "silver-ring",
    "vendor": "My Jewels",
    "product_type": "Ring",
    "body_html": "<p>Premium silver jewelry</p>",
    "variants": [
      {
        "id": 123456789,
        "option1": "Silver",
        "price": "49.99",
        "sku": "SR-001",
        "inventory_quantity": 10
      }
    ],
    "images": [
      {
        "id": 111111111,
        "src": "https://cdn.shopify.com/s/files/1/..."
      }
    ]
  }
}
```

---

## 🔑 Key Functions

### Frontend Functions

#### `sendProductToShopifyAPI(productData, vendor, apiUrl)`

Sends a product to the backend API.

```javascript
// Usage
const response = await sendProductToShopifyAPI(
  productData,
  "My Jewels",
  "http://localhost:3000/api/add-product",
);
console.log(response.product.id); // ← Shopify product ID
```

#### `attachImageURLsToProduct(productData, uploadedImageMap)`

Replaces local Base64 image data with GitHub URLs.

```javascript
// Usage
const enrichedProduct = attachImageURLsToProduct(productData, uploadedImageMap);
// Now productData.colorVariants[0].images contains .src URLs from GitHub
```

### Backend Functions

#### `sendProductToShopify(shopifyProduct)`

Sends the transformed product to Shopify Admin API.

```javascript
// Usage (inside server.js)
const response = await sendProductToShopify({
  product: {
    title: "Silver Ring",
    ...
  }
});
```

#### `transformToShopifyFormat(productData, vendor)`

Transforms frontend product data to Shopify Admin API format.

```javascript
// Usage
const shopifyProduct = transformToShopifyFormat(productData, "My Jewels");
// shopifyProduct.product.title === "Silver Ring"
// shopifyProduct.product.variants[0].price === "49.99"
```

---

## 🧪 Testing the API

### Using curl

```bash
# Test single product upload
curl -X POST http://localhost:3000/api/add-product \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "title": "Test Ring",
      "description": "A test product",
      "type": "Ring",
      "colorVariants": [
        {
          "colorName": "Silver",
          "colorSlug": "silver",
          "sku": "TEST-001",
          "price": "50",
          "inventory": "10",
          "images": [
            { "src": "https://example.com/image.jpg" }
          ]
        }
      ]
    },
    "vendor": "Test Vendor"
  }'
```

### Using Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/add-product`
3. **Headers:**
   ```
   Content-Type: application/json
   ```
4. **Body (raw JSON):**
   ```json
   {
     "product": { ... },
     "vendor": "Test Vendor"
   }
   ```

### Using Node.js

```javascript
const response = await fetch('http://localhost:3000/api/add-product', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product: { ... },
    vendor: "Test Vendor"
  })
});
const data = await response.json();
console.log(data);
```

---

## ⚙️ Configuration

### Environment Variables

| Variable              | Required | Example                 | Purpose                            |
| --------------------- | -------- | ----------------------- | ---------------------------------- |
| `SHOPIFY_STORE_URL`   | ✅ Yes   | `mystore.myshopify.com` | Your Shopify store domain          |
| `SHOPIFY_ADMIN_TOKEN` | ✅ Yes   | `shpat_xxxxx`           | Admin API access token             |
| `PORT`                | ❌ No    | `3000`                  | Server port (default: 3000)        |
| `NODE_ENV`            | ❌ No    | `development`           | Environment type                   |
| `FRONTEND_URL`        | ❌ No    | `*`                     | CORS origin (allow all by default) |

### LocalStorage (Frontend)

| Key                     | Type   | Example                                 |
| ----------------------- | ------ | --------------------------------------- |
| `shopify_bulk_config`   | JSON   | GitHub + Sheets config                  |
| `shopify_bulk_settings` | JSON   | Inventory defaults                      |
| `use_shopify_api`       | String | `"true"` or `"false"`                   |
| `shopify_api_url`       | String | `http://localhost:3000/api/add-product` |

---

## 🔒 Security Considerations

### 1. Token Protection

- **DO**: Store `SHOPIFY_ADMIN_TOKEN` in `.env` (not in code)
- **DO**: Add `.env` to `.gitignore`
- **DON'T**: Commit `.env` to version control
- **DON'T**: Share or log the full token

### 2. API Rate Limiting

Shopify has rate limits:

- **REST API:** 2 requests/second (4 concurrent)
- **Recommended:** Add batch delays between requests

```javascript
// Add delay between products
for (const product of products) {
  await sendProductToShopify(product);
  await new Promise((r) => setTimeout(r, 500)); // 500ms delay
}
```

### 3. CORS Configuration

**Current configuration allows all origins:**

```javascript
cors({
  origin: process.env.FRONTEND_URL || "*",
});
```

**For production, restrict CORS:**

```javascript
cors({
  origin: process.env.FRONTEND_URL, // e.g., https://yourdomain.com
  credentials: true,
});
```

### 4. Input Validation

The API validates:

- ✅ Product title is not empty
- ✅ Vendor name is provided
- ✅ At least one color variant exists
- ✅ Images have valid URLs

---

## 🚨 Error Handling

### Shopify API Errors

The backend catches and formats Shopify API errors:

```javascript
{
  "success": false,
  "error": "Your app has not been configured to have write access to the 'products' resource."
}
```

**Common Shopify errors:**
| Error | Cause | Solution |
|-------|-------|----------|
| "write_products" not granted | Scopes not set | Reconfigure app scopes in Shopify |
| Access denied | Invalid token | Check token and re-generate if needed |
| Invalid product | Missing fields | Verify all required fields are present |
| Rate limit exceeded | Too many requests | Add delays between requests |

### Frontend Errors

The progress modal shows error details:

- ✓ Success messages in green
- ✗ Error messages in red
- ⚠ Warning messages in yellow

---

## 📈 Extending the Backend

### Add Batch Endpoints

```javascript
app.post("/api/add-products", async (req, res) => {
  const { products, vendor } = req.body;
  const results = [];

  for (const product of products) {
    const shopifyProduct = transformToShopifyFormat(product, vendor);
    const response = await sendProductToShopify(shopifyProduct);
    results.push({
      title: product.title,
      id: response.product.id,
      status: "created",
    });
  }

  res.json({ success: true, results });
});
```

### Add Authentication

```javascript
function validateAPIKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/api/add-product", validateAPIKey, async (req, res) => {
  // ...
});
```

### Add Logging

```javascript
const fs = require("fs").promises;

async function logRequest(product, result, timestamp) {
  const log = {
    timestamp,
    title: product.title,
    shopifyId: result.product.id,
    status: "success",
  };
  await fs.appendFile("logs/products.json", JSON.stringify(log) + "\n");
}
```

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
# Response: { "status": "ok", "server": "Shopify Bulk Product Lister API" }
```

### Server Logs

Watch for:

- ✅ Successful product creations (with ID)
- ⚠️ Validation errors
- ✗ Network or Shopify API errors
- ⏱️ Request timing

Example log output:

```
[API] Received product: "Silver Ring"
[API] Transformed to Shopify format: { "product": { ... } }
[Shopify API] Sending product: "Silver Ring"
[Shopify API] URL: https://mystore.myshopify.com/admin/api/2024-01/products.json
[Shopify API] Success! Product ID: 9876543210
```

---

## 🔄 Sync & Updates

### Current Limitations

- Creates new products only
- Does NOT update existing products
- Does NOT merge with drafts

### Future Enhancements

1. **Product Update**: `PATCH /admin/api/2024-01/products/{id}.json`
2. **Upsert Logic**: Check if product exists, update if so
3. **Batch Deletion**: Remove old products before bulk import
4. **Inventory Sync**: Update only inventory quantities

---

## 📝 API Response Examples

### Success: Single Product Created

```json
{
  "success": true,
  "message": "Product 'Silver Ring' created successfully in Shopify",
  "product": {
    "id": 9876543210,
    "title": "Silver Ring",
    "handle": "silver-ring",
    "variants_count": 2,
    "images_count": 1
  }
}
```

### Error: Missing Vendor

```json
{
  "success": false,
  "error": "Vendor name is required"
}
```

### Error: Shopify API Failure

```json
{
  "success": false,
  "error": "Your app has not been configured to have write access to the 'products' resource."
}
```

---

## 🧑‍💻 Development Workflow

### Local Testing

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start frontend (optional)
python -m http.server 8000

# Terminal 3: Run tests
npm test
```

### Debug Mode

Add debug logging:

```javascript
// In server.js
const DEBUG = process.env.DEBUG === "true";

if (DEBUG) {
  console.log("Full request body:", JSON.stringify(shopifyProduct, null, 2));
  console.log("Response status:", response.status);
}
```

Run with debug:

```bash
DEBUG=true npm start
```

---

This technical guide covers the complete integration architecture and enables extending, debugging, and optimizing the Shopify API integration.
