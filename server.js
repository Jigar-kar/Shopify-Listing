/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Shopify Bulk Product Lister — Backend Server
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This server receives product data from the frontend and sends it directly to
 * the Shopify Admin API using the REST API endpoint for creating products.
 *
 * Environment Variables:
 *   - SHOPIFY_STORE_URL: Your store URL (e.g., mystore.myshopify.com)
 *   - SHOPIFY_ADMIN_TOKEN: Your Shopify Admin API access token
 *   - PORT: Server port (default: 3000)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use strict";

import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import sharp from "sharp";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────

// Parse JSON request bodies
app.use(express.json({ limit: "50mb" }));

// Enable CORS for frontend requests
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", server: "Shopify Bulk Product Lister API" });
});

// ─────────────────────────────────────────────────────────────────────────
// VALIDATION & CONFIG
// ─────────────────────────────────────────────────────────────────────────

function validateEnv() {
  const errors = [];

  if (!process.env.SHOPIFY_STORE_URL) {
    errors.push("SHOPIFY_STORE_URL is not set");
  }
  if (!process.env.SHOPIFY_ADMIN_TOKEN) {
    errors.push("SHOPIFY_ADMIN_TOKEN is not set");
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────
// IMAGE PROCESSING & SHOPIFY CDN UPLOAD
// ─────────────────────────────────────────────────────────────────────────

/**
 * Download image from URL and return as buffer
 * (Only used for external URLs. Local uploads use base64 directly)
 * @param {string} imageUrl - URL of image to download
 * @returns {Promise<Buffer>} - Image buffer
 */
async function downloadImage(imageUrl) {
  console.log(`[Image] Downloading image from external URL: ${imageUrl}`);
  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    console.log(
      `[Image] Downloaded successfully (${response.data.length} bytes)`,
    );
    return response.data;
  } catch (error) {
    console.error(`[Image] Download failed: ${error.message}`);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Process and compress image to WebP format
 * @param {Buffer} imageBuffer - Raw image buffer
 * @param {number} maxWidth - Maximum width (default 2000px)
 * @param {number} quality - WebP quality 1-100 (default 80)
 * @returns {Promise<Buffer>} - Compressed WebP buffer
 */
async function compressImage(imageBuffer, maxWidth = 2000, quality = 80) {
  console.log(
    `[Image] Compressing to WebP (max-width: ${maxWidth}px, quality: ${quality})`,
  );
  try {
    const compressed = await sharp(imageBuffer)
      .resize(maxWidth, maxWidth, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();

    console.log(
      `[Image] Compression complete (${compressed.length} bytes, ${Math.round((compressed.length / imageBuffer.length) * 100)}% of original)`,
    );
    return compressed;
  } catch (error) {
    console.error(`[Image] Compression failed: ${error.message}`);
    throw new Error(`Failed to compress image: ${error.message}`);
  }
}

/**
 * Upload processed image to Shopify CDN
 * @param {string} productId - Shopify product ID
 * @param {Buffer} imageBuffer - Compressed image buffer
 * @param {string} filename - Filename for the image
 * @returns {Promise<Object>} - Shopify image object with ID and URL
 */
async function uploadImageToShopify(
  productId,
  imageBuffer,
  filename = "product.webp",
) {
  const storeUrl = process.env.SHOPIFY_STORE_URL.replace(
    /^https?:\/\//,
    "",
  ).replace(/\/$/, "");
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  const base64Image = imageBuffer.toString("base64");
  const url = `https://${storeUrl}/admin/api/2024-01/products/${productId}/images.json`;

  console.log(
    `[Shopify Upload] Uploading image to product ${productId}: ${filename}`,
  );

  try {
    const response = await axios.post(
      url,
      {
        image: {
          attachment: base64Image,
          filename: filename,
          alt: filename,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        timeout: 60000,
      },
    );

    console.log(
      `[Shopify Upload] Success! Image ID: ${response.data.image.id}, URL: ${response.data.image.src}`,
    );
    return response.data.image;
  } catch (error) {
    console.error(`[Shopify Upload] Upload failed: ${error.message}`);
    if (error.response?.data) {
      console.error("[Shopify Upload] Error details:", error.response.data);
    }
    throw new Error(`Failed to upload image to Shopify: ${error.message}`);
  }
}

/**
 * Map images to variants by color
 * Attach image IDs to the correct variants based on color matching
 * @param {Array} variants - Array of variant objects
 * @param {Array} imagesByColor - Array of objects: { color, imageIds: [...] }
 * @returns {Promise<Array>} - Updated variants with image IDs
 */
async function mapImagesToVariants(variants, imagesByColor) {
  console.log(
    `[Variants] Mapping ${variants.length} variant(s) to ${imagesByColor.length} color group(s)`,
  );

  const updatedVariants = variants.map((variant) => {
    // Find the color group for this variant
    const colorMatch = imagesByColor.find(
      (group) =>
        group.color.toLowerCase() === (variant.option1 || "").toLowerCase(),
    );

    if (colorMatch && colorMatch.imageIds.length > 0) {
      // Assign first image as the primary variant image
      variant.image_id = colorMatch.imageIds[0];
      console.log(
        `  ✓ Variant "${variant.option1}" → Image ID: ${variant.image_id}`,
      );
    }

    return variant;
  });

  return updatedVariants;
}

/**
 * Convert base64 string to Buffer
 * @param {string} base64String - Base64 encoded string (with or without data: prefix)
 * @returns {Buffer} - Image buffer
 */
function base64ToBuffer(base64String) {
  // Remove data: prefix if present (e.g., "data:image/jpeg;base64,")
  const base64Data = base64String.includes(",")
    ? base64String.split(",")[1]
    : base64String;

  return Buffer.from(base64Data, "base64");
}

/**
 * Process all images from color variants and upload to Shopify
 * Handles local uploads (base64/buffer) without downloading
 * @param {string} productId - Shopify product ID
 * @param {Array} colorVariants - Color variants with images
 * @returns {Promise<Array>} - Image group objects: { color, imageIds: [...] }
 */
async function processAndUploadProductImages(productId, colorVariants) {
  const imagesByColor = [];
  let totalImagesProcessed = 0;

  for (const colorVariant of colorVariants) {
    const colorName = colorVariant.colorName || "Default";
    const colorImageIds = [];

    if (colorVariant.images && colorVariant.images.length > 0) {
      console.log(
        `\n[Images] Processing ${colorVariant.images.length} image(s) for color: ${colorName}`,
      );

      for (let i = 0; i < colorVariant.images.length; i++) {
        const image = colorVariant.images[i];
        const imageSrc = image.src || image;

        console.log(
          `[Images] Processing image ${i + 1}/${colorVariant.images.length}`,
        );

        try {
          // Determine image format and convert to buffer
          let imageBuffer;

          if (Buffer.isBuffer(imageSrc)) {
            // Already a buffer (local upload)
            imageBuffer = imageSrc;
            console.log(
              "[Images] ✓ Using local buffer (uploaded from computer)",
            );
          } else if (typeof imageSrc === "string") {
            // String format - could be base64 or URL
            if (
              imageSrc.startsWith("data:image") ||
              imageSrc.match(/^[A-Za-z0-9+/=]+$/)
            ) {
              // Base64 encoded (local upload from frontend)
              imageBuffer = base64ToBuffer(imageSrc);
              console.log(
                "[Images] ✓ Using local base64 (uploaded from computer)",
              );
            } else {
              // URL string - download it
              console.log("[Images] URL detected, downloading...");
              imageBuffer = await downloadImage(imageSrc);
            }
          } else {
            throw new Error(
              "Invalid image format. Expected buffer, base64 string, or URL.",
            );
          }

          // Compress to WebP
          const compressed = await compressImage(imageBuffer);

          // Upload to Shopify
          const filename = `${colorName
            .toLowerCase()
            .replace(/\s+/g, "-")}-${i + 1}.webp`;
          const shopifyImage = await uploadImageToShopify(
            productId,
            compressed,
            filename,
          );

          colorImageIds.push(shopifyImage.id);
          totalImagesProcessed++;
        } catch (error) {
          console.error(
            `[Images] Failed to process image ${i + 1} for ${colorName}: ${error.message}`,
          );
          // Continue with next image instead of failing completely
        }
      }
    }

    imagesByColor.push({
      color: colorName,
      imageIds: colorImageIds,
    });
  }

  console.log(
    `\n[Images] Total images processed and uploaded: ${totalImagesProcessed}`,
  );
  return imagesByColor;
}

// ─────────────────────────────────────────────────────────────────────────
// INVENTORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get all available inventory locations in Shopify
 * Returns empty array if inventory permissions are not available
 * @returns {Promise<Array>} - Array of location objects (or empty array on permission error)
 */
async function getAllLocations() {
  const storeUrl = process.env.SHOPIFY_STORE_URL.replace(
    /^https?:\/\//,
    "",
  ).replace(/\/$/, "");
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  try {
    const response = await axios.get(
      `https://${storeUrl}/admin/api/2024-01/locations.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
        },
      },
    );

    return response.data.locations || [];
  } catch (error) {
    // Check if it's a permission error
    if (error.response?.status === 403) {
      console.warn(
        "[Inventory] ⚠️ Permission denied (403): Your token may not have inventory permissions",
      );
      console.warn(
        "[Inventory] ⚠️ Required scopes: read_inventory, write_inventory",
      );
      console.warn("[Inventory] ⚠️ Continuing without inventory sync...");
      return []; // Return empty array - don't fail
    }

    console.error("[Inventory] Failed to get locations:", error.message);
    return []; // Return empty array on any error
  }
}

/**
 * Get the best inventory location (fulfillment-enabled or first active)
 * Returns null if locations cannot be retrieved
 * @returns {Promise<string|null>} - Location ID or null if unavailable
 */
async function getDefaultLocationId() {
  try {
    const locations = await getAllLocations();

    if (locations.length === 0) {
      console.warn(
        "[Inventory] ⚠️ No locations available - inventory sync disabled",
      );
      return null; // Return null instead of throwing
    }

    // Log all available locations
    console.log("[Inventory] Available locations:");
    locations.forEach((loc, idx) => {
      console.log(
        `  ${idx + 1}. ${loc.name} (ID: ${loc.id})${loc.fulfills_online_orders ? " ✓ Online" : ""}${loc.fulfills_instore_pickups ? " ✓ Pickup" : ""}`,
      );
    });

    // Prefer fulfillment-enabled location, otherwise use first active
    let selectedLocation = locations.find(
      (loc) => loc.fulfills_online_orders || loc.fulfills_instore_pickups,
    );

    if (!selectedLocation) {
      selectedLocation = locations[0];
    }

    console.log(
      `[Inventory] Using location: "${selectedLocation.name}" (ID: ${selectedLocation.id})`,
    );
    return selectedLocation.id;
  } catch (error) {
    console.warn(
      `[Inventory] ⚠️ Could not get default location: ${error.message}`,
    );
    return null; // Return null on error instead of throwing
  }
}

/**
 * Update inventory level for a variant at a specific location
 * @param {string} inventoryItemId - Inventory item ID
 * @param {number} quantity - Quantity to set
 * @param {string} locationId - Location ID (required)
 * @returns {Promise<void>}
 */
async function setInventoryLevel(inventoryItemId, quantity, locationId) {
  const storeUrl = process.env.SHOPIFY_STORE_URL.replace(
    /^https?:\/\//,
    "",
  ).replace(/\/$/, "");
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  try {
    const response = await axios.post(
      `https://${storeUrl}/admin/api/2024-01/inventory_levels/set.json`,
      {
        inventory_item_id: inventoryItemId,
        location_id: locationId, // ← ADDED: Specify which location to set inventory for
        available: quantity,
        track: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
      },
    );

    console.log(
      `[Inventory] ✓ Set inventory for item ${inventoryItemId}: ${quantity} units at location ${locationId}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      `[Inventory] Failed to set inventory for item ${inventoryItemId}: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Update inventory levels for all variants in a product
 * @param {Array} variants - Array of variant objects with inventory_quantity
 * @param {string} locationId - Location ID
 * @returns {Promise<void>}
 */
async function updateProductInventory(variants, locationId) {
  // Skip inventory update if location ID is not available
  if (!locationId) {
    console.warn(
      "[Inventory] ⚠️ Location ID not available - skipping inventory sync",
    );
    return;
  }

  console.log(
    `\n[Inventory] Updating inventory for ${variants.length} variant(s)...`,
  );

  for (const variant of variants) {
    try {
      if (
        variant.inventory_item_id &&
        variant.inventory_quantity !== undefined
      ) {
        await setInventoryLevel(
          variant.inventory_item_id,
          variant.inventory_quantity,
          locationId,
        );
      }
    } catch (error) {
      console.error(
        `[Inventory] Error updating variant ${variant.id}: ${error.message}`,
      );
      // Continue with next variant instead of failing
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SHOPIFY API REQUEST HELPER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send a product to Shopify via the Admin API
 * @param {Object} shopifyProduct - The product object in Shopify API format
 * @returns {Promise<Object>} - Response from Shopify API
 */
async function sendProductToShopify(shopifyProduct) {
  const storeUrl = process.env.SHOPIFY_STORE_URL.replace(
    /^https?:\/\//,
    "",
  ).replace(/\/$/, "");
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  const url = `https://${storeUrl}/admin/api/2024-01/products.json`;

  console.log(
    `[Shopify API] Sending product: "${shopifyProduct.product.title}"`,
  );
  console.log(`[Shopify API] URL: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify(shopifyProduct),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Shopify API] Error response:", data);
    throw new Error(
      data.errors?.join(", ") || `Shopify API error: ${response.status}`,
    );
  }

  console.log("[Shopify API] Success! Product ID:", data.product.id);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────
// PRODUCT TRANSFORMATION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Transform the frontend product data into Shopify Admin API format
 *
 * Handles both color variants and sizes
 * Creates variant combinations for: color × size
 *
 * Frontend format:
 *   {
 *     title, description, type, vendor,
 *     noSize: false,
 *     sizes: [{ name, skuSuffix, price, inventory, compareAt }],
 *     colorVariants: [{ colorName, price, sku, inventory, compareAt, images: [...] }]
 *   }
 *
 * Shopify API format (with color + size options):
 *   {
 *     product: {
 *       title, body_html, vendor, product_type,
 *       options: [{ name: "Color" }, { name: "Size" }],
 *       variants: [{ option1: "Color", option2: "Size", price, sku, inventory_quantity }]
 *     }
 *   }
 */
function transformToShopifyFormat(productData, vendor) {
  const {
    title,
    description = "",
    type = "",
    colorVariants = [],
    sizes = [],
    noSize = false,
  } = productData;

  let variants = [];
  let options = [];

  // ─── Build variants from color × size combinations ───
  if (!noSize && sizes && sizes.length > 0) {
    // ✅ SIZES + COLORS: Create variant for each color × size combo
    options = [{ name: "Color" }, { name: "Size" }];

    for (const color of colorVariants) {
      for (const size of sizes) {
        const baseSku = color.sku || "SKU";
        const sizeSkuSuffix = size.skuSuffix || `-${size.name}`;
        const fullSku = `${baseSku}${sizeSkuSuffix}`;

        // Use size price if available, otherwise fall back to color price
        const sizePrice = size.price || color.price || "0";
        const sizeCompareAt = size.compareAt || color.compareAt || null;
        const sizeInventory = size.inventory || "0";

        const variant = {
          option1: color.colorName || "Default",
          option2: size.name || "Default",
          sku: fullSku,
          price: String(sizePrice),
          inventory_quantity: parseInt(sizeInventory, 10),
        };

        // Add compare_at_price if provided
        if (sizeCompareAt) {
          variant.compare_at_price = String(sizeCompareAt);
        }

        variants.push(variant);
      }
    }
  } else {
    // ✅ COLORS ONLY: Create variant per color (no sizes)
    if (colorVariants.length > 1) {
      options = [{ name: "Color" }];
    }

    for (const color of colorVariants) {
      const variant = {
        sku: color.sku || "",
        price: String(color.price || "0"),
        inventory_quantity: parseInt(color.inventory || "0", 10),
      };

      // Add option1 if multiple colors
      if (colorVariants.length > 1) {
        variant.option1 = color.colorName || "";
      }

      // Add compare_at_price if provided
      if (color.compareAt) {
        variant.compare_at_price = String(color.compareAt);
      }

      variants.push(variant);
    }
  }

  // Construct the final Shopify product object
  const shopifyProduct = {
    product: {
      title: title || "Untitled Product",
      body_html: description
        ? `<p>${description.replace(/\n/g, "</p><p>")}</p>`
        : "",
      vendor: vendor || "",
      product_type: type || "",
      variants,
      options,
      // Images excluded - will be uploaded separately via Shopify API
    },
  };

  // Log product summary for debugging
  console.log(`[Transform] Product Summary:`);
  console.log(`  Title: ${shopifyProduct.product.title}`);
  console.log(`  Type: ${shopifyProduct.product.product_type}`);
  console.log(`  Vendor: ${shopifyProduct.product.vendor}`);
  console.log(`  Variants: ${variants.length}`);
  if (options.length > 0) {
    console.log(`  Options: ${options.map((o) => o.name).join(", ")}`);
  }
  console.log(`  Images: Will be uploaded separately to Shopify CDN`);
  variants.forEach((variant, idx) => {
    const optionStr =
      [variant.option1, variant.option2].filter(Boolean).join(" - ") ||
      "Default";
    console.log(
      `    - Variant ${idx + 1}: "${optionStr}" | SKU: ${variant.sku} | Price: $${variant.price} | Qty: ${variant.inventory_quantity}`,
    );
  });

  return shopifyProduct;
}

// ─────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /api/add-product
 *
 * Receive product data from frontend and send to Shopify
 *
 * Request body:
 *   {
 *     product: { ... product data ... },
 *     vendor: "Brand Name"
 *   }
 *
 * Response:
 *   - Success (201): { success: true, product: { id, title, ... } }
 *   - Error (400/500): { success: false, error: "error message" }
 */
app.post("/api/add-product", async (req, res) => {
  try {
    const { product, vendor } = req.body;

    // ─── Validation ───────────────────────────────────────
    if (!product) {
      return res.status(400).json({
        success: false,
        error: "Missing product data in request body",
      });
    }

    if (!product.title || product.title.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Product must have a title",
      });
    }

    if (!vendor || vendor.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Vendor name is required",
      });
    }

    if (!product.colorVariants || product.colorVariants.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Product must have at least one color variant",
      });
    }

    // ─── Transform & Send to Shopify ──────────────────────
    console.log(`\n[API] Received product: "${product.title}"`);

    const shopifyProduct = transformToShopifyFormat(product, vendor);
    console.log(
      "[API] Transformed to Shopify format: (images will be added separately)",
    );

    // ─── Step 1: Create the product WITHOUT images ─────────
    console.log(`\n[API] Step 1: Creating product in Shopify...`);
    const shopifyResponse = await sendProductToShopify(shopifyProduct);
    const productId = shopifyResponse.product.id;

    // ─── Step 2: Process and upload images ────────────────
    console.log(
      `\n[API] Step 2: Processing and uploading images to Shopify CDN...`,
    );
    const imagesByColor = await processAndUploadProductImages(
      productId,
      product.colorVariants,
    );

    // ─── Step 3: Map images to variants ───────────────────
    console.log(`\n[API] Step 3: Mapping images to variants...`);
    const shopifyVariants = shopifyResponse.product.variants;
    const updatedVariants = await mapImagesToVariants(
      shopifyVariants,
      imagesByColor,
    );

    // ─── Step 4: Update variants with image assignments ────
    console.log(`\n[API] Step 4: Updating variants with image IDs...`);
    for (const variant of updatedVariants) {
      if (variant.image_id) {
        try {
          const updateUrl = `https://${process.env.SHOPIFY_STORE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}/admin/api/2024-01/variants/${variant.id}.json`;
          const updateResponse = await axios.put(
            updateUrl,
            {
              variant: {
                id: variant.id,
                image_id: variant.image_id,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
              },
            },
          );
          console.log(
            `  ✓ Updated variant ${variant.id} with image ${variant.image_id}`,
          );
        } catch (error) {
          console.error(`  ✗ Failed to update variant: ${error.message}`);
        }
      }
    }

    // ─── Step 5: Update inventory levels ──────────────────
    const locationId = await getDefaultLocationId();
    await updateProductInventory(shopifyResponse.product.variants, locationId);

    // Count total images
    const totalImages = imagesByColor.reduce(
      (sum, group) => sum + group.imageIds.length,
      0,
    );

    // ─── Success Response ──────────────────────────────────
    return res.status(201).json({
      success: true,
      message: `Product "${product.title}" created successfully in Shopify with images and inventory`,
      product: {
        id: shopifyResponse.product.id,
        title: shopifyResponse.product.title,
        handle: shopifyResponse.product.handle,
        variants_count: shopifyResponse.product.variants.length,
        images_count: totalImages,
        images_by_color: imagesByColor,
      },
    });
  } catch (error) {
    console.error("[API] Error:", error.message);

    // Determine appropriate HTTP status code
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes("Shopify")) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/add-products (Batch)
 *
 * Send multiple products at once
 *
 * Request body:
 *   {
 *     products: [{ title, description, ... }, ...],
 *     vendor: "Brand Name"
 *   }
 */
app.post("/api/add-products", async (req, res) => {
  try {
    const { products, vendor } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "products must be a non-empty array",
      });
    }

    const results = [];
    const errors = [];

    for (const product of products) {
      try {
        const shopifyProduct = transformToShopifyFormat(product, vendor);
        const response = await sendProductToShopify(shopifyProduct);
        results.push({
          title: product.title,
          success: true,
          id: response.product.id,
        });
      } catch (error) {
        console.error(
          `[API] Error creating product "${product.title}":`,
          error.message,
        );
        errors.push({
          title: product.title,
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(results.length > 0 ? 201 : 400).json({
      success: errors.length === 0,
      message: `${results.length} product(s) created, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[API] Batch error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ─────────────────────────────────────────────────────────────────────────
// SERVER STARTUP
// ─────────────────────────────────────────────────────────────────────────

function startServer() {
  const envErrors = validateEnv();

  if (envErrors.length > 0) {
    console.error("❌ Missing Environment Variables:");
    envErrors.forEach((err) => console.error(`   - ${err}`));
    console.error("\nℹ️  Create a .env file in the project root with:");
    console.error("   SHOPIFY_STORE_URL=yourstore.myshopify.com");
    console.error("   SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxx");
    console.error("   PORT=3000 (optional)");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log("");
    console.log(
      "╔═══════════════════════════════════════════════════════════╗",
    );
    console.log(`║  Shopify Bulk Product Lister API (v3.0)                  ║`);
    console.log(
      `║  🚀 Server running on http://localhost:${PORT}                   ║`,
    );
    console.log(
      "║                                                           ║",
    );
    console.log(
      "║  📸 Image Feature: Direct Shopify CDN Upload              ║",
    );
    console.log(
      "║  • Auto-compress images to WebP                           ║",
    );
    console.log(
      "║  • Upload directly to Shopify CDN                         ║",
    );
    console.log(
      "║  • Map images to color variants                           ║",
    );
    console.log(
      "║                                                           ║",
    );
    console.log(`║  Store: ${process.env.SHOPIFY_STORE_URL.padEnd(48)}║`);
    console.log(
      `║  Env: ${(process.env.NODE_ENV || "development").padEnd(52)}║`,
    );
    console.log(
      "║                                                           ║",
    );
    console.log(
      "║  API Endpoints:                                           ║",
    );
    console.log(
      "║  - GET  /health                                           ║",
    );
    console.log(
      "║  - POST /api/add-product (with auto image upload)         ║",
    );
    console.log(
      "║  - POST /api/add-products (batch)                         ║",
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════╝",
    );
    console.log("");
  });
}

// Start the server
startServer();
