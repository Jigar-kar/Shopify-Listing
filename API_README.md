# 🎉 Shopify Bulk Product Lister — Now with Direct Shopify API Integration!

> **Version 2.1.0** — Direct Shopify Admin API Integration ⚡

A production-ready web application that creates Shopify products directly with the Admin API — **no CSV export needed!**

## 🚀 New Feature: Direct Shopify API

Instead of manually exporting a CSV and importing it into Shopify, your products now go **directly** to your Shopify store in seconds!

```
Before:  Product Data → CSV Download → Manual Upload  ⏱️ 5-10 min
After:   Product Data → Shopify API    ✓ Auto Created ⏱️ 2-3 sec
```

---

## ✨ Features

### Core Features

- ✅ **Direct Shopify Product Creation** via Admin API
- ✅ **Bulk Product Upload** with variants and images
- ✅ **GitHub Image Repository** support (raw URLs preserved)
- ✅ **Product Variants** (colors, sizes, pricing)
- ✅ **Automatic Data Transformation** to Shopify format
- ✅ **Error Handling** with detailed messages
- ✅ **Fallback to CSV** export if needed
- ✅ **Google Sheets Integration** (optional)

### Technology Stack

- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **API**: Shopify Admin REST API (2024-01)
- **Storage**: GitHub (images), LocalStorage (config)

---

## 📦 What's New (Version 2.1)

| Component                | Status     | Details                                                   |
| ------------------------ | ---------- | --------------------------------------------------------- |
| Backend Server           | ✅ NEW     | `server.js` - Express server with Shopify API integration |
| Frontend API Integration | ✅ UPDATED | `app.js` - New functions for backend communication        |
| Setup Guide              | ✅ NEW     | `SETUP_GUIDE.md` - Complete step-by-step instructions     |
| API Documentation        | ✅ NEW     | `API_INTEGRATION.md` - Technical deep-dive                |
| Dependencies             | ✅ NEW     | `package.json` - Express, CORS, dotenv                    |
| Configuration            | ✅ NEW     | `.env` - Secure credential storage                        |

---

## 🎯 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Shopify API Token

**Shopify Admin:**

1. Settings → Apps and integrations → Develop apps
2. Create app → Enable `write_products` and `read_products` scopes
3. Generate token (starts with `shpat_`)

### 3. Create .env File

Copy `.env.example` → `.env` and add your credentials:

```
SHOPIFY_STORE_URL=yourstore.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxx
PORT=3000
```

### 4. Start Backend

```bash
npm start
```

Expected output:

```
🚀 Server running on http://localhost:3000
Store: yourstore.myshopify.com
```

### 5. Open Frontend

1. Open `index.html` in browser
2. Settings → Enable "Direct Shopify API"
3. Enter API URL: `http://localhost:3000/api/add-product`
4. Save ✓

### 6. Create a Product

1. Add product data (title, variant, image, etc.)
2. Click "Upload & Export"
3. Wait ~2 seconds
4. ✓ Product appears in Shopify!

---

## 📁 Project Structure

```
Shopify-Listing/
│
├── 🚀 BACKEND
│   ├── server.js          ← Express server (NEW)
│   ├── package.json       ← Dependencies (NEW)
│   └── .env               ← Credentials (NEW)
│
├── 🌐 FRONTEND
│   ├── index.html         ← Web UI
│   ├── app.js             ← JavaScript logic (UPDATED)
│   └── styles.css         ← Styling
│
├── 📚 DOCUMENTATION
│   ├── SETUP_GUIDE.md              ← Setup instructions (NEW)
│   ├── API_INTEGRATION.md          ← Technical docs (NEW)
│   ├── IMPLEMENTATION_SUMMARY.md   ← What changed (NEW)
│   ├── README.md                   ← Project info
│   └── google-apps-script.js       ← Google Sheets code
│
└── 🔧 CONFIG
    ├── .env.example       ← Template (NEW)
    ├── .gitignore         ← Git rules (NEW)
    └── _fix_css.py        ← Utility
```

---

## 🔄 How It Works

### Data Flow Diagram

```
USER BROWSER
    │ Fill product form
    ▼
┌─────────────────────┐
│ Frontend (app.js)   │
│ - Collect data      │
│ - Upload images     │
│   to GitHub         │
└──────────┬──────────┘
           │ POST /api/add-product + product JSON
           ▼
┌──────────────────────────┐
│ Backend (server.js)      │
│ - Validate product       │
│ - Transform data         │
│ - Call Shopify API       │
└──────────┬───────────────┘
           │ POST + X-Shopify-Access-Token
           ▼
┌──────────────────────┐
│ Shopify Admin API    │
│ /admin/api/2024-01/  │
│ products.json        │
└──────────┬───────────┘
           │ ✓ Product Created!
           ▼
SHOPIFY STORE
    │ New product visible
    ▼
SUCCESS ✓
```

### Transformation Example

**Your Product Data:**

```javascript
{
  title: "Silver Ring",
  colorVariants: [{
    colorName: "Silver",
    price: "49.99",
    sku: "SR-001",
    inventory: "10",
    images: [{ src: "https://raw.githubusercontent.com/..." }]
  }]
}
```

**Transformed to Shopify Format:**

```json
{
  "product": {
    "title": "Silver Ring",
    "body_html": "...",
    "vendor": "My Brand",
    "product_type": "Ring",
    "variants": [
      {
        "option1": "Silver",
        "price": "49.99",
        "sku": "SR-001",
        "inventory_quantity": 10
      }
    ],
    "images": [
      {
        "src": "https://raw.githubusercontent.com/..."
      }
    ],
    "options": [{ "name": "Color" }]
  }
}
```

---

## 📖 Documentation

### For Getting Started

👉 **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** — Complete setup instructions with screenshots

### For Technical Details

👉 **[API_INTEGRATION.md](./API_INTEGRATION.md)** — Architecture, data flow, extending, troubleshooting

### For Understanding Changes

👉 **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** — What changed and why

### For Original Project Info

👉 **[README.md](./README.md)** — Original project documentation

---

## 🔐 Security

### ✅ Secure by Default

- Environment variables stored in `.env` (not committed)
- API token never exposed to frontend
- CORS configured for cross-origin requests
- Input validation on all endpoints

### 🛡️ Best Practices

1. **Keep `.env` secret** — Add to `.gitignore` (already done)
2. **Don't share token** — Regenerate if accidentally exposed
3. **Use HTTPS in production** — Secure all API calls
4. **Rotate credentials** — Periodically regenerate Shopify token

---

## 🧪 Testing

### Test the API Health

```bash
curl http://localhost:3000/health
# Response: { "status": "ok", "server": "Shopify Bulk Product Lister API" }
```

### Test Product Creation

```bash
curl -X POST http://localhost:3000/api/add-product \
  -H "Content-Type: application/json" \
  -d '{
    "product": {
      "title": "Test Ring",
      "type": "Ring",
      "colorVariants": [{
        "colorName": "Silver",
        "colorSlug": "silver",
        "sku": "TEST-001",
        "price": "50",
        "inventory": "10",
        "images": [
          { "src": "https://example.com/image.jpg" }
        ]
      }]
    },
    "vendor": "Test Brand"
  }'
```

---

## 🆘 Troubleshooting

### Backend Issues

| Problem                        | Solution                         |
| ------------------------------ | -------------------------------- |
| "Cannot find module"           | Run `npm install`                |
| "SHOPIFY_STORE_URL is not set" | Create `.env` file               |
| "Connection refused"           | Make sure `npm start` is running |
| "Invalid token"                | Check token starts with `shpat_` |

### Frontend Issues

| Problem                  | Solution                                    |
| ------------------------ | ------------------------------------------- |
| "API not reachable"      | Verify backend is running on port 3000      |
| "CORS error"             | Check frontend Settings has correct API URL |
| "Product creation fails" | Check error message in progress modal       |

### Shopify API Issues

| Problem                      | Solution                                |
| ---------------------------- | --------------------------------------- |
| "write_products not granted" | Reconfigure app scopes in Shopify Admin |
| "Access denied"              | Verify token and re-generate if needed  |
| "Rate limit exceeded"        | Wait a moment and retry                 |

---

## 🚀 Deployment

### Deploy to Cloud

The backend can be deployed to:

- **Heroku** — Free tier with `Procfile`
- **AWS Lambda** — Serverless execution
- **DigitalOcean App Platform** — Simple Node.js hosting
- **Railway.app** — GitHub integration
- **Render** — Auto-deploys from GitHub

### Example: Deploy to Railway.app

1. Push code to GitHub (skip `.env`)
2. Go to railway.app → Create Project
3. Connect GitHub repo
4. Add environment variables (from `.env`)
5. Deploy ✓

---

## 📊 Compared to CSV

| Aspect             | CSV Export    | Direct API |
| ------------------ | ------------- | ---------- |
| **Speed**          | 5-10 min      | 2-3 sec    |
| **Manual Steps**   | 3-4 steps     | 0 steps    |
| **Error Handling** | Manual review | Automatic  |
| **Batch Support**  | Yes           | Yes        |
| **Inventory Sync** | Manual        | Possible   |
| **Variants**       | Supported     | Supported  |
| **Images**         | Supported     | Supported  |

---

## 🔄 Modes

### Mode 1: Direct Shopify API (NEW - Default)

```
Product → API → Shopify ✓ Products created automatically
```

### Mode 2: CSV Export (Legacy - Available)

```
Product → CSV Download → Manual Upload → Shopify
```

**Switch modes** in Settings (Frontend):

- Toggle: "Use Direct Shopify API" on/off
- URL: `http://localhost:3000/api/add-product` (for API mode)

---

## 📈 Features Roadmap

### Current (v2.1)

- ✅ Direct product creation
- ✅ Batch product support
- ✅ Error handling
- ✅ Fallback to CSV

### Planned (v2.2+)

- 🔄 Product update support
- 🔄 Bulk inventory sync
- 🔄 Variant management UI
- 🔄 API key authentication
- 🔄 Rate limiting protection
- 🔄 Webhook support

---

## 📝 API Reference

### POST /api/add-product

Creates a single product in Shopify

**Request Body:**

```json
{
  "product": {
    "title": "Product Name",
    "type": "Category",
    "description": "Product description",
    "colorVariants": [
      {
        "colorName": "Color",
        "colorSlug": "color-slug",
        "sku": "SKU-001",
        "price": "49.99",
        "compareAt": "99.99",
        "inventory": "10",
        "images": [{ "src": "https://..." }]
      }
    ]
  },
  "vendor": "Brand Name"
}
```

**Response (Success - 201):**

```json
{
  "success": true,
  "message": "Product 'Name' created successfully in Shopify",
  "product": {
    "id": 9876543210,
    "title": "Product Name",
    "handle": "product-name",
    "variants_count": 1,
    "images_count": 1
  }
}
```

### GET /health

Health check endpoint

**Response:**

```json
{
  "status": "ok",
  "server": "Shopify Bulk Product Lister API"
}
```

---

## 🎯 Use Cases

✅ **Jewelry Stores** — Bulk upload product lines with multiple colors and sizes  
✅ **Clothing Brands** — Create variants automatically (XS, S, M, L, etc.)  
✅ **Print-on-Demand** — Batch upload thousands of SKUs  
✅ **Dropshipping** — Sync inventory directly from supplier  
✅ **Multi-Channel** — Create once, sell everywhere

---

## 🤝 Contributing

To extend or customize:

1. **Backend enhancements**: Edit `server.js`
2. **Frontend updates**: Edit `app.js`
3. **API methods**: Add to `transformToShopifyFormat()`
4. **Error handling**: Extend validation logic

See [API_INTEGRATION.md](./API_INTEGRATION.md) for code examples.

---

## 📞 Support

### Resources

- 📖 **Setup Guide**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- 🔧 **Technical Docs**: [API_INTEGRATION.md](./API_INTEGRATION.md)
- 🎯 **Summary**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- 🛍️ **Shopify API**: https://shopify.dev/api/admin-rest

### Debug Tips

1. Check browser console (F12) for frontend errors
2. Check terminal output for backend errors
3. Use `curl` to test API endpoints directly
4. Enable `DEBUG=true npm start` for verbose logging

---

## 📄 License

MIT License — See individual file headers for details

---

## 🎉 What's Changed (v2.0 → v2.1)

### Files Added

- ✨ `server.js` — Backend Express server
- ✨ `package.json` — Node.js dependencies
- ✨ `.env.example` — Configuration template
- ✨ `.gitignore` — Git ignore rules
- ✨ `SETUP_GUIDE.md` — Setup instructions
- ✨ `API_INTEGRATION.md` — Technical documentation
- ✨ `IMPLEMENTATION_SUMMARY.md` — Change summary

### Files Updated

- 📝 `app.js` — Added API integration functions
- 📝 `README.md` — This file

### Files Unchanged

- ✓ `index.html` — UI remains the same
- ✓ `styles.css` — Styling unchanged
- ✓ `google-apps-script.js` — GAS code unchanged

### Breaking Changes

- ❌ **None!** Fully backward compatible

---

## 🏁 Getting Started

**First time?** Start here: **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**

**Want details?** Read: **[API_INTEGRATION.md](./API_INTEGRATION.md)**

**Need quick ref?** See: **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**

---

## ✨ Credits

- **Original Author**: Jigar-kar
- **Enhancement**: Direct Shopify Admin API Integration (v2.1)
- **Tech Stack**: Express.js, Shopify Admin REST API, GitHub API

---

## 🎊 Ready to Go?

1. ✅ Run `npm install`
2. ✅ Create `.env` file with Shopify credentials
3. ✅ Run `npm start`
4. ✅ Open `index.html`
5. ✅ Create your first product!

**Enjoy faster product creation! 🚀**

---

**Questions?** Check the troubleshooting section or read the full documentation files.

**Found a bug?** Please report it with details about your setup and error messages.

**Want to contribute?** Fork the repo and submit a pull request!

---

**Happy selling! 🛍️**
