# Shopify Bulk Product Lister

A production-ready web application to bulk create Shopify-compatible product listings, upload images to GitHub, and push structured data to Google Sheets.

---

## 📁 Folder Structure

```
e:/listing/
├── index.html              ← Main application UI
├── styles.css              ← All custom styles
├── app.js                  ← All JavaScript logic
├── google-apps-script.js   ← Google Apps Script code (paste in Apps Script editor)
└── README.md               ← This file
```

---

## ⚙️ Setup Instructions

### 1️⃣ GitHub Token & Repository

1. Go to [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Enable scope: ✅ `repo` (full control of private/public repositories)
4. Copy the token (starts with `ghp_…`)
5. Create a **public** repository (e.g., `product-images`) in your GitHub account
6. Configure in the app:
   - **GitHub Token** → paste your token
   - **GitHub Username** → your GitHub username
   - **Repository Name** → `product-images` (or your repo name)
   - **Branch** → `main` (default)

Images will upload to:
```
https://raw.githubusercontent.com/{user}/{repo}/main/product-images/{handle}/{color}/{filename}
```

---

### 2️⃣ Google Apps Script Setup

1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Go to **Extensions → Apps Script**
3. Delete any existing code and paste the entire contents of `google-apps-script.js`
4. Click **Deploy → New deployment**
5. Configuration:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** — authorize permissions when prompted
7. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/.../exec`)
8. Paste that URL into the app's **Google Sheets URL** field

> ⚠️ Each time you edit the Apps Script, create a **new deployment** (not update) to get a fresh URL, OR update the existing deployment.

---

### 3️⃣ Using the Application

1. Open `index.html` in any modern browser (Chrome recommended)
2. Fill in **GitHub** and **Google Sheets** configuration, then click **Save Configuration**
3. Click **Add Product** to add a product form
4. Fill in:
   - **Product Title** (auto-generates Shopify handle)
   - **Type**, **Description**, **Tags**, **SEO Title/Description**
5. Click **Add Color** to add a color variant
   - Set color name, SKU, price, compare-at price, inventory
   - Add sizes (or check **No Size Option**)
   - Drag & drop or click to select images for that color
6. Repeat for all products and variants
7. Click **Upload & Export** to:
   - Upload all images to GitHub
   - Write all rows to Google Sheets
   - Download the Shopify-compatible CSV

---

### 4️⃣ Shopify CSV Import

1. After downloading the CSV, go to **Shopify Admin → Products → Import**
2. Select your CSV file
3. Check **Overwrite existing products with matching handles** if updating
4. Click **Import products**

> ✅ GitHub raw URLs are publicly accessible — Shopify can download images directly.

---

## 📋 CSV Column Reference

| # | Column | Description |
|---|--------|-------------|
| 1 | Handle | URL-safe slug from title |
| 2 | Title | Product name (first row only) |
| 3 | Body (HTML) | Product description |
| 4 | Vendor | Brand name |
| 5 | Product Category | Shopify category path |
| 6 | Type | Product type |
| 7 | Tags | Comma-separated tags |
| 8 | Published | TRUE / FALSE |
| 9 | Option1 Name | Always "Color" |
| 10 | Option1 Value | Color name |
| 11 | Option2 Name | "Size" (if applicable) |
| 12 | Option2 Value | Size value |
| 13 | Variant SKU | SKU code |
| 14 | Variant Inventory Qty | Stock quantity |
| 15 | Variant Inventory Policy | deny / continue |
| 16 | Variant Fulfillment Service | manual / automatic |
| 17 | Variant Price | Selling price |
| 18 | Variant Compare At Price | Original price |
| 19 | Variant Requires Shipping | TRUE / FALSE |
| 20 | Variant Taxable | TRUE / FALSE |
| 21 | Image Src | GitHub raw image URL |
| 22 | Image Position | Auto-incremented |
| 23 | SEO Title | Meta title |
| 24 | SEO Description | Meta description |

---

## 🔒 Security Notes

- Your GitHub token is stored in `localStorage` — do **not** share or deploy this app publicly
- The Google Apps Script Web App URL is also stored in `localStorage`
- For team use, deploy the app behind authentication

---

## 🧩 Features Summary

- ✅ Unlimited products per session
- ✅ Unlimited color variants per product
- ✅ Sizes per color (optional)
- ✅ Duplicate SKU prevention
- ✅ Color-grouped image upload (GitHub API)
- ✅ Drag & drop image upload with preview
- ✅ Real-time upload progress per image
- ✅ CSV preview before download
- ✅ Google Sheets integration
- ✅ Auto-slug handle generation
- ✅ Toast notifications
- ✅ Responsive Shopify-admin-style UI
