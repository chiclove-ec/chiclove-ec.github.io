# Navigation Performance Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make internal navigation and scrolling feel immediate by removing redundant initial DOM/image work while preserving the existing visual design and animation behavior.

**Architecture:** Keep the server-rendered product cards as the first-render source of truth and progressively hydrate their interactive behavior. Dynamic filters and product exclusions continue to use the existing card renderer. A single frame-coalesced scroll scheduler serves page-level subscribers, and a small same-origin intent prefetcher prepares likely next documents without changing navigation semantics.

**Tech Stack:** Vanilla JavaScript, static HTML generation, CSS unchanged, Node.js `node:test`, Playwright CLI, GitHub Pages/Cloudflare build scripts.

**Spec:** `docs/superpowers/specs/2026-09-16-navigation-performance-design.md`

## Global Constraints

- Do not change colors, typography, spacing, images, keyframes, animation durations, easing curves, or visual copy.
- Do not add a runtime dependency or convert the site to an SPA.
- Preserve the no-JavaScript HTML fallback and existing cart, analytics, filter, and product flows.
- Run `npm run gen` after any catalog or generated-content change; this work should not modify catalog data.
- Every production-code behavior change must have a regression test or a browser-flow assertion.

---

### Task 1: Add regression coverage for first-render preservation and navigation helpers

**Files:**
- Create: `tests/navigation-performance.test.mjs`
- Modify: `js/main.js:670-715,874-934` only after the tests are red

**Interfaces:**
- Consumes: exported test seams added to `js/main.js` through a guarded `globalThis.__CL_TEST__` object.
- Produces: assertions for `expectedGridProductIds`, `canHydrateGrid`, `hydrateProductCard`, `shouldPrefetchUrl`, and `createScrollScheduler` behavior used by later tasks.

- [ ] **Step 1: Write failing tests for the intended seams**

```js
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const mainSource = readFileSync(resolve("js/main.js"), "utf8");

test("initial product grids can be hydrated without clearing existing cards", () => {
  assert.match(mainSource, /function canHydrateGrid\(/);
  assert.match(mainSource, /function hydrateProductCard\(/);
  assert.match(mainSource, /canHydrateGrid\(grid, list\)/);
  assert.doesNotMatch(mainSource, /grid\.textContent = "";[\s\S]{0,180}canHydrateGrid/);
});

test("dynamic product updates still clear and rebuild the grid", () => {
  assert.match(mainSource, /if \(!canHydrateGrid\(grid, list\)\)/);
  assert.match(mainSource, /grid\.textContent = "";/);
});

test("intent prefetch rejects unsafe or irrelevant URLs", () => {
  assert.match(mainSource, /function shouldPrefetchUrl\(/);
  assert.match(mainSource, /rel = "prefetch"/);
  assert.match(mainSource, /saveData/);
});

test("scroll work is coalesced with requestAnimationFrame", () => {
  assert.match(mainSource, /function createScrollScheduler\(/);
  assert.match(mainSource, /requestAnimationFrame\(flush\)/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails for missing seams**

Run: `node --test tests/navigation-performance.test.mjs`

Expected: FAIL because `canHydrateGrid`, `hydrateProductCard`, `shouldPrefetchUrl`, and `createScrollScheduler` are not yet present.

- [ ] **Step 3: Commit the red tests**

```bash
git add tests/navigation-performance.test.mjs
git commit -m "test: cover navigation performance seams"
```

### Task 2: Hydrate server-rendered product cards instead of rebuilding them initially

**Files:**
- Modify: `js/main.js:527-600,670-689,874-884`
- Test: `tests/navigation-performance.test.mjs`

**Interfaces:**
- Consumes: `CL_PRODUCTS`, `clActivePromo`, `cartAdd`, `observeReveals`, and `observeLazyImages` already defined in the page runtime.
- Produces: `expectedGridProductIds(grid)`, `canHydrateGrid(grid, list)`, `hydrateProductCard(card, product)`, and a `renderGrids()` path that preserves matching server HTML on initial load.

- [ ] **Step 1: Add tests for exact product ordering and one-time hydration markers**

```js
test("the hydration contract compares product order, limit, and exclusion", () => {
  assert.match(mainSource, /function expectedGridProductIds\(grid\)/);
  assert.match(mainSource, /data-hydrated-card/);
  assert.match(mainSource, /data-analytics-item/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/navigation-performance.test.mjs`

Expected: FAIL because the helper and hydration marker do not exist.

- [ ] **Step 3: Implement minimal hydration helpers**

Implement `expectedGridProductIds(grid)` by applying the existing filter, limit, and exclude rules to `CL_PRODUCTS` and returning the resulting IDs. Implement `canHydrateGrid(grid, list)` by comparing the existing `[data-product-id]` IDs with `list.map(p => p.id)` and rejecting a grid with a stale promo class or wrong card count.

Implement `hydrateProductCard(card, product)` without touching its image node:

```js
function hydrateProductCard(card, product) {
  card.setAttribute("data-hydrated-card", "true");
  var links = card.querySelectorAll(".pcard-img, .pcard-body h2 a, .pcard-body h3 a");
  links.forEach(function (link) {
    link.setAttribute("data-analytics-item", product.id);
    link.setAttribute("data-analytics-item-name", product.name);
    link.setAttribute("data-analytics-item-category", product.goalLabel);
  });
  var action = card.querySelector(".add-btn");
  if (!action || action.dataset.hydratedAction === "true") return;
  var button = document.createElement("button");
  button.type = "button";
  button.className = action.className;
  button.textContent = "Añadir";
  button.setAttribute("aria-label", "Añadir " + product.name + " al carrito");
  button.dataset.hydratedAction = "true";
  button.addEventListener("click", function () { cartAdd(product.id, "uno", 1); });
  action.replaceWith(button);
}
```

Before initial `grid.textContent = ""`, call `canHydrateGrid(grid, list)`. If true, hydrate each card in place, keep the existing reveal classes/animation timing, update the filter status, and call the existing observers. If false, preserve the current clear-and-render path.

- [ ] **Step 4: Run focused tests and the full Node suite**

Run: `node --test tests/navigation-performance.test.mjs && npm test`

Expected: all tests pass, including the existing static-card and generated-content checks.

- [ ] **Step 5: Commit the hydration change**

```bash
git add js/main.js tests/navigation-performance.test.mjs
git commit -m "perf: hydrate server-rendered product cards"
```

### Task 3: Coalesce scroll subscribers and add intent prefetch

**Files:**
- Modify: `js/main.js:778-934`
- Modify: `js/product-page.js:229-251`
- Test: `tests/navigation-performance.test.mjs`

**Interfaces:**
- Consumes: existing header and sticky-product scroll behavior.
- Produces: `window.__CL_SCROLL_SCHEDULER__` only when present for compatibility, `createScrollScheduler(subscriber)`, and internal-link prefetch listeners.

- [ ] **Step 1: Add failing assertions for guards and shared scheduling**

```js
test("prefetch only accepts same-origin document links", () => {
  assert.match(mainSource, /url\.origin === window\.location\.origin/);
  assert.match(mainSource, /download/);
  assert.match(mainSource, /hash/);
});

test("header navigation uses the scheduler rather than a raw scroll callback", () => {
  assert.match(mainSource, /createScrollScheduler/);
  assert.doesNotMatch(mainSource, /window\.addEventListener\("scroll", onScroll/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/navigation-performance.test.mjs`

Expected: FAIL because the current code has a raw header scroll listener and no prefetch guards.

- [ ] **Step 3: Implement the frame scheduler**

Add a scheduler that queues at most one `requestAnimationFrame` per burst, invokes subscribers in registration order, and exposes `subscribe`/`unsubscribe` for `product-page.js`. Replace the header's direct scroll listener with a scheduler subscription. Move the existing sticky update queue to the shared scheduler so its `getBoundingClientRect()` reads occur once per frame.

- [ ] **Step 4: Implement guarded intent prefetch**

Add `shouldPrefetchUrl(rawUrl)` and `prefetchInternalLink(link)`. Reject non-GET download links, `#`-only anchors, external origins, query-only URLs, `mailto:`, `tel:`, `javascript:`, `saveData`, and `effectiveType` of `slow-2g`/`2g`. Use a `Set` of prefetched URLs and a maximum of four links. On `pointerover`/`focusin`, schedule after 80 ms; cancel on `pointerout`/`focusout` and when the link leaves before the delay. Append one `<link rel="prefetch" as="document" href="...">` per accepted URL.

- [ ] **Step 5: Run focused tests, full suite, and syntax checks**

Run: `node --test tests/navigation-performance.test.mjs && npm test && node --check js/main.js && node --check js/product-page.js`

Expected: zero failures and zero syntax errors.

- [ ] **Step 6: Commit the scheduler and prefetch change**

```bash
git add js/main.js js/product-page.js tests/navigation-performance.test.mjs
git commit -m "perf: coalesce scroll work and prefetch navigation"
```

### Task 4: Browser regression and visual/performance verification

**Files:**
- Modify: none unless verification exposes a regression
- Test: `tests/navigation-performance.test.mjs`

- [ ] **Step 1: Build and start the production-shaped local server**

Run: `npm run gen && npm run check && npm run build:github && npm run serve`

Expected: build succeeds, the existing suite passes, and the server listens on `http://localhost:8765` (use another port only if an existing local server occupies it).

- [ ] **Step 2: Run the browser flows in a fresh Playwright session**

Verify on desktop and a 390 px viewport:

1. Portada renders all seven cards without a second image request for the same card, and each `Añadir` button opens the cart.
2. Store filters show exactly one Sleep product and two Energy products; returning to `Todos` restores seven.
3. Product page excludes the current product from related cards; sticky add and cart quantity controls still work.
4. Mobile burger opens/closes, `scrollWidth - clientWidth` is zero, and internal focus/hover adds at most four same-origin prefetch links.
5. Full-page screenshots preserve existing layout and animation classes; no CSS file changes are present.

- [ ] **Step 3: Compare measurements against the baseline**

Collect `domContentLoadedEventEnd`, `loadEventEnd`, resource entries, long tasks, and frame gaps during scroll before and after the change. Confirm no new long tasks, fewer initial DOM mutations, and no new duplicate image requests. If metrics regress, inspect the trace before changing code.

- [ ] **Step 4: Run the final verification command**

Run: `npm run gen && npm run check && git diff --check && git status --short`

Expected: all 125+ tests pass, the build succeeds, generated files are clean, and only the intentional source/test/spec/plan files are changed.

### Task 5: Push and verify deployment

**Files:**
- Modify: none

- [ ] **Step 1: Review the final diff and branch commits**

Run: `git diff main...HEAD --stat && git log --oneline main..HEAD`

Expected: the diff contains only the performance implementation, regression tests, and their design/plan documentation; no CSS or animation file changes.

- [ ] **Step 2: Push the branch and fast-forward `main` through the verified commits**

Run from the isolated worktree:

```bash
git push -u origin codex/navigation-performance
git push origin HEAD:main
```

Expected: GitHub accepts both pushes and `main` points to the verified commit.

- [ ] **Step 3: Poll GitHub deployment workflows**

Use the repository's GitHub Actions view/API to identify the workflow runs for the pushed commit. Wait until the GitHub Pages run is `success`; if Cloudflare's guarded workflow is configured, wait for it too. Do not claim deployment until the run status is terminal and successful.

- [ ] **Step 4: Verify the live site and deployed cache-busted assets**

Open `https://chiclove-ec.com/` and the changed internal routes with a fresh browser context. Confirm the new cache-busting token is served, the hydration marker/prefetch behavior is present, all browser flows pass, and the response is from the deployed site rather than the local server.

- [ ] **Step 5: Record the deployment evidence**

Capture the commit SHA, successful workflow run IDs/URLs, live asset token, and final performance measurements in the final response.
