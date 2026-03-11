# 🚀 Shopify Direct API Integration Setup Guide

This guide explains how to set up the **Shopify Bulk Product Lister** with **direct Shopify Admin API** integration to automatically create products in your Shopify store.

---

## 📋 Prerequisites

Before you start, you'll need:

1. **Node.js** (version 16+) — [Download here](https://nodejs.org/)
2. **Shopify Store** with Admin API access
3. **Shopify Admin API Token** (see steps below)
4. **Basic command-line knowledge**

---

## 🔧 Step 1: Create a Shopify Admin API Token

This token allows the backend server to send products directly to your Shopify store.

### 1.1 Access Shopify Admin

1. Go to **Shopify Admin** → `https://yourstore.myshopify.com/admin`
2. Sign in with your Shopify account

### 1.2 Create a Custom App

1. Navigate to **Settings** → **Apps and integrations** → **Develop apps**
2. Click **Create an app**
3. Name it: **"Bulk Product Lister"**
4. Click **Create app**

### 1.3 Configure Admin API Scopes

1. In your app, go to the **Configuration** tab
2. Scroll to **Admin API scopes**
3. Enable these scopes:
   - `write_products` (to create products)
   - `read_products` (to verify creation)
4. Click **Save** at the top

### 1.4 Generate the Access Token

1. Go to the **API credentials** tab
2. Under **Admin API access tokens**, click **Reveal token**
3. **Copy and save this token** — starts with `shpat_`
   ```
   shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

> ⚠️ **IMPORTANT**: This token has admin access to your store. Keep it secret!

### 1.5 Install & Activate the App

1. Click the **Configuration** tab again
2. Click **Install app** at the top

---

## ⚙️ Step 2: Set Up Environment Variables

The backend server needs your Shopify credentials to authenticate API requests.

### 2.1 Create .env File

In the project root directory (where `server.js` is located), create a file named `.env`:

```
SHOPIFY_STORE_URL=yourstore.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
NODE_ENV=development
```

**Replace:**

- `yourstore.myshopify.com` → Your actual Shopify store URL (without `https://`)
- `shpat_xxx...` → Your Admin API token from Step 1.4

### 2.2 Verify .env Security

Add `.env` to `.gitignore` (if using git) to prevent committing sensitive data:

```
echo ".env" >> .gitignore
```

---

## 📦 Step 3: Install Dependencies

### 3.1 Install Backend Packages

Open a terminal in the project directory and run:

```bash
npm install
```

This installs:

- **express** — Web server framework
- **cors** — Cross-origin request handling
- **dotenv** — Environment variable management

---

## 🚀 Step 4: Start the Backend Server

### 4.1 Run the Server

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║  Shopify Bulk Product Lister API                          ║
║  🚀 Server running on http://localhost:3000               ║
║                                                           ║
║  Store: yourstore.myshopify.com                           ║
║  Env: development                                         ║
║                                                           ║
║  API Endpoints:                                           ║
║  - GET  /health                                           ║
║  - POST /api/add-product                                  ║
║  - POST /api/add-products                                 ║
╚═══════════════════════════════════════════════════════════╝
```

✅ **Server is running!**

> **Tip:** Keep this terminal open while testing. In a separate terminal, continue with the frontend setup.

---

## 🌐 Step 5: Configure the Frontend

The web interface needs to know where the backend server is.

### 5.1 Open the Web App

1. Open `index.html` in your browser
   - `file:///.../Shopify-Listing/index.html`
   - OR run a local server: `python -m http.server 8000`

### 5.2 Enable Shopify API Mode

The frontend has toggle options in the **Settings** page:

1. Click **Settings** in the sidebar
2. Scroll down to **"Upload Mode"** section
3. Select **"Direct Shopify API"** (instead of CSV Export)
4. Enter your **API Server URL**: `http://localhost:3000/api/add-product`
5. Click **Save**

✅ **Configured!**

---

## 🎯 Step 6: Test the Full Workflow

### 6.1 Add a Test Product

1. Go back to **Product Lister**
2. Fill in a sample product:
   - **Title**: "Test Silver Ring"
   - **Type**: "Ring"
   - **Vendor**: "My Jewels" (shown in Settings)
   - **Description**: "Premium silver jewelry"
   - **Color**: "Silver"
   - **Price**: "49.99"
   - **SKU**: "SR-001"
   - **Inventory**: "10"
   - **Image**: Upload a sample image

### 6.2 Upload to Shopify

1. Click **Upload & Export** button
2. Monitor the progress modal:
   - Phase 1: Images upload to GitHub ✓
   - Phase 2: Product sends to Shopify ✓
3. You should see: `✓ Product created in Shopify (ID: 123456789)`

### 6.3 Verify in Shopify

1. Go to `https://yourstore.myshopify.com/admin/products`
2. Your new product should appear at the top of the list!
3. Check that the title, price, SKU, and images are correct

---

## 🔄 How It Works

```
┌─────────────────┐
│  Frontend UI    │
│  (index.html)   │
└────────┬────────┘
         │ Click "Upload & Export"
         ▼
┌──────────────────────┐
│ 1. Upload Images     │
│    to GitHub         │
│ 2. Collect Product   │
│    Data              │
└────────┬─────────────┘
         │ Send JSON
         ▼
┌────────────────────────────┐
│  Backend Server            │
│  (server.js)               │
│                            │
│ POST /api/add-product      │
│ - Validate data            │
│ - Transform to Shopify     │
│   API format               │
└────────┬───────────────────┘
         │ Forward request
         ▼
┌────────────────────────────┐
│ Shopify Admin API          │
│ POST /admin/api/2024-01/   │
│      products.json         │
│                            │
│ ✓ Product Created!         │
└────────────────────────────┘
```

---

## 📡 API Reference

### Endpoint: POST /api/add-product

**Request:**

```json
{
  "product": {
    "title": "Silver Ring",
    "handle": "silver-ring",
    "type": "Ring",
    "description": "Premium silver jewelry",
    "colorVariants": [
      {
        "colorName": "Silver",
        "colorSlug": "silver",
        "sku": "SR-001",
        "price": "49.99",
        "compareAt": "99.99",
        "inventory": "10",
        "images": [
          { "src": "https://raw.githubusercontent.com/.../ring_silver.jpg" }
        ]
      }
    ]
  },
  "vendor": "My Jewels"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Product 'Silver Ring' created successfully in Shopify",
  "product": {
    "id": 9876543210,
    "title": "Silver Ring",
    "handle": "silver-ring",
    "variants_count": 1,
    "images_count": 1
  }
}
```

**Error Response (400/500):**

```json
{
  "success": false,
  "error": "Product must have a title"
}
```

---

## ⚠️ Troubleshooting

### Issue: "Connect ECONNREFUSED"

**Problem:** Frontend can't reach the backend server.

**Solution:**

1. Verify the server is running: `npm start`
2. Check the URL matches in Settings: `http://localhost:3000/api/add-product`
3. Ensure port 3000 is not blocked by a firewall

### Issue: "Invalid token"

**Problem:** Shopify rejects the API token.

**Solution:**

1. Check the token starts with `shpat_`
2. Verify it was copied correctly from Shopify Admin
3. Ensure the app is installed in Shopify

### Issue: "Product must have a title" or similar validation errors

**Problem:** Frontend data is missing required fields.

**Solution:**

1. Ensure all required fields are filled in the UI:
   - ✓ Product Title
   - ✓ Vendor (in Settings)
   - ✓ At least one Color variant
   - ✓ At least one image for each color

### Issue: Images not appearing in Shopify

**Problem:** GitHub image URLs aren't being captured correctly.

**Solution:**

1. Ensure GitHub token and repo are configured in Settings
2. Check that images uploaded successfully (status shows ✓)
3. Verify GitHub repository is public

---

## 🛠️ Development Mode

### Use ngrok to Test from Phone

To test the app on your phone, expose your local server:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# ngrok will output something like:
# https://abc123.ngrok.io
```

1. On your phone, visit: `https://abc123.ngrok.io`
2. Update Settings to use: `https://abc123.ngrok.io/api/add-product`

---

## 📚 Additional Resources

- **Shopify Admin API Docs**: https://shopify.dev/api/admin-rest
- **Shopify App Setup**: https://shopify.dev/apps
- **Node.js Guide**: https://nodejs.org/en/docs/

---

## 🎉 Next Steps

1. ✅ Create multiple products and test the batch workflow
2. ✅ Customize your Shopify store with product collections
3. ✅ Set up automated inventory sync (if needed)
4. ✅ Configure CSV export as fallback (toggle in Settings)

---

## 📝 Notes

- **Preserve image URLs**: GitHub image URLs continue to work perfectly
- **Variants support**: Multiple colors and sizes are automatically converted to Shopify variants
- **Error handling**: If product creation fails, the error is logged in the progress modal
- **Fallback option**: You can still download as CSV by switching the mode in Settings
- **Batch uploads**: Future enhancement to send multiple products at once

---

**Happy product listing! 🚀**

For issues, check the browser console (F12) and backend terminal for detailed error messages.
