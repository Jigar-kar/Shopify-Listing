# 📊 Complete Data Fields Reference

## All Supported Fields (Shopify Product Creation)

This document lists **all product data fields** that are accepted by the API and how they map to Shopify.

---

## 🏷️ Core Product Fields

### Product-Level Data

| Field           | Type   | Required | Example                     | Maps To                         |
| --------------- | ------ | -------- | --------------------------- | ------------------------------- |
| **title**       | String | ✅ Yes   | "Gold Ring"                 | Product title                   |
| **handle**      | String | ❌ No    | "gold-ring"                 | Product URL slug                |
| **description** | String | ❌ No    | "Premium jewelry..."        | Product description (body_html) |
| **type**        | String | ❌ No    | "Ring"                      | Product type                    |
| **vendor**      | String | ✅ Yes   | "Premium Rings"             | Brand/vendor name               |
| **category**    | String | ❌ No    | "Jewelry > Rings"           | Product category                |
| **tags**        | String | ❌ No    | "jewelry,gold,ring"         | Product tags (comma-separated)  |
| **seoTitle**    | String | ❌ No    | "Gold Ring - Premium..."    | SEO title (meta)                |
| **seoDesc**     | String | ❌ No    | "Buy premium gold rings..." | SEO description (meta)          |

---

## 🎨 Color Variant Fields

Each color variant includes:

| Field         | Type            | Required | Example                       |
| ------------- | --------------- | -------- | ----------------------------- |
| **colorName** | String          | ✅ Yes   | "Gold", "Silver", "Rose Gold" |
| **colorSlug** | String          | ❌ Auto  | "gold", "silver", "rose-gold" |
| **sku**       | String          | ✅ Yes   | "RING-GOLD-001"               |
| **price**     | String / Number | ✅ Yes   | "99.99"                       |
| **compareAt** | String / Number | ❌ No    | "149.99"                      |
| **inventory** | String / Number | ❌ No    | "10"                          |
| **images**    | Array           | ❌ No    | [{ src: "url" }, ...]         |

---

## 📦 Shopify Admin API Request Format

### What Gets Sent to Shopify

```json
{
  "product": {
    "title": "Gold Ring",
    "body_html": "<p>Premium gold ring...</p>",
    "vendor": "Premium Rings Co",
    "product_type": "Ring",
    "options": [{ "name": "Color" }],
    "variants": [
      {
        "option1": "Gold",
        "sku": "RING-GOLD-001",
        "price": "99.99",
        "compare_at_price": "149.99",
        "inventory_quantity": 10
      },
      {
        "option1": "Silver",
        "sku": "RING-SILVER-001",
        "price": "89.99",
        "compare_at_price": "129.99",
        "inventory_quantity": 15
      }
    ]
  }
}
```

---

## 📥 API Request Body

### Endpoint: POST /api/add-product

```json
{
  "product": {
    "title": "Premium Gold Ring",
    "handle": "premium-gold-ring",
    "type": "Ring",
    "category": "Jewelry > Rings",
    "description": "Handcrafted premium gold ring with elegant design",
    "tags": "jewelry,ring,gold,premium",
    "seoTitle": "Premium Gold Ring - Elegant Design",
    "seoDesc": "Shop premium gold rings with elegant design",
    "noSize": false,
    "sizes": [
      {
        "name": "10",
        "skuSuffix": "-SZ10",
        "price": "5.00",
        "inventory": "2",
        "compareAt": "8.00"
      }
    ],
    "colorVariants": [
      {
        "colorName": "Gold",
        "colorSlug": "gold",
        "sku": "RING-GOLD-001",
        "price": "99.99",
        "compareAt": "149.99",
        "inventory": "10",
        "images": [
          { "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." },
          { "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." }
        ]
      },
      {
        "colorName": "Silver",
        "colorSlug": "silver",
        "sku": "RING-SILVER-001",
        "price": "89.99",
        "compareAt": "129.99",
        "inventory": "15",
        "images": [{ "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." }]
      }
    ]
  },
  "vendor": "Premium Rings Co"
}
```

---

## 📤 API Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Product 'Premium Gold Ring' created successfully in Shopify with images",
  "product": {
    "id": 7234567890,
    "title": "Premium Gold Ring",
    "handle": "premium-gold-ring",
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

### Error Response (400/500)

```json
{
  "success": false,
  "error": "Product must have a title",
  "details": "Stack trace here (development mode only)"
}
```

---

## 🔄 Data Transformation Flow

### Input (Frontend) → Processing → Output (Shopify)

```
┌─────────────────────────────────────────────────┐
│  Frontend Form Data                             │
├─────────────────────────────────────────────────┤
│ Title: "Gold Ring"                              │
│ Type: "Ring"                                    │
│ Description: "Premium jewelry..."               │
│ Tags: "jewelry,gold"                            │
│ Vendor: "Premium Rings"                         │
│ Colors: [                                       │
│   { name: "Gold", sku: "R-G-1", price: 99.99 } │
│   { name: "Silver", sku: "R-S-1", price: 89.99}│
│ ]                                               │
│ Images: [url1, url2, url3]                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Backend           │
        │  Processing        │
        │                    │
        │  1. Transform data │
        │  2. Create product │
        │  3. Process images │
        │  4. Map variants   │
        └────────────┬───────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Shopify Product (Created)                      │
├─────────────────────────────────────────────────┤
│ ID: 7234567890                                  │
│ Title: "Gold Ring"                              │
│ Type: "Ring"                                    │
│ Description: "Premium jewelry..."               │
│ Vendor: "Premium Rings"                         │
│                                                 │
│ Variants:                                       │
│  1. Gold - SKU: R-G-1 - Price: $99.99          │
│  2. Silver - SKU: R-S-1 - Price: $89.99        │
│                                                 │
│ Images (in Shopify CDN):                        │
│  - gold-image-1.webp                            │
│  - gold-image-2.webp                            │
│  - silver-image-1.webp                          │
│                                                 │
│ Image Mapping:                                  │
│  - Gold variant → gold-image-1.webp             │
│  - Silver variant → silver-image-1.webp         │
└─────────────────────────────────────────────────┘
```

---

## 📋 CSV Headers Comparison

### What Fields Are Available from CSV

The system supports all these fields (matching Shopify CSV import format):

```
1. Handle
2. Title
3. Body (HTML)
4. Vendor
5. Product Category
6. Type
7. Tags
8. Published
9. Option1 Name
10. Option1 Value
11. Option2 Name
12. Option2 Value
13. Option3 Name
14. Option3 Value
15. Variant SKU
16. Variant Grams
17. Variant Inventory Tracker
18. Variant Inventory Qty
19. Variant Inventory Policy
20. Variant Fulfillment Service
21. Variant Price
22. Variant Compare At Price
23. Variant Requires Shipping
24. Variant Taxable
25. Barcode
26. Image Src
27. Image Position
28. SEO Title
29. SEO Description
30. Cost
31. Status
32. Collection
```

---

## 📊 Mapping: Frontend To Shopify API

### How Data Maps Through the System

```
Frontend Form Field      →    Server.js Field       →    Shopify API Field
─────────────────────────────────────────────────────────────────────────
Product Title            →    product.title        →    product.title
Product Type             →    product.type         →    product.product_type
Description              →    product.description  →    product.body_html
Vendor/Brand             →    vendor               →    product.vendor
Tags                     →    product.tags         →    product.tags (not sent currently)
─────────────────────────────────────────────────────────────────────────
Color Name               →    colorVariants[].colorName     →    variant.option1
SKU                      →    colorVariants[].sku          →    variant.sku
Price                    →    colorVariants[].price        →    variant.price
Compare At Price         →    colorVariants[].compareAt    →    variant.compare_at_price
Inventory Qty            →    colorVariants[].inventory    →    variant.inventory_quantity
─────────────────────────────────────────────────────────────────────────
Color Images             →    colorVariants[].images       →    product.images + variant mapping
```

---

## �️ Image Format & Processing

### Supported Image Input Formats

Images can be sent to the API in any of these formats:

| Format                    | Example                                    | Support        |
| ------------------------- | ------------------------------------------ | -------------- |
| **Base64 (Local Upload)** | `data:image/jpeg;base64,/9j/4AAQSkZJRg...` | ✅ Recommended |
| **Buffer (Local Upload)** | Binary buffer from FileReader              | ✅ Supported   |
| **External URL**          | `https://example.com/image.jpg`            | ⚠️ Deprecated  |

### ✅ Recommended: Local Base64 Upload

**How to get base64 from local file:**

```javascript
// HTML file input
<input type="file" id="imageInput" accept="image/*">

// JavaScript to convert to base64
const fileInput = document.getElementById('imageInput');
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    const base64String = e.target.result;
    console.log('Base64:', base64String);

    // Use in API like this:
    const image = { src: base64String };
  };

  reader.readAsDataURL(file);
});
```

**Then send to API:**

```json
{
  "colorVariants": [
    {
      "colorName": "Gold",
      "images": [{ "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..." }]
    }
  ]
}
```

### Image Processing Pipeline

Once uploaded, images go through:

1. **Parse Format**: Detect base64 or buffer
2. **Decompress**: Extract image data from encoding
3. **Validate**: Check valid image format (JPG, PNG, WebP, etc.)
4. **Resize**: Reduce to max 2000x2000px (maintains aspect ratio)
5. **Convert**: Transform to WebP format (modern, smaller)
6. **Compress**: Apply 80% quality (excellent balance)
7. **Strip Metadata**: Remove EXIF data for privacy
8. **Upload**: Send to Shopify CDN
9. **Map**: Attach to correct color variant

### Output Image Format

All images are **converted to WebP** during processing:

| Aspect         | Value                        |
| -------------- | ---------------------------- |
| **Format**     | WebP (modern standard)       |
| **Max Width**  | 2000px                       |
| **Max Height** | 2000px                       |
| **Quality**    | 80%                          |
| **File Size**  | 80-90% smaller than original |

### Example Compression Results

```
Original JPG: 2.5 MB  →  WebP: 250 KB  (90% reduction)
Original PNG: 1.8 MB  →  WebP: 165 KB  (91% reduction)
Original TIFF: 3.2 MB →  WebP: 290 KB  (91% reduction)
```

### Behind the Scenes

Backend functions handling images:

```javascript
// 1. Convert base64 to buffer
base64ToBuffer(base64String);

// 2. Compress with Sharp
compressImage(buffer, (maxWidth = 2000), (quality = 80));

// 3. Upload to Shopify CDN
uploadImageToShopify(productId, buffer, filename);

// 4. Map to variants
mapImagesToVariants(variants, imagesByColor);
```

---

## �🔧 Field Considerations

### **Required Fields**

- ✅ `product.title` - Product must have a name
- ✅ `product.colorVariants[*].colorName` - Color variants required
- ✅ `vendor` - Brand name required

### **Auto-Generated Fields**

- 🔄 `handle` - Auto-generated from title (slugified)
- 🔄 `colorSlug` - Auto-generated from color name (slugified)
- 🔄 `image_id` - Generated when image uploaded to Shopify

### **Optional Fields**

- ❌ `type` - Defaults to empty
- ❌ `description` - Defaults to empty
- ❌ `compareAt` - Only if sale price different
- ❌ `tags` - Only if product needs tags
- ❌ `seoTitle` / `seoDesc` - Only if SEO needed

---

## 💾 Enhanced API (Future)

To support **ALL CSV fields**, the API could be extended:

```json
{
  "product": {
    "title": "Gold Ring",
    "description": "...",
    "vendor": "Premium Rings",
    "type": "Ring",
    "category": "Jewelry",
    "tags": "gold,ring,jewelry",
    "seoTitle": "...",
    "seoDesc": "...",
    "published": true,
    "cost": "45.00",
    "status": "active",
    "collection": "Premium",

    "colorVariants": [
      {
        "colorName": "Gold",
        "sku": "RING-GOLD-001",
        "price": "99.99",
        "compareAt": "149.99",
        "inventory": "10",
        "grams": "5.5",
        "barcode": "1234567890123",
        "requiresShipping": true,
        "taxable": true,
        "inventoryPolicy": "deny",
        "fulfillmentService": "manual",
        "images": [...]
      }
    ]
  }
}
```

---

## ✅ Data Validation

### What Gets Validated

| Field         | Validation | Rule                              |
| ------------- | ---------- | --------------------------------- |
| title         | Required   | Not empty, not just whitespace    |
| vendor        | Required   | Not empty, not just whitespace    |
| colorName     | Required   | At least one variant needed       |
| colorVariants | Array      | Must be non-empty                 |
| images        | Array      | Optional, can be empty            |
| sku           | Unique     | No duplicate SKUs in same product |
| price         | Numeric    | Must be valid number              |
| inventory     | Numeric    | Must be valid integer             |

### Example Validation Errors

```json
{
  "success": false,
  "error": "Product must have a title"
}

{
  "success": false,
  "error": "Product must have at least one color variant"
}

{
  "success": false,
  "error": "Vendor name is required"
}
```

---

## 🚀 Complete Example

### Creating Jewelry with All Fields

```json
POST /api/add-product

{
  "product": {
    "title": "18K Gold Diamond Ring",
    "handle": "18k-gold-diamond-ring",
    "type": "Ring",
    "category": "Jewelry / Rings / Engagement",
    "description": "Beautiful 18K gold diamond engagement ring with GIA certified stones. Available in multiple sizes and colors.",
    "tags": "jewelry,ring,diamond,gold,engagement,luxury",
    "seoTitle": "18K Gold Diamond Engagement Ring | Premium Jewelry",
    "seoDesc": "Shop authentic 18K gold diamond engagement rings with GIA certification. Premium quality and design.",
    "colorVariants": [
      {
        "colorName": "Yellow Gold",
        "colorSlug": "yellow-gold",
        "sku": "RING-YG-001",
        "price": "1999.99",
        "compareAt": "2999.99",
        "inventory": "3",
        "images": [
          { "src": "https://cdn.example.com/ring-yg-1.jpg" },
          { "src": "https://cdn.example.com/ring-yg-2.jpg" },
          { "src": "https://cdn.example.com/ring-yg-3.jpg" }
        ]
      },
      {
        "colorName": "White Gold",
        "colorSlug": "white-gold",
        "sku": "RING-WG-001",
        "price": "2099.99",
        "compareAt": "3099.99",
        "inventory": "5",
        "images": [
          { "src": "https://cdn.example.com/ring-wg-1.jpg" },
          { "src": "https://cdn.example.com/ring-wg-2.jpg" }
        ]
      },
      {
        "colorName": "Rose Gold",
        "colorSlug": "rose-gold",
        "sku": "RING-RG-001",
        "price": "2149.99",
        "compareAt": "3149.99",
        "inventory": "2",
        "images": [
          { "src": "https://cdn.example.com/ring-rg-1.jpg" }
        ]
      }
    ]
  },
  "vendor": "Luxury Diamonds Inc"
}
```

### Response

```json
{
  "success": true,
  "message": "Product '18K Gold Diamond Ring' created successfully in Shopify with images",
  "product": {
    "id": 7234567890,
    "title": "18K Gold Diamond Ring",
    "handle": "18k-gold-diamond-ring",
    "variants_count": 3,
    "images_count": 6,
    "images_by_color": [
      {
        "color": "Yellow Gold",
        "imageIds": [1234567890, 1234567891, 1234567892]
      },
      {
        "color": "White Gold",
        "imageIds": [1234567893, 1234567894]
      },
      {
        "color": "Rose Gold",
        "imageIds": [1234567895]
      }
    ]
  }
}
```

---

## 🔮 Future Enhancements

Possible fields to add in future versions:

- [ ] Product collections
- [ ] Barcode/EAN support
- [ ] Cost field for inventory tracking
- [ ] Weight/Grams per variant
- [ ] Requires shipping flag
- [ ] Taxable flag
- [ ] Inventory tracking system
- [ ] Fulfillment service selection
- [ ] Product status (draft, active, archived)
- [ ] Video support (beyond one per color)
- [ ] 3D model support
- [ ] Seasonal settings
- [ ] Age restriction
- [ ] Requires selling plan

---

**Last Updated:** March 2026  
**Version:** 3.0
