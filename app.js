/* ══════════════════════════════════════════════════════════════════════════
   Shopify Bulk Product Lister — app.js
   Production-ready | Modular | async/await
   ══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const LS_CONFIG = 'shopify_bulk_config';
const LS_SETTINGS = 'shopify_bulk_settings';

const CSV_HEADERS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category',
  'Type', 'Tags', 'Published',
  // Options
  'Option1 Name', 'Option1 Value', 'Option1 Linked To',
  'Option2 Name', 'Option2 Value', 'Option2 Linked To',
  'Option3 Name', 'Option3 Value', 'Option3 Linked To',
  // Variant fields
  'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker',
  'Variant Inventory Qty', 'Variant Inventory Policy', 'Variant Fulfillment Service',
  'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable',
  // Unit price (always blank)
  'Unit Price Total Measure', 'Unit Price Total Measure Unit',
  'Unit Price Base Measure', 'Unit Price Base Measure Unit',
  // Barcode
  'Variant Barcode',
  // Image
  'Image Src', 'Image Position', 'Image Alt Text',
  // Misc
  'Gift Card', 'SEO Title', 'SEO Description',
  // Variant tail
  'Variant Image', 'Variant Weight Unit', 'Variant Tax Code',
  'Cost per item', 'Status',
];

const GAS_CODE = `// ═══════════════════════════════════════════════════════
// Google Apps Script — Shopify Bulk Product Lister
// Deploy as Web App: Execute as Me | Anyone can access
// ═══════════════════════════════════════════════════════

const SHEET_NAME = 'Products'; // Change if needed

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const rows    = payload.rows; // Array of row arrays

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Write headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(payload.headers);
      sheet.getRange(1, 1, 1, payload.headers.length)
        .setBackground('#1a1d2e')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }

    // Append all rows
    rows.forEach(row => sheet.appendRow(row));

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, added: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Shopify Bulk Lister Script Active' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

/* ─── State ───────────────────────────────────────────────────────────────── */
let productCounter = 0;
let products = [];           // [{ id, element }]
let globalImagePos = {};           // productId => next image position

const usedSKUs = new Set();    // global SKU registry
const usedHandles = new Set();    // global Handle registry (prevents duplicate handle import errors)

/**
 * Returns a unique, Shopify-safe handle. If `base` is already taken, appends
 * -2, -3, … until a free slot is found. Registers the chosen handle.
 * @param {string} base - slugified base handle
 * @param {Set<string>} registry - set of already-used handles
 */
function uniqueHandle(base, registry) {
  if (!registry.has(base)) { registry.add(base); return base; }
  let n = 2;
  while (registry.has(`${base}-${n}`)) n++;
  const h = `${base}-${n}`;
  registry.add(h);
  return h;
}

/* ─── Settings (defaults) ─────────────────────────────────────────────────── */
let settings = {
  inventoryPolicy: 'deny',
  fulfillment: 'manual',
  shipping: 'TRUE',
  taxable: 'TRUE',
  published: 'TRUE',
};

/* ══════════════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadSettings();
  bindGlobalEvents();
  addProduct();            // start with one product
  populateGASCode();

  // Show config reminder banner if GitHub token or Sheets URL not yet saved
  const cfg = JSON.parse(localStorage.getItem(LS_CONFIG) || '{}');
  if (!cfg.githubToken || !cfg.sheetsUrl) {
    const banner = document.getElementById('configBanner');
    if (banner) banner.style.removeProperty('display');
  }
});

/* ─── Populate GAS code block ────────────────────────────────────────────── */
function populateGASCode() {
  const el = document.getElementById('gasCodeBlock');
  if (el) el.textContent = GAS_CODE;
}

/* ─── Copy GAS code (global fn for onclick) ──────────────────────────────── */
window.copyGASCode = function () {
  navigator.clipboard.writeText(GAS_CODE).then(() => toast('Apps Script code copied!', 'success'));
};

/* ══════════════════════════════════════════════════════════════════════════
   CONFIG & SETTINGS PERSISTENCE
   ══════════════════════════════════════════════════════════════════════════ */
function saveConfig() {
  const cfg = {
    githubToken: document.getElementById('githubToken').value.trim(),
    githubUser: document.getElementById('githubUser').value.trim(),
    githubRepo: document.getElementById('githubRepo').value.trim(),
    githubBranch: document.getElementById('githubBranch').value.trim() || 'main',
    sheetsUrl: document.getElementById('sheetsUrl').value.trim(),
    globalVendor: document.getElementById('globalVendor').value.trim(),
  };
  localStorage.setItem(LS_CONFIG, JSON.stringify(cfg));
  toast('Configuration saved!', 'success');
}

function loadConfig() {
  const cfg = JSON.parse(localStorage.getItem(LS_CONFIG) || '{}');
  if (cfg.githubToken) document.getElementById('githubToken').value = cfg.githubToken;
  if (cfg.githubUser) document.getElementById('githubUser').value = cfg.githubUser;
  if (cfg.githubRepo) document.getElementById('githubRepo').value = cfg.githubRepo;
  if (cfg.githubBranch) document.getElementById('githubBranch').value = cfg.githubBranch;
  if (cfg.sheetsUrl) document.getElementById('sheetsUrl').value = cfg.sheetsUrl;
  if (cfg.globalVendor) document.getElementById('globalVendor').value = cfg.globalVendor;
}

function getConfig() {
  return {
    token: document.getElementById('githubToken').value.trim(),
    user: document.getElementById('githubUser').value.trim(),
    repo: document.getElementById('githubRepo').value.trim(),
    branch: document.getElementById('githubBranch').value.trim() || 'main',
    sheetsUrl: document.getElementById('sheetsUrl').value.trim(),
    vendor: document.getElementById('globalVendor').value.trim(),
  };
}

function saveSettings() {
  // Save integration config
  const cfg = {
    githubToken: document.getElementById('githubToken').value.trim(),
    githubUser: document.getElementById('githubUser').value.trim(),
    githubRepo: document.getElementById('githubRepo').value.trim(),
    githubBranch: document.getElementById('githubBranch').value.trim() || 'main',
    sheetsUrl: document.getElementById('sheetsUrl').value.trim(),
    globalVendor: document.getElementById('globalVendor').value.trim(),
  };
  localStorage.setItem(LS_CONFIG, JSON.stringify(cfg));

  // Save inventory defaults
  settings.inventoryPolicy = document.getElementById('defaultInventoryPolicy').value;
  settings.fulfillment = document.getElementById('defaultFulfillment').value;
  settings.shipping = document.getElementById('defaultShipping').value;
  settings.taxable = document.getElementById('defaultTaxable').value;
  settings.published = document.getElementById('defaultPublished').value;
  localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));

  toast('All settings saved!', 'success');
}

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
  Object.assign(settings, saved);
  const map = {
    defaultInventoryPolicy: 'inventoryPolicy',
    defaultFulfillment: 'fulfillment',
    defaultShipping: 'shipping',
    defaultTaxable: 'taxable',
    defaultPublished: 'published',
  };
  for (const [elId, key] of Object.entries(map)) {
    const el = document.getElementById(elId);
    if (el && settings[key]) el.value = settings[key];
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   GLOBAL EVENT BINDINGS
   ══════════════════════════════════════════════════════════════════════════ */
function bindGlobalEvents() {
  // Navigation
  const pageLabels = { lister: 'Product Lister', settings: 'Settings', help: 'Help & Guide' };
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page, pageLabels[page] || page);
    });
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

  // Settings save (also saves GitHub & Sheets config)
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  // Settings shortcut button in lister toolbar
  document.getElementById('goToSettingsBtn').addEventListener('click', () => {
    navigateTo('settings', 'Settings');
  });

  // Inline banner "Go to Settings" link
  document.querySelectorAll('.sidebar-link-inline').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      const pageLabels = { lister: 'Product Lister', settings: 'Settings', help: 'Help & Guide' };
      navigateTo(page, pageLabels[page] || page);
    });
  });

  // Clear data
  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (confirm('This will clear all saved configuration and settings. Continue?')) {
      localStorage.removeItem(LS_CONFIG);
      localStorage.removeItem(LS_SETTINGS);
      loadConfig(); loadSettings();
      toast('All data cleared.', 'info');
    }
  });

  // Add product
  document.getElementById('addProductBtn').addEventListener('click', addProduct);

  // Preview CSV
  document.getElementById('previewCsvBtn').addEventListener('click', previewCSV);

  // Upload & Export
  document.getElementById('submitAllBtn').addEventListener('click', handleSubmitAll);

  // GitHub token show/hide
  document.getElementById('toggleGhToken').addEventListener('click', () => {
    const inp = document.getElementById('githubToken');
    const ico = document.querySelector('#toggleGhToken i');
    if (inp.type === 'password') { inp.type = 'text'; ico.className = 'bi bi-eye-slash'; }
    else { inp.type = 'password'; ico.className = 'bi bi-eye'; }
  });

  // Preview CSV (inside modal)
  document.getElementById('previewCsvBtn').addEventListener('click', previewCSV);

  // Download CSV (inside modal)
  document.getElementById('downloadCsvBtn').addEventListener('click', downloadCSV);

  // Upload & Export
  document.getElementById('submitAllBtn').addEventListener('click', handleSubmitAll);
}

/* ─── Navigation ─────────────────────────────────────────────────────────── */
function navigateTo(pageId, label) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  const link = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);
  if (link) link.classList.add('active');
  document.getElementById('pageHeading').textContent = label;
}

/* ─── Sidebar Toggle ──────────────────────────────────────────────────────── */
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.toggle('mobile-open');
  } else {
    document.body.classList.toggle('sidebar-collapsed');
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   PRODUCT MANAGEMENT
   ══════════════════════════════════════════════════════════════════════════ */
function addProduct() {
  productCounter++;
  const id = 'prod_' + Date.now() + '_' + productCounter;
  const tmpl = document.getElementById('productTemplate').content.cloneNode(true);
  const card = tmpl.querySelector('.product-card');

  card.dataset.productId = id;
  card.querySelector('.product-number').textContent = `Product #${productCounter}`;

  // Bind product-level events (includes size section)
  bindProductEvents(card, id);

  document.getElementById('productsContainer').appendChild(card);
  products.push({ id, element: card });
  globalImagePos[id] = 1;

  // Add one default size row
  addSize(card.querySelector('.sizes-container'));

  // Add first color variant
  addColor(card);

  // UX: attach field hints & update live stats
  if (typeof attachFieldHints === 'function') attachFieldHints(card);
  if (typeof updateStats === 'function') updateStats();

  // Scroll into view
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindProductEvents(card, productId) {
  // Remove product
  card.querySelector('.remove-product-btn').addEventListener('click', () => {
    if (products.length === 1) { toast('At least one product is required.', 'warn'); return; }
    if (confirm('Remove this product?')) {
      card.remove();
      products = products.filter(p => p.id !== productId);
      renumberProducts();
    }
  });

  // Collapse product
  const collapseBtn = card.querySelector('.collapse-product-btn');
  const cardBody = card.querySelector('.product-card-body');
  collapseBtn.addEventListener('click', () => {
    const isHidden = cardBody.style.display === 'none';
    cardBody.style.display = isHidden ? '' : 'none';
    collapseBtn.innerHTML = isHidden
      ? '<i class="bi bi-chevron-up"></i>'
      : '<i class="bi bi-chevron-down"></i>';
  });

  // Auto-slug title → handle preview
  card.querySelector('.product-title').addEventListener('input', function () {
    const handle = slugify(this.value);
    card.querySelector('.handle-preview').textContent = handle ? `Handle: ${handle}` : '';
  });

  // ── Product-level Sizes ───────────────────────────────
  const noSizeCheck = card.querySelector('.no-size-check');
  const sizesContainer = card.querySelector('.sizes-container');
  const sizesHeader = card.querySelector('.sizes-header');
  const addSizeBtn = card.querySelector('.add-size-btn');

  const bulkSizesInput = card.querySelector('.bulk-sizes-input');

  noSizeCheck.addEventListener('change', () => {
    const hide = noSizeCheck.checked;
    sizesContainer.style.display = hide ? 'none' : '';
    sizesHeader.style.display = hide ? 'none' : '';
    addSizeBtn.closest('div').style.display = hide ? 'none' : '';
  });

  // "Add Sizes" button — reads the quick-add input and creates rows
  addSizeBtn.addEventListener('click', () => {
    const raw = bulkSizesInput ? bulkSizesInput.value.trim() : '';
    if (raw) {
      // Split on commas, create one row per size
      const names = raw.split(',').map(n => n.trim()).filter(n => n);
      names.forEach(name => {
        addSize(sizesContainer, name);
      });
      bulkSizesInput.value = ''; // clear after adding
    } else {
      // No input typed — just add a blank row
      addSize(sizesContainer);
    }
  });

  // Add Color button
  card.querySelector('.add-color-btn').addEventListener('click', () => addColor(card));

  // ── 4-Step Wizard Navigation ──────────────────────────────────────────────
  let currentStep = 1;
  const TOTAL_STEPS = 4;

  const panels = Array.from(card.querySelectorAll('.step-panel'));
  const stepItems = Array.from(card.querySelectorAll('.step-item'));
  const connectors = Array.from(card.querySelectorAll('.step-connector'));
  const dots = Array.from(card.querySelectorAll('.step-dot-nav'));
  const nextBtn = card.querySelector('.step-next-btn');
  const prevBtn = card.querySelector('.step-prev-btn');

  function goToStep(target, goingBack = false) {
    if (target < 1 || target > TOTAL_STEPS) return;

    // Hide old panel, show new
    panels.forEach(p => {
      p.classList.remove('active', 'slide-back');
    });
    const targetPanel = panels[target - 1];
    if (goingBack) targetPanel.classList.add('slide-back');
    targetPanel.classList.add('active');

    // Update step indicator items
    stepItems.forEach((item, i) => {
      const stepNum = i + 1;
      item.classList.remove('active', 'completed');
      if (stepNum < target) item.classList.add('completed');
      else if (stepNum === target) item.classList.add('active');
    });

    // Update connectors
    connectors.forEach((con, i) => {
      con.classList.toggle('completed', i < target - 1);
    });

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i + 1 === target) dot.classList.add('active');
      else if (i + 1 < target) dot.classList.add('done');
    });

    // Show / hide Prev button
    prevBtn.style.display = target > 1 ? '' : 'none';

    // Update Next button text on last step
    if (target === TOTAL_STEPS) {
      nextBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Done';
      nextBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
    } else {
      nextBtn.innerHTML = 'Next <i class="bi bi-arrow-right ms-1"></i>';
      nextBtn.style.background = '';
    }

    currentStep = target;
  }

  // Next button
  nextBtn.addEventListener('click', () => {
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    } else {
      showCompletionPanel();
    }
  });

  // Prev button
  prevBtn.addEventListener('click', () => {
    goToStep(currentStep - 1, true);
  });

  // Clicking step indicator items navigates (only to completed or current)
  stepItems.forEach((item, i) => {
    item.addEventListener('click', () => {
      const target = i + 1;
      if (target <= currentStep) {
        goToStep(target, target < currentStep);
      }
    });
  });

  // ── Completion Panel ─────────────────────────────────────────────────────
  function showCompletionPanel() {
    // Mark all step indicators as completed
    stepItems.forEach(si => { si.classList.remove('active'); si.classList.add('completed'); });
    connectors.forEach(c => c.classList.add('completed'));
    dots.forEach(d => { d.classList.remove('active'); d.classList.add('done'); });

    // Hide panels + nav bar
    panels.forEach(p => p.classList.remove('active'));
    card.querySelector('.step-nav-bar').style.display = 'none';

    // Add green "Complete" badge to card header
    const headerNum = card.querySelector('.product-number');
    if (!card.querySelector('.product-done-badge')) {
      const badge = document.createElement('span');
      badge.className = 'product-done-badge';
      badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Complete';
      headerNum.after(badge);
    }

    // Re-show if already built
    const existing = card.querySelector('.completion-panel');
    if (existing) { existing.style.display = ''; return; }

    // Build completion panel
    const panel = document.createElement('div');
    panel.className = 'completion-panel';
    panel.innerHTML = `
      <div class="completion-inner">
        <div class="completion-icon-ring">
          <i class="bi bi-check2"></i>
        </div>
        <div class="completion-title">Product Complete!</div>
        <div class="completion-sub">All 4 steps are done.<br>What would you like to do next?</div>
        <div class="completion-actions">
          <button class="comp-btn comp-btn-add" id="compAdd_${productId}">
            <div class="comp-btn-icon"><i class="bi bi-plus-circle-fill"></i></div>
            <div class="comp-btn-text">
              <strong>Add Another Product</strong>
              <span>Start a new product card</span>
            </div>
          </button>
          <button class="comp-btn comp-btn-export" id="compExport_${productId}">
            <div class="comp-btn-icon"><i class="bi bi-cloud-upload-fill"></i></div>
            <div class="comp-btn-text">
              <strong>Upload &amp; Export CSV</strong>
              <span>Send all products to Shopify</span>
            </div>
          </button>
        </div>
        <button class="comp-edit-link" id="compEdit_${productId}">
          <i class="bi bi-pencil-square"></i> Edit this product
        </button>
      </div>
    `;

    card.querySelector('.product-card-body').appendChild(panel);
    // Animate in
    requestAnimationFrame(() => panel.classList.add('active'));

    // Add Another Product
    panel.querySelector(`#compAdd_${productId}`).addEventListener('click', () => {
      document.getElementById('addProductBtn')?.click();
      const cards = document.querySelectorAll('.product-card');
      cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Upload & Export
    panel.querySelector(`#compExport_${productId}`).addEventListener('click', () => {
      document.getElementById('submitAllBtn')?.click();
    });

    // Go back and edit
    panel.querySelector(`#compEdit_${productId}`).addEventListener('click', () => {
      panel.style.display = 'none';
      card.querySelector('.step-nav-bar').style.display = '';
      card.querySelector('.product-done-badge')?.remove();
      goToStep(1, true);
    });
  }
}


function renumberProducts() {
  products.forEach((p, i) => {
    const el = document.querySelector(`[data-product-id="${p.id}"] .product-number`);
    if (el) el.textContent = `Product #${i + 1}`;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   COLOR VARIANT MANAGEMENT
   ══════════════════════════════════════════════════════════════════════════ */
function addColor(productCard) {
  const tmpl = document.getElementById('colorTemplate').content.cloneNode(true);
  const block = tmpl.querySelector('.color-block');
  const colorId = 'color_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  block.dataset.colorId = colorId;

  // Color picker ↔ text swatch sync
  const picker = block.querySelector('.color-picker');
  const colorName = block.querySelector('.color-name');
  const swatch = block.querySelector('.color-swatch');
  const header = block.querySelector('.color-block-title');

  picker.addEventListener('input', () => { swatch.style.background = picker.value; });

  colorName.addEventListener('input', () => {
    const slug = slugify(colorName.value);
    header.textContent = colorName.value || 'Color';
    block.querySelector('.image-drop-zone').dataset.color = slug;
    block.querySelector('.video-drop-zone').dataset.color = slug;
  });

  // Remove color
  block.querySelector('.remove-color-btn').addEventListener('click', () => block.remove());

  // Collapse color block
  const collapseBtn = block.querySelector('.collapse-color-btn');
  const colorBody = block.querySelector('.color-block-body');
  collapseBtn.addEventListener('click', () => {
    const isHidden = colorBody.style.display === 'none';
    colorBody.style.display = isHidden ? '' : 'none';
    collapseBtn.innerHTML = isHidden
      ? '<i class="bi bi-chevron-up"></i>'
      : '<i class="bi bi-chevron-down"></i>';
  });

  // Image drop zone
  const dropZone = block.querySelector('.image-drop-zone');
  const fileInput = block.querySelector('.image-file-input');
  const previewGrid = block.querySelector('.image-previews-grid');
  const countBadge = block.querySelector('.img-count-badge');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleImageFiles([...e.dataTransfer.files], previewGrid, countBadge, colorId);
  });
  fileInput.addEventListener('change', () => {
    handleImageFiles([...fileInput.files], previewGrid, countBadge, colorId);
    fileInput.value = '';
  });

  // ── Video drop zone ─────────────────────────────────────────────────────
  const videoZone = block.querySelector('.video-drop-zone');
  const videoInput = block.querySelector('.video-file-input');
  const videoPreview = block.querySelector('.video-preview-wrap');
  const videoBadge = block.querySelector('.video-count-badge');

  videoZone.addEventListener('click', () => videoInput.click());
  videoZone.addEventListener('dragover', e => { e.preventDefault(); videoZone.classList.add('dragover'); });
  videoZone.addEventListener('dragleave', () => videoZone.classList.remove('dragover'));
  videoZone.addEventListener('drop', e => {
    e.preventDefault();
    videoZone.classList.remove('dragover');
    const vf = [...e.dataTransfer.files].find(f => f.type.startsWith('video/'));
    if (vf) handleVideoFile(vf, videoZone, videoPreview, videoBadge, colorId);
  });
  videoInput.addEventListener('change', () => {
    if (videoInput.files[0]) {
      handleVideoFile(videoInput.files[0], videoZone, videoPreview, videoBadge, colorId);
      videoInput.value = '';
    }
  });

  productCard.querySelector('.colors-container').appendChild(block);
}

/* ══════════════════════════════════════════════════════════════════════════
   SIZE MANAGEMENT
   ══════════════════════════════════════════════════════════════════════════ */
function addSize(container, name = '') {
  const tmpl = document.getElementById('sizeTemplate').content.cloneNode(true);
  const row = tmpl.querySelector('.size-row');
  if (name) row.querySelector('.size-name').value = name;
  row.querySelector('.remove-size-btn').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

/* ══════════════════════════════════════════════════════════════════════════
   IMAGE HANDLING (local preview)
   ══════════════════════════════════════════════════════════════════════════ */
function handleImageFiles(files, grid, badge, colorId) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      toast(`${file.name} is not an image.`, 'warn');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast(`${file.name} exceeds 5MB limit.`, 'warn');
      return;
    }

    // Convert every image to JPEG via canvas.
    // This guarantees the file bytes always match the .jpg extension,
    // even if the source is HEIC (iPhone), WebP, PNG, AVIF, etc.
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);

      // Always output as JPEG (0.92 quality) with a .jpg extension
      const jpegBase64 = canvas.toDataURL('image/jpeg', 0.92);
      // Build a safe filename with .jpg extension regardless of original
      const baseName = file.name.replace(/\.[^.]+$/, '');  // strip extension
      const safeJpgName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_') + '.jpg';

      const item = createPreviewItem(jpegBase64, safeJpgName, colorId);
      item.dataset.base64 = jpegBase64;
      item.dataset.fileName = safeJpgName;
      item.dataset.colorId = colorId;
      grid.appendChild(item);
      updateImgBadge(grid, badge);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast(`Could not read image: ${file.name}`, 'error');
    };
    img.src = objectUrl;
  });
}

function createPreviewItem(src, name, colorId) {
  const div = document.createElement('div');
  div.className = 'preview-item';
  div.innerHTML = `
    <img src="${src}" alt="${name}" loading="lazy" />
    <div class="preview-overlay">
      <button class="remove-img-btn" title="Remove"><i class="bi bi-x-lg"></i></button>
      <span style="color:#fff;font-size:10px;text-align:center;padding:2px 4px;word-break:break-all">${name}</span>
    </div>
    <div class="upload-status">Pending</div>
  `;
  div.querySelector('.remove-img-btn').addEventListener('click', () => {
    const grid = div.closest('.image-previews-grid');
    const badge = div.closest('.color-block-body').querySelector('.img-count-badge');
    div.remove();
    updateImgBadge(grid, badge);
  });
  return div;
}

function updateImgBadge(grid, badge) {
  const count = grid.querySelectorAll('.preview-item').length;
  badge.textContent = `${count} image${count !== 1 ? 's' : ''}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   VIDEO HANDLING (local preview)
   ══════════════════════════════════════════════════════════════════════════ */
function handleVideoFile(file, dropZone, previewWrap, badge, colorId) {
  const MAX_MB = 100;
  if (!file.type.startsWith('video/')) { toast(`${file.name} is not a video.`, 'warn'); return; }
  if (file.size > MAX_MB * 1024 * 1024) { toast(`${file.name} exceeds ${MAX_MB}MB limit.`, 'warn'); return; }

  // Remove existing preview if any (1 video per color)
  previewWrap.innerHTML = '';

  const objectUrl = URL.createObjectURL(file);
  const card = createVideoPreviewCard(objectUrl, file.name);

  // Store raw File so we can upload it later
  card.dataset.videoFileName = file.name;
  card.dataset.colorId = colorId;
  card._videoFile = file;   // keep raw File reference on the DOM node

  card.querySelector('.remove-video-btn').addEventListener('click', () => {
    URL.revokeObjectURL(objectUrl);
    card.remove();
    dropZone.classList.remove('has-video');
    badge.textContent = 'No video';
  });

  previewWrap.appendChild(card);
  dropZone.classList.add('has-video');
  badge.textContent = '1 video';
}

function createVideoPreviewCard(src, name) {
  const div = document.createElement('div');
  div.className = 'video-preview-card';
  div.innerHTML = `
    <video src="${src}" controls muted playsinline preload="metadata"></video>
    <div class="video-info">
      <span class="video-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
      <button class="remove-video-btn" title="Remove video"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="upload-status">Pending upload</div>
  `;
  return div;
}

/* ══════════════════════════════════════════════════════════════════════════
   GITHUB IMAGE UPLOAD
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Read a File object as a pure Base64 string (no data-URI prefix).
 * Works for both images and videos.
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result.split(',')[1]);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a single video File to GitHub via the Contents API.
 * Returns the raw CDN URL on success, or null on failure.
 */
async function uploadVideoToGitHub(productHandle, colorSlug, videoFile, cfg) {
  try {
    const MAX_MB = 99; // GitHub API hard limit is 100 MB
    if (videoFile.size > MAX_MB * 1024 * 1024) {
      toast(`Video "${videoFile.name}" exceeds ${MAX_MB} MB — cannot upload to GitHub.`, 'warn');
      return null;
    }

    const b64 = await readFileAsBase64(videoFile);

    // Derive the correct extension from the MIME type, not the filename.
    // This prevents extension/content mismatches (e.g. .mov uploaded as .mp4).
    const mimeToExt = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'video/ogg': 'ogv',
      'video/x-msvideo': 'avi',
      'video/x-matroska': 'mkv',
      'video/mpeg': 'mpeg',
    };
    const ext = mimeToExt[videoFile.type] || videoFile.name.split('.').pop().toLowerCase() || 'mp4';
    const baseName = videoFile.name.replace(/\.[^.]+$/, '');
    const safeFileName = sanitizeFileName(baseName) + '.' + ext;
    const path = `product-images/${productHandle}/${colorSlug}/${Date.now()}_${safeFileName}`;
    const apiUrl = `https://api.github.com/repos/${cfg.user}/${cfg.repo}/contents/${path}`;

    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${cfg.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Upload product video: ${videoFile.name}`,
        content: b64,
        branch: cfg.branch,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return `https://raw.githubusercontent.com/${cfg.user}/${cfg.repo}/${cfg.branch}/${path}`;
  } catch (err) {
    console.error('GitHub video upload error:', err);
    return null;
  }
}

async function uploadImagesToGitHub(productHandle, colorSlug, previewItems, cfg) {
  const urls = [];
  for (const item of previewItems) {
    const base64Full = item.dataset.base64;
    const fileName = item.dataset.fileName || 'image.jpg';
    const statusEl = item.querySelector('.upload-status');

    if (!base64Full) { urls.push(null); continue; }

    // Extract pure base64 (strip data URI header)
    const [, b64] = base64Full.split(',');
    const path = `product-images/${productHandle}/${colorSlug}/${Date.now()}_${sanitizeFileName(fileName)}`;
    const apiUrl = `https://api.github.com/repos/${cfg.user}/${cfg.repo}/contents/${path}`;

    statusEl.textContent = 'Uploading…';
    statusEl.className = 'upload-status';

    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: `Upload product image: ${fileName}`,
          content: b64,
          branch: cfg.branch,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const rawUrl = `https://raw.githubusercontent.com/${cfg.user}/${cfg.repo}/${cfg.branch}/${path}`;
      statusEl.textContent = '✓ Done';
      statusEl.className = 'upload-status done';
      urls.push(rawUrl);
    } catch (err) {
      statusEl.textContent = '✗ Error';
      statusEl.className = 'upload-status error';
      console.error('GitHub upload error:', err);
      urls.push(null);
    }
  }
  return urls;
}

/* ══════════════════════════════════════════════════════════════════════════
   DATA COLLECTION
   ══════════════════════════════════════════════════════════════════════════ */
function collectProductData(productCard) {
  const title = productCard.querySelector('.product-title').value.trim();
  const handle = slugify(title);
  const type = productCard.querySelector('.product-type').value.trim();
  const category = productCard.querySelector('.product-category').value.trim();
  const description = productCard.querySelector('.product-description').value.trim();
  const tags = productCard.querySelector('.product-tags').value.trim();
  const seoTitle = productCard.querySelector('.product-seo-title').value.trim();
  const seoDesc = productCard.querySelector('.product-seo-desc').value.trim();

  // ── Product-level sizes ───────────────────────────────
  const noSize = productCard.querySelector('.no-size-check').checked;
  const sizeRows = noSize ? [] : [...productCard.querySelectorAll('.sizes-container .size-row')];
  const sizes = sizeRows.flatMap(row => {
    const rawName = row.querySelector('.size-name').value.trim();
    const skuSuffix = row.querySelector('.size-sku').value.trim();
    const inventory = row.querySelector('.size-inventory').value.trim();
    const price = row.querySelector('.size-price').value.trim();

    // Auto-split comma-separated sizes: "12,11" → two variants "12" and "11"
    return rawName.split(',').map(n => n.trim()).filter(n => n).map(name => ({
      name,
      skuSuffix,  // same suffix base; will append name if suffix is blank
      inventory,
      price,
    }));
  }).filter(s => s.name);

  // ── Color variants (images, price, SKU, inventory only) ─────
  const colorBlocks = [...productCard.querySelectorAll('.color-block')];
  const colorVariants = colorBlocks.map(block => {
    const colorName = block.querySelector('.color-name').value.trim();
    const colorSlug = slugify(colorName);
    const sku = block.querySelector('.variant-sku').value.trim();
    const price = block.querySelector('.variant-price').value.trim();
    const compareAt = block.querySelector('.variant-compare-price').value.trim();
    const inventory = block.querySelector('.variant-inventory').value.trim() || '0';
    const images = [...block.querySelectorAll('.image-previews-grid .preview-item')];
    // Video card (0 or 1) — extract raw File immediately so it survives async phases
    const videoCard = block.querySelector('.video-preview-wrap .video-preview-card') || null;
    const videoFile = (videoCard && videoCard._videoFile) ? videoCard._videoFile : null;
    return { colorName, colorSlug, sku, price, compareAt, inventory, images, videoCard, videoFile };
  });

  return { title, handle, type, category, description, tags, seoTitle, seoDesc, noSize, sizes, colorVariants };
}

/* ==========================================================================
   CSV GENERATION — matches Shopify products_export format exactly
   ========================================================================== */
function buildCSVRows(productsData, uploadedImageMap, cfg) {
  const rows = [];

  productsData.forEach(prod => {
    let isFirstRow = true;
    let imgPos = 1;

    // Option1 = Size, Option2 = Color  (Shopify convention from sample CSV)
    const hasSize = !prod.noSize && prod.sizes.length > 0;
    const sizeList = hasSize ? prod.sizes : [null]; // null = no-size placeholder

    // Outer: sizes, inner: colors  (gives Size 8 Gold/Silver/Rose, Size 9 Gold/Silver/Rose )
    sizeList.forEach(size => {
      prod.colorVariants.forEach(color => {
        const uploadedUrls =
          (uploadedImageMap[prod.handle] && uploadedImageMap[prod.handle][color.colorSlug]) || [];
        const colorFirstImg = uploadedUrls[0] || '';

        // Each variant row gets its own Image Src (color photo)
        const rowImgSrc = colorFirstImg;
        const rowImgPos = rowImgSrc ? imgPos++ : '';

        // SKU: base + size part + color part
        let finalSku = color.sku;
        if (hasSize && size) {
          const sizePart = size.skuSuffix || ('-' + size.name);
          finalSku = color.sku + sizePart;
        }

        const finalPrice = (hasSize && size && size.price) ? size.price : color.price;
        const finalQty = (hasSize && size && size.inventory) ? size.inventory : color.inventory;

        const row = [
          /* Handle                          */ prod.handle,
          /* Title                           */ isFirstRow ? prod.title : '',
          /* Body (HTML)                     */ isFirstRow ? prod.description : '',
          /* Vendor                          */ isFirstRow ? cfg.vendor : '',
          /* Product Category                */ isFirstRow ? (prod.category || '') : '',
          /* Type                            */ isFirstRow ? prod.type : '',
          /* Tags                            */ isFirstRow ? prod.tags : '',
          /* Published                       */ isFirstRow ? settings.published : '',
          // Options
          /* Option1 Name                    */ hasSize ? 'Size' : (prod.colorVariants.length > 1 ? 'Color' : ''),
          /* Option1 Value                   */ hasSize ? (size ? size.name : '') : color.colorName,
          /* Option1 Linked To               */ '',
          /* Option2 Name                    */ hasSize ? 'Color' : '',
          /* Option2 Value                   */ hasSize ? color.colorName : '',
          /* Option2 Linked To               */ '',
          /* Option3 Name                    */ '',
          /* Option3 Value                   */ '',
          /* Option3 Linked To               */ '',
          // Variant core
          /* Variant SKU                     */ finalSku,
          /* Variant Grams                   */ '0.0',
          /* Variant Inventory Tracker       */ 'shopify',
          /* Variant Inventory Qty           */ finalQty,
          /* Variant Inventory Policy        */ settings.inventoryPolicy,
          /* Variant Fulfillment Service     */ settings.fulfillment,
          /* Variant Price                   */ finalPrice,
          /* Variant Compare At Price        */ color.compareAt,
          /* Variant Requires Shipping       */ settings.shipping,
          /* Variant Taxable                 */ settings.taxable,
          // Unit price (always blank)
          /* Unit Price Total Measure        */ '',
          /* Unit Price Total Measure Unit   */ '',
          /* Unit Price Base Measure         */ '',
          /* Unit Price Base Measure Unit    */ '',
          // Barcode
          /* Variant Barcode                 */ '',
          // Image
          /* Image Src                       */ rowImgSrc,
          /* Image Position                  */ rowImgPos,
          /* Image Alt Text                  */ '',
          // Misc
          /* Gift Card                       */ isFirstRow ? 'false' : '',
          /* SEO Title                       */ isFirstRow ? prod.seoTitle : '',
          /* SEO Description                 */ isFirstRow ? prod.seoDesc : '',
          // Variant tail
          /* Variant Image                   */ colorFirstImg,
          /* Variant Weight Unit             */ 'kg',
          /* Variant Tax Code                */ '',
          /* Cost per item                   */ '',

          /* Status                          */ isFirstRow ? 'active' : '',
        ];

        rows.push(row);
        isFirstRow = false;

        // Extra images for this color -> image-only rows
        uploadedUrls.slice(1).forEach(imgUrl => {
          const blankRow = new Array(CSV_HEADERS.length).fill('');
          blankRow[0] = prod.handle;
          blankRow[CSV_HEADERS.indexOf('Image Src')] = imgUrl;
          blankRow[CSV_HEADERS.indexOf('Image Position')] = imgPos++;
          rows.push(blankRow);
        });
      }); // end colorVariants.forEach
    }); // end sizeList.forEach
  }); // end productsData.forEach

  return rows;
}

/* ══════════════════════════════════════════════════════════════════════════
   PREVIEW CSV
   ══════════════════════════════════════════════════════════════════════════ */
function previewCSV() {
  const cfg = getConfig();
  if (!validateConfig(cfg, { imagesRequired: false })) return;

  const productsData = [];
  const errors = [];
  const previewHandleRegistry = new Set(); // local registry just for preview pass

  for (const { element } of products) {
    const data = collectProductData(element);
    if (!data.title) { errors.push('A product is missing a Title.'); continue; }
    // ── Deduplicate handle in preview pass ──────────────────
    data.handle = uniqueHandle(data.handle, previewHandleRegistry);
    productsData.push(data);
  }

  if (errors.length) { toast(errors[0], 'error'); return; }

  // Build placeholder image map so preview shows token URLs
  const previewMap = {};
  productsData.forEach(p => {
    previewMap[p.handle] = {};
    p.colorVariants.forEach(c => {
      previewMap[p.handle][c.colorSlug] = c.images.map((_, i) => `[image-${i + 1}]`);
    });
  });

  const rows = buildCSVRows(productsData, previewMap, cfg);

  // Render table
  const thead = document.getElementById('csvPreviewHead');
  const tbody = document.getElementById('csvPreviewBody');
  thead.innerHTML = `<tr>${CSV_HEADERS.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  tbody.innerHTML = rows.map(r =>
    `<tr>${r.map(cell => `<td title="${escapeHtml(String(cell ?? ''))}">` +
      `${escapeHtml(String(cell ?? '')).substring(0, 55)}</td>`).join('')}</tr>`
  ).join('');

  document.getElementById('csvRowCount').textContent =
    `${rows.length} data row${rows.length !== 1 ? 's' : ''}`;

  window._csvData = { rows, productsData };
  new bootstrap.Modal(document.getElementById('csvPreviewModal')).show();
}

/* ─── Download CSV ────────────────────────────────────────────────────────── */
function downloadCSV() {
  if (!window._csvData) { toast('No CSV data yet — run Upload & Export first.', 'warn'); return; }
  const { rows } = window._csvData;
  triggerCSVDownload(rows);
  toast('CSV downloaded!', 'success');
}

function triggerCSVDownload(rows) {
  const csvContent = [CSV_HEADERS, ...rows]
    .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shopify-products-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN SUBMIT — Upload Images → Build CSV → Download
   ══════════════════════════════════════════════════════════════════════════ */
async function handleSubmitAll() {
  const cfg = getConfig();
  if (!validateConfig(cfg)) return;

  const productsData = [];
  const skuErrors = [];
  usedSKUs.clear();
  usedHandles.clear(); // ← reset handle registry on every submit

  for (const { element } of products) {
    const data = collectProductData(element);
    if (!data.title) { toast('A product has no title.', 'error'); return; }
    if (!data.handle) { toast(`Could not generate handle for "${data.title}".`, 'error'); return; }

    // ── Deduplicate handle globally ──────────────────────────
    data.handle = uniqueHandle(data.handle, usedHandles);

    // SKU duplicate check (sizes live at product level)
    for (const color of data.colorVariants) {
      const hasSize = !data.noSize && data.sizes && data.sizes.length > 0;
      const skusToCheck = !hasSize
        ? [color.sku]
        : data.sizes.map(s => s.skuSuffix ? `${color.sku}${s.skuSuffix}` : `${color.sku}-${s.name}`);

      for (const sku of skusToCheck) {
        if (!sku) continue;
        if (usedSKUs.has(sku)) skuErrors.push(sku);
        else usedSKUs.add(sku);
      }
    }
    productsData.push(data);
  }

  if (skuErrors.length) {
    toast(`Duplicate SKUs: ${skuErrors.join(', ')}`, 'error');
    return;
  }

  // Reset & show progress modal
  document.getElementById('progressLog').innerHTML = '';
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressStatus').textContent = 'Initializing…';
  const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
  progressModal.show();

  const totalImages = productsData.reduce((acc, p) =>
    acc + p.colorVariants.reduce((a, c) => a + c.images.length, 0), 0);
  let doneImages = 0;
  const uploadedImageMap = {};

  setProgress(0, `Uploading 0 / ${totalImages} images…`);
  logProgress('Starting GitHub image uploads…', 'info');

  /* ── Phase 1: Upload images + videos ────────────────── */
  for (const prod of productsData) {
    uploadedImageMap[prod.handle] = {};

    for (const color of prod.colorVariants) {
      uploadedImageMap[prod.handle][color.colorSlug] = [];

      // Upload images
      if (color.images.length > 0) {
        logProgress(`Uploading images: “${prod.title}” / ${color.colorName}…`, 'info');
        const urls = await uploadImagesToGitHub(prod.handle, color.colorSlug, color.images, cfg);
        uploadedImageMap[prod.handle][color.colorSlug] = urls.filter(Boolean);
        doneImages += color.images.length;
        const pct = Math.round((doneImages / Math.max(totalImages, 1)) * 60);
        setProgress(pct, `Uploaded ${doneImages} / ${totalImages} images`);
        logProgress(`✓ ${color.colorName}: ${urls.filter(Boolean).length}/${urls.length} images`, 'success');
      }

      // Upload video (1 per color) — use color.videoFile (plain File ref, not DOM node)
      if (color.videoFile) {
        const vf = color.videoFile;
        logProgress(`Uploading video: "${prod.title}" / ${color.colorName} — ${vf.name}…`, 'info');
        setProgress(65, `Uploading video for ${color.colorName}…`);

        // Update the status badge on the DOM card if it still exists
        const statusEl = color.videoCard
          ? color.videoCard.querySelector('.upload-status')
          : null;
        if (statusEl) { statusEl.textContent = 'Uploading…'; statusEl.className = 'upload-status'; }

        const videoUrl = await uploadVideoToGitHub(prod.handle, color.colorSlug, vf, cfg);
        if (videoUrl) {
          // Append video URL after images in the map — buildCSVRows will add it as an extra-media row
          uploadedImageMap[prod.handle][color.colorSlug].push(videoUrl);
          if (statusEl) { statusEl.textContent = '✓ Uploaded'; statusEl.className = 'upload-status done'; }
          logProgress(`✓ Video uploaded: ${vf.name}`, 'success');
        } else {
          if (statusEl) { statusEl.textContent = '✗ Failed'; statusEl.className = 'upload-status error'; }
          logProgress(`✗ Video upload failed: ${vf.name}`, 'error');
        }
      }
    }
  }

  /* ── Phase 2: Build CSV ─────────────────────────────────── */
  setProgress(75, 'Building CSV rows…');
  const rows = buildCSVRows(productsData, uploadedImageMap, cfg);
  window._csvData = { rows, productsData };

  /* ── Phase 3: Google Sheets (optional, best-effort) ────────── */
  if (cfg.sheetsUrl) {
    setProgress(80, 'Sending to Google Sheets…');
    logProgress('Sending data to Google Sheets…', 'info');
    try {
      const formData = new URLSearchParams();
      formData.append('payload', JSON.stringify({ headers: CSV_HEADERS, rows }));
      await fetch(cfg.sheetsUrl, { method: 'POST', mode: 'no-cors', body: formData });
      logProgress(`✓ Google Sheets: ${rows.length} rows sent`, 'success');
    } catch (err) {
      logProgress(`⚠ Google Sheets skipped: ${err.message}`, 'warn');
    }
  }

  /* ── Phase 4: Download CSV ──────────────────────────────────── */
  setProgress(95, 'Generating CSV…');
  logProgress('Preparing CSV download…', 'info');
  triggerCSVDownload(rows);

  setProgress(100, 'All done!');
  logProgress(`✓ CSV downloaded — ${rows.length} rows. Import into Shopify!`, 'success');
  toast(`✓ Done — ${rows.length} rows — CSV downloaded`, 'success');
  setTimeout(() => progressModal.hide(), 2800);
}

/* ══════════════════════════════════════════════════════════════════════════
   GITHUB IMAGE UPLOAD
   ══════════════════════════════════════════════════════════════════════════ */
async function uploadImagesToGitHub(productHandle, colorSlug, previewItems, cfg) {
  const urls = [];
  for (const item of previewItems) {
    const base64Full = item.dataset.base64;
    const fileName = item.dataset.fileName || 'image.jpg';
    const statusEl = item.querySelector('.upload-status');

    if (!base64Full) { urls.push(null); continue; }

    const [, b64] = base64Full.split(',');
    const path = `product-images/${productHandle}/${colorSlug}/${Date.now()}_${sanitizeFileName(fileName)}`;
    const apiUrl = `https://api.github.com/repos/${cfg.user}/${cfg.repo}/contents/${path}`;

    statusEl.textContent = 'Uploading…';
    statusEl.className = 'upload-status';

    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: `Upload product image: ${fileName}`,
          content: b64,
          branch: cfg.branch,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const rawUrl = `https://raw.githubusercontent.com/${cfg.user}/${cfg.repo}/${cfg.branch}/${path}`;
      statusEl.textContent = '✓ Done';
      statusEl.className = 'upload-status done';
      urls.push(rawUrl);
    } catch (err) {
      statusEl.textContent = '✗ Error';
      statusEl.className = 'upload-status error';
      console.error('GitHub upload error:', err);
      urls.push(null);
    }
  }
  return urls;
}

/* ══════════════════════════════════════════════════════════════════════════
   VALIDATION
   ══════════════════════════════════════════════════════════════════════════ */
function validateConfig(cfg, opts = { imagesRequired: true }) {
  if (!cfg.vendor) { toast('Please enter a Vendor / Brand Name.', 'error'); return false; }
  if (!cfg.sheetsUrl) { toast('Please enter the Google Apps Script URL.', 'error'); return false; }
  if (opts.imagesRequired !== false) {
    if (!cfg.token) { toast('Please enter your GitHub Token.', 'error'); return false; }
    if (!cfg.user) { toast('Please enter your GitHub Username.', 'error'); return false; }
    if (!cfg.repo) { toast('Please enter your GitHub Repository.', 'error'); return false; }
  }
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   PROGRESS MODAL HELPERS
   ══════════════════════════════════════════════════════════════════════════ */
function setProgress(pct, status) {
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressStatus').textContent = status;
}

function logProgress(msg, type = 'info') {
  const log = document.getElementById('progressLog');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const icons = { success: '✓', error: '✗', warn: '⚠', info: '›' };
  entry.textContent = `${icons[type] || '›'} ${msg}`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

/* ══════════════════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ══════════════════════════════════════════════════════════════════════════ */
function toast(message, type = 'info') {
  const colorMap = {
    success: { bg: '#2ecc71', icon: 'bi-check-circle-fill' },
    error: { bg: '#e74c3c', icon: 'bi-x-circle-fill' },
    warn: { bg: '#f39c12', icon: 'bi-exclamation-triangle-fill' },
    info: { bg: '#5c6ac4', icon: 'bi-info-circle-fill' },
  };
  const { bg, icon } = colorMap[type] || colorMap.info;

  const div = document.createElement('div');
  div.className = 'toast align-items-center text-white border-0 show';
  div.style.cssText = `background:${bg};`;
  div.setAttribute('role', 'alert');
  div.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icon}"></i>${escapeHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"
              data-bs-dismiss="toast"></button>
    </div>`;

  document.getElementById('toastContainer').appendChild(div);
  new bootstrap.Toast(div, { delay: 4000 }).show();
  div.addEventListener('hidden.bs.toast', () => div.remove());
}

/* ══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/** Shopify-style URL handle */
function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Safe filename for GitHub paths */
function sanitizeFileName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

/** Escape HTML for safe rendering */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ══════════════════════════════════════════════════════════════════════════
   ✨ UX ENHANCEMENTS — makes the app feel alive & fun
   ══════════════════════════════════════════════════════════════════════════ */

/* ─── Live Stats Counter ─────────────────────────────────────────────────── */
function updateStats() {
  const products = document.querySelectorAll('.product-card').length;
  const colors = document.querySelectorAll('.color-block').length;
  const images = document.querySelectorAll('.preview-item').length;
  const videos = document.querySelectorAll('.video-preview-card').length;

  animateCounter('statProducts', products);
  animateCounter('statColors', colors);
  animateCounter('statImages', images);
  animateCounter('statVideos', videos);
}

function animateCounter(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const step = target > current ? 1 : -1;
  const duration = Math.min(Math.abs(target - current) * 40, 400);
  const steps = Math.abs(target - current);
  const interval = duration / steps;
  let val = current;
  const timer = setInterval(() => {
    val += step;
    el.textContent = val;
    if (val === target) clearInterval(timer);
  }, interval);
}

// Observe mutations to update stats whenever cards/images change
const _statsObserver = new MutationObserver(() => updateStats());
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('productsContainer');
  if (container) {
    _statsObserver.observe(container, { childList: true, subtree: true });
  }
});

/* ─── Floating Emoji Cycle in Banner ─────────────────────────────────────── */
const _bannerEmojis = ['💎', '✨', '💍', '🛍️', '🌟', '🪙', '👑', '🎀'];
let _emojiIdx = 0;
setInterval(() => {
  const el = document.querySelector('.banner-emoji');
  if (!el) return;
  el.style.transform = 'scale(0.5) rotate(-10deg)';
  el.style.opacity = '0';
  el.style.transition = 'all .3s ease';
  setTimeout(() => {
    _emojiIdx = (_emojiIdx + 1) % _bannerEmojis.length;
    el.textContent = _bannerEmojis[_emojiIdx];
    el.style.transform = 'scale(1) rotate(0deg)';
    el.style.opacity = '1';
  }, 320);
}, 3500);

/* ─── Keyboard Shortcut: Ctrl + Enter = Add Product ─────────────────────── */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('addProductBtn')?.click();
    showShortcutToast('⌨️ Product added via Ctrl + Enter!');
  }
  // Ctrl + Shift + S = Save Settings
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    document.getElementById('saveSettingsBtn')?.click();
    showShortcutToast('💾 Settings saved!');
  }
});

function showShortcutToast(msg) {
  toast(msg, 'info');
}

/* ─── Ripple Effect on All Buttons ──────────────────────────────────────── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn:not(.btn-ghost):not(.btn-close)');
  if (!btn) return;
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  const rect = btn.getBoundingClientRect();
  ripple.style.left = (e.clientX - rect.left - 30) + 'px';
  ripple.style.top = (e.clientY - rect.top - 30) + 'px';
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}, true);

/* ─── Confetti Burst on Successful Upload ───────────────────────────────── */
function launchConfetti() {
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none;
      width:${6 + Math.random() * 8}px; height:${6 + Math.random() * 8}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      left:${Math.random() * 100}vw; top:-10px;
      opacity:1; transform:rotate(${Math.random() * 360}deg);
    `;
    document.body.appendChild(el);

    const duration = 1200 + Math.random() * 1800;
    const endTop = 50 + Math.random() * 60;
    const swayX = (Math.random() - .5) * 200;
    const startTime = performance.now();

    function tick(now) {
      const p = (now - startTime) / duration;
      if (p >= 1) { el.remove(); return; }
      el.style.top = (p * endTop) + 'vh';
      el.style.left = `calc(${parseFloat(el.style.left)} + ${swayX * p}px)`;
      el.style.opacity = 1 - p;
      el.style.transform = `rotate(${p * 720}deg)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
}

// Hook confetti into the existing toast function — fire when success upload
const _origToast = window.toast;
// We'll patch the upload complete toast in handleSubmitAll
// by intercepting the 'All products exported' message
const _origHandleSubmitAll = window.handleSubmitAll;

/* ─── Tooltip Hints on form labels ──────────────────────────────────────── */
const FIELD_HINTS = {
  'product-title': '💡 A clear, keyword-rich title boosts SEO',
  'product-type': '🏷️ Jewelry type for Shopify collections',
  'product-category': '📂 Shopify Google category taxonomy',
  'product-tags': '🔖 Comma-separated tags help filter products',
  'product-seo-title': '🔍 Ideal length: 50–60 characters',
  'product-seo-desc': '🔍 Ideal length: 120–160 characters',
  'variant-sku': '🔑 Unique identifier — no spaces allowed',
  'variant-price': '💰 Base price in ₹ for this color',
  'color-name': '🎨 Exact color name used in variant options',
};

function attachFieldHints(card) {
  for (const [cls, hint] of Object.entries(FIELD_HINTS)) {
    const el = card.querySelector('.' + cls);
    if (!el) continue;
    el.title = hint;
    el.addEventListener('focus', () => {
      let tip = el.parentElement.querySelector('.field-tip');
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'field-tip';
        tip.style.cssText = `
          font-size:11px; color:#6366f1; margin-top:3px;
          animation:fadeInPage .2s ease; font-weight:500;
        `;
        el.parentElement.appendChild(tip);
      }
      tip.textContent = hint;
    });
    el.addEventListener('blur', () => {
      el.parentElement.querySelector('.field-tip')?.remove();
    });
  }
}

// attachFieldHints and updateStats are now called directly inside addProduct above.

/* ─── Character counter for SEO fields ───────────────────────────────────── */
function attachCharCounter(input, max) {
  const counter = document.createElement('small');
  counter.style.cssText = 'float:right;font-size:10px;color:#94a3b8;';
  counter.textContent = `0/${max}`;
  input.parentElement.insertBefore(counter, input);

  input.addEventListener('input', () => {
    const len = input.value.length;
    counter.textContent = `${len}/${max}`;
    counter.style.color = len > max ? '#ef4444'
      : len > max * .85 ? '#f59e0b'
        : '#10b981';
  });
}

// Attach char counters after DOM is ready (they're in the template so we
// use a MutationObserver so it fires for every added product card)
const _charObserver = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      const seoTitle = node.querySelector?.('.product-seo-title');
      const seoDesc = node.querySelector?.('.product-seo-desc');
      if (seoTitle) attachCharCounter(seoTitle, 60);
      if (seoDesc) attachCharCounter(seoDesc, 160);
      attachFieldHints(node);
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('productsContainer');
  if (container) {
    _charObserver.observe(container, { childList: true, subtree: false });
  }
});

/* ─── Confetti on successful export ──────────────────────────────────────── */
// Intercept the progress log success message
const _origLog = window.logEntry;
document.addEventListener('DOMContentLoaded', () => {
  // Watch submit button for completion indication via statusBadge text change
  const badge = document.getElementById('statusBadge');
  if (!badge) return;
  let _prevText = badge.textContent;
  new MutationObserver(() => {
    const txt = badge.textContent;
    if (txt !== _prevText && txt.includes('Ready') && _prevText.includes('…')) {
      launchConfetti();
    }
    _prevText = txt;
  }).observe(badge, { childList: true, subtree: true, characterData: true });
});

/* ─── Smooth scroll-to-top shortcut ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const fabWrapper = document.createElement('button');
  fabWrapper.id = 'scrollTopFab';
  fabWrapper.innerHTML = '<i class="bi bi-arrow-up-short"></i>';
  fabWrapper.title = 'Scroll to top';
  fabWrapper.style.cssText = `
    position:fixed; bottom:90px; right:24px; width:44px; height:44px;
    border-radius:50%; border:none; cursor:pointer;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    color:#fff; font-size:22px; display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 20px rgba(99,102,241,.45); z-index:998;
    transition:all .25s cubic-bezier(.4,0,.2,1);
    opacity:0; transform:translateY(20px) scale(.8); pointer-events:none;
  `;
  fabWrapper.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  fabWrapper.addEventListener('mouseenter', () => {
    fabWrapper.style.transform = 'translateY(-4px) scale(1.1)';
    fabWrapper.style.boxShadow = '0 8px 30px rgba(99,102,241,.65)';
  });
  fabWrapper.addEventListener('mouseleave', () => {
    fabWrapper.style.transform = 'translateY(0) scale(1)';
    fabWrapper.style.boxShadow = '0 4px 20px rgba(99,102,241,.45)';
  });
  document.body.appendChild(fabWrapper);

  window.addEventListener('scroll', () => {
    const show = window.scrollY > 300;
    fabWrapper.style.opacity = show ? '1' : '0';
    fabWrapper.style.transform = show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(.8)';
    fabWrapper.style.pointerEvents = show ? 'auto' : 'none';
  }, { passive: true });
});

/* ─── Welcome banner tip rotation ───────────────────────────────────────── */
const _tips = [
  'Tip: Press <b>Ctrl+Enter</b> to instantly add a new product! 🚀',
  'Tip: Drag &amp; drop multiple images at once into the drop zone! 🖼️',
  'Tip: Use comma-separated sizes like <b>6,7,8,9</b> in the quick-add box! ⚡',
  'Tip: Collapse any product card to keep the view tidy! 📌',
  'Tip: Every image is auto-converted to JPEG for Shopify compatibility! 🔄',
];
let _tipIdx = 0;
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.querySelector('.welcome-banner p');
  if (!banner) return;
  const originalText = banner.innerHTML;
  let _inTip = false;

  setInterval(() => {
    if (!document.getElementById('page-lister')?.classList.contains('active')) return;
    _inTip = !_inTip;
    banner.style.transition = 'opacity .3s ease';
    banner.style.opacity = '0';
    setTimeout(() => {
      banner.innerHTML = _inTip ? _tips[_tipIdx % _tips.length] : originalText;
      if (_inTip) _tipIdx++;
      banner.style.opacity = '1';
    }, 300);
  }, 6000);
});

