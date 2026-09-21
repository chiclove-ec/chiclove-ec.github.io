# Search Console and Critical Image Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current visual site while improving first-render performance for the homepage and product pages and validating the Search Console fixes already merged into the generated structured data.

**Architecture:** Keep the existing static HTML-first architecture and catalog generators. Add only declarative, same-origin image preloads for the single above-the-fold hero image on the homepage and the active product page. Do not add stock, reviews, delivery promises, or return-fee claims that the business does not publish.

**Tech Stack:** Static HTML, vanilla JavaScript, Node.js `node:test`, existing generation/build scripts, GitHub Pages and Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-16-navigation-performance-design.md`, plus the approved Search Console constraints in this task.

## Global Constraints

- Do not change colors, typography, spacing, images, keyframes, animation durations, easing curves, or visible copy.
- Do not invent `availability`, `aggregateRating`, `review`, `deliveryTime`, or `returnFees` values.
- Keep the canonical origin `https://chiclove-ec.com`; `www.chiclove-ec.com` remains an alias that redirects to it.
- Keep the server-rendered HTML fallback, generated catalog, consented analytics, WhatsApp checkout, and all existing routes.
- Run `npm run gen` after changing generation inputs and require it to be idempotent.

## Review Focus

- The homepage must preload exactly its main hero image, not every product image: covered by Task 1's homepage preload test.
- Each generated product page must preload only that product's hero image and use the same responsive candidates as `product-page.js`: covered by Task 1's generator test.
- Preload links must stay same-origin and must not create fake structured-data inventory: covered by Task 1's safety assertions.
- Generated HTML, markdown, JSON-LD, and cache-busting output must remain synchronized: covered by Task 3's full check.
- Mobile menu, cart, filters, product variants, and reveal animations must remain unchanged: covered by Task 3's browser verification.

### Task 1: Add failing preload regression tests

**Files:**
- Modify: `tests/home-seo.test.mjs`
- Modify: `tests/structured-data.test.mjs`
- Create: none

**Interfaces:**
- Consumes: existing generated `index.html`, generated product pages, and `js/products.js` catalog data.
- Produces: assertions that constrain critical image preloads without requiring a visual/layout change.

- [ ] **Step 1: Add the failing tests**

Add one homepage assertion for a single preload whose `href`, `imagesrcset`, `imagesizes`, and `fetchpriority` match the current hero image. Add a generated-product assertion that every catalog product page contains one preload for `product.heroSmall` and `product.hero`, with the same sizes string used by `js/product-page.js`, and that no product page contains a preload for another product.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/home-seo.test.mjs tests/structured-data.test.mjs`

Expected: FAIL because the current pages do not declare these preload links.

- [ ] **Step 3: Commit the red tests**

```bash
git add tests/home-seo.test.mjs tests/structured-data.test.mjs
git commit -m "test: cover critical hero image preloads"
```

### Task 2: Add minimal same-origin hero preloads

**Files:**
- Modify: `index.html:35` before the favicon link
- Modify: `scripts/gen-products.mjs` in the product-page generation loop before the favicon link
- Regenerate: the seven product HTML pages and any generated artifacts changed by `npm run gen`

**Interfaces:**
- Consumes: existing catalog fields `hero`, `heroSmall`, and `product.id`; existing responsive size contract from `js/product-page.js`.
- Produces: one declarative preload on the homepage and one per generated product page, without changing body markup, CSS, JavaScript, or visible copy.

- [ ] **Step 1: Add the homepage preload**

Insert the exact responsive preload for the existing primary homepage bottle:

```html
<link rel="preload" as="image" href="assets/img/splash-hair-nails-640.webp" imagesrcset="assets/img/splash-hair-nails-640.webp 640w, assets/img/splash-hair-nails.webp 1107w" imagesizes="(max-width: 720px) 58vw, (max-width: 1024px) 330px, 455px" fetchpriority="high">
```

Place it in `<head>` before the favicon, leaving all existing image markup and animation classes untouched.

- [ ] **Step 2: Add the generated product preload**

In `scripts/gen-products.mjs`, build the following string from the current product and insert it before the favicon link for each generated page:

```js
const heroPreload = '<link rel="preload" as="image" href="' + esc(p.heroSmall) + '" imagesrcset="' + esc(p.heroSmall) + ' 640w, ' + esc(p.hero) + ' 1080w" imagesizes="(max-width: 720px) 70vw, (max-width: 1024px) 440px, 500px" fetchpriority="high">';
```

The generated preload must use the same responsive candidates and sizes as the runtime `pd-img`, and it must remain same-origin relative to the page.

- [ ] **Step 3: Regenerate and inspect the diff**

Run: `npm run gen`

Expected: the seven product HTML pages contain only their own preload addition; no visible body content, CSS, image assets, markdown, catalog values, or JSON-LD claims change.

- [ ] **Step 4: Run focused tests and the full suite**

Run: `node --test tests/home-seo.test.mjs tests/structured-data.test.mjs && npm test`

Expected: all focused and full tests pass with zero failures.

- [ ] **Step 5: Commit the implementation**

```bash
git add index.html scripts/gen-products.mjs '*.html' tests/home-seo.test.mjs tests/structured-data.test.mjs
git commit -m "perf: preload critical hero images"
```

### Task 3: Verify build, visual behavior, public redirects, and deployment readiness

**Files:**
- Modify: none unless a verification exposes a regression

**Interfaces:**
- Consumes: the committed preload implementation and existing `verify` workflow.
- Produces: fresh evidence for build correctness, unchanged browser flows, canonical redirects, `www` reachability, and live structured data.

- [ ] **Step 1: Run repository verification**

Run: `npm run gen && npm run check`

Expected: generation is idempotent, the GitHub build succeeds, and the full Node suite passes.

- [ ] **Step 2: Run the production-shaped browser checks**

Run the existing `verify` flows against `http://localhost:8765` after `npm run build && npm run serve`: homepage cards/cart, store filters, product variants/related products, invalid legacy product fallback, and 390px mobile menu with zero horizontal overflow. Capture desktop and mobile screenshots and confirm the body/visual state is unchanged apart from network prioritization.

- [ ] **Step 3: Verify the public origins and structured data**

Check `http://chiclove-ec.com/`, `https://www.chiclove-ec.com/`, `https://chiclove-ec.com/nosotros.html`, and their final locations. Check live `https://chiclove-ec.com/anti-stress` for the product JSON-LD: no invented availability or ratings, no base-price expiry, and real shipping/return facts present.

- [ ] **Step 4: Publish and validate the merged branch**

Push the feature branch, ensure the GitHub checks pass, merge into `main`, and wait for the configured Pages/Cloudflare deployments. Re-run the public checks at `www.chiclove-ec.com` and `chiclove-ec.com`; then re-open Search Console to document the current post-deploy state. Do not claim Search Console warnings are gone until Google has re-crawled the new pages.

- [ ] **Step 5: Commit no data fabrication**

Leave Search Console warnings for stock, ratings, delivery times, or return fees documented if they remain; they require real business data or a later Google crawl, not markup invented to make the report green.
