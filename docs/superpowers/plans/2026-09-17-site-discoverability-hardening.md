# Site Discoverability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar la consistencia comercial, la medición de intención de compra y la robustez del despliegue de Chic&Love Ecuador sin cambiar su estética ni prometer posicionamiento o recomendaciones automáticas.

**Architecture:** `js/products.js` seguirá siendo la fuente de precios, promociones y datos legales. Los generadores mantendrán paridad entre HTML, Markdown, `catalog.json` y JSON-LD; `js/analytics.js` recibirá sólo eventos agregados y con consentimiento. El sitio seguirá siendo estático, con pedido humano por WhatsApp y build por lista blanca.

**Tech Stack:** HTML estático, JavaScript vanilla, generadores Node.js 20, `node:test`, Python 3, GitHub Actions, GitHub Pages/Cloudflare Pages y Chrome mediante Playwright.

**Spec:** `docs/superpowers/specs/2026-09-16-ai-discoverability-design.md` más la auditoría aprobada en la conversación.

## Global Constraints

- No modificar `css/styles.css`, paleta, tipografía, espaciado, animaciones, imágenes ni layout visual.
- No añadir claims médicos, reseñas inventadas, certificaciones no demostradas ni datos comerciales no presentes.
- No registrar nombres, teléfonos, mensajes de WhatsApp, direcciones ni contenido personal del carrito.
- La web no tendrá checkout automático ni stock en tiempo real; la disponibilidad se confirma por WhatsApp.
- HTML, Markdown, JSON-LD y `catalog.json` deben salir de las mismas fuentes y coincidir.
- No usar texto oculto, páginas doorway, fechas falsas, `aggregateRating` sin fuente verificable ni nuevos permisos CSP.
- Las URLs canónicas siguen siendo las rutas HTML limpias; el sitemap sólo lista páginas indexables.

---

### Task 1: Sincronizar la base y validar trabajos existentes

**Files:**
- Modify: none initially; update local `main` to `origin/main` with fast-forward only.
- Review: `codex/navigation-performance`, `codex/weekly-analytics-report-fix`.
- Test: `tests/*.test.mjs`.

**Interfaces:**
- Consumes: `origin/main`, both worktrees existentes y su historial.
- Produces: `main` sincronizada y decisión verificable sobre la rama de reportes.

- [ ] **Step 1: Confirm clean worktrees and branch ancestry**

Run:
```bash
git status --short --branch
git worktree list --porcelain
git merge-base --is-ancestor main origin/main
git -C .worktrees/navigation-performance status --short
git -C .worktrees/weekly-analytics-report-fix status --short
```
Expected: no uncommitted changes and `main` is an ancestor of `origin/main`.

- [ ] **Step 2: Fast-forward local main and run the baseline suite**

Run:
```bash
git merge --ff-only origin/main
npm test
```
Expected: local `main` equals `origin/main` and all baseline tests pass.

- [ ] **Step 3: Validate the weekly-report branch**

Run:
```bash
git -C .worktrees/weekly-analytics-report-fix diff --check
git -C .worktrees/weekly-analytics-report-fix show --check --stat HEAD
```
Expected: the branch is clean and contains only the report workflow/script/tests/docs.

---

### Task 2: Hacer veraz la disponibilidad en todas las representaciones

**Files:**
- Modify: `scripts/gen-products.mjs`.
- Modify: `scripts/gen-jsonld.mjs`.
- Modify: `tests/structured-data.test.mjs`, `tests/agent-layer.test.mjs`, `tests/site-artifacts.test.mjs`.
- Regenerate: generated product HTML/Markdown, `index.md`, `tienda.md`, `agents.md`, `llms-full.txt`, `catalog.json`, `index.html`, `tienda.html`.

**Interfaces:**
- Consumes: `CL_PRODUCTS`, `clSinglePrice`, promotions and the WhatsApp ordering flow.
- Produces: one shared availability note; generated Product Offers omit false `InStock`; catalog JSON and Markdown state that availability is confirmed by WhatsApp.

- [ ] **Step 1: Write failing consistency tests**

Require every generated product Markdown and catalog product to contain the exact shared availability wording, and require Product/ItemList Offers not to emit `availability: https://schema.org/InStock` while the site has no live stock.

- [ ] **Step 2: Run the focused tests and confirm the expected failure**

Run:
```bash
node --test --test-concurrency=1 tests/structured-data.test.mjs tests/agent-layer.test.mjs tests/site-artifacts.test.mjs
```
Expected: failure identifies the current `InStock` and/or “en stock” output.

- [ ] **Step 3: Implement the smallest truthful change**

Define `const AVAILABILITY_NOTE = "Disponibilidad confirmada por WhatsApp; no hay stock en tiempo real."` in the generator and use it in Markdown and `catalog.json`. Remove only the false `availability` member from generated Offers; retain price, currency, shipping, seller and returns. Do not add a visual badge.

- [ ] **Step 4: Regenerate and run focused tests**

Run:
```bash
npm run gen
node --test --test-concurrency=1 tests/structured-data.test.mjs tests/agent-layer.test.mjs tests/site-artifacts.test.mjs
```
Expected: tests pass and generation is synchronized.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-products.mjs scripts/gen-jsonld.mjs tests/structured-data.test.mjs tests/agent-layer.test.mjs tests/site-artifacts.test.mjs '*.html' '*.md' catalog.json agents.md llms-full.txt
git commit -m "fix: align availability with WhatsApp confirmation"
```

---

### Task 3: Medir mejor la intención de compra sin datos personales

**Files:**
- Modify: `js/analytics.js`, `js/main.js`.
- Create: `tests/analytics-events.test.mjs`.
- Modify: `README.md`, `CLAUDE.md` only for event semantics.

**Interfaces:**
- Consumes: `window.clAnalytics.track`, consent gate, cart helpers and `analyticsCartItems`.
- Produces: contextual `whatsapp_click` plus consent-gated `generate_lead` after WhatsApp opens successfully.

- [ ] **Step 1: Write failing event-contract tests**

Require the source to contain `whatsapp_click`, `generate_lead`, `currency: "USD"`, and ensure the order message is never passed to analytics. Also require `generate_lead` to be inside the successful `window.open` branch.

- [ ] **Step 2: Run the new tests and confirm failure**

Run:
```bash
node --test --test-concurrency=1 tests/analytics-events.test.mjs
```
Expected: failure because `generate_lead` is not emitted yet.

- [ ] **Step 3: Add context and lead measurement**

Extend `whatsapp_click` with page path and a short link context. After `window.open` succeeds, keep `begin_checkout` and add:
```js
window.clAnalytics.track("generate_lead", {
  method: "whatsapp",
  items_count: items.length,
  value: cartTotal(items),
  currency: "USD",
  items: analyticsCartItems(items)
});
```
Never call it `purchase`.

- [ ] **Step 4: Run focused and full tests**

Run:
```bash
node --test --test-concurrency=1 tests/analytics-events.test.mjs
npm test
```
Expected: both pass with no new dependencies.

- [ ] **Step 5: Commit**

```bash
git add js/analytics.js js/main.js tests/analytics-events.test.mjs README.md CLAUDE.md
git commit -m "feat: measure WhatsApp purchase intent"
```

---

### Task 4: Integrar el informe semanal de GA4 validado

**Files:**
- Merge: `codex/weekly-analytics-report-fix` into `main`.
- Review: `.github/workflows/weekly-analytics-report.yml`, `scripts/analytics_report.py`, `tests/analytics-report.test.mjs`, `README.md`, `CLAUDE.md`.

**Interfaces:**
- Consumes: GA4 measurement contract and repository secrets configured by the owner.
- Produces: scheduled, preflight-validated report workflow that stays inert until secrets exist and never prints them.

- [ ] **Step 1: Run report tests on the branch**

Run:
```bash
git -C .worktrees/weekly-analytics-report-fix diff --check
python3 -B -m py_compile .worktrees/weekly-analytics-report-fix/scripts/analytics_report.py
```
Expected: syntax and whitespace checks pass.

- [ ] **Step 2: Merge without rewriting history**

Run:
```bash
git merge --no-ff codex/weekly-analytics-report-fix -m "merge: validate weekly analytics report delivery"
```
Preserve both README/CLAUDE sections if a textual conflict occurs.

- [ ] **Step 3: Verify merged report behavior**

Run:
```bash
node --test --test-concurrency=1 tests/analytics-report.test.mjs
npm test
```
Expected: report tests and the full site suite pass without secrets.

---

### Task 5: Verificación final, push, merge/deploy y limpieza

**Files:**
- Review: `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`, `.github/workflows/deploy-cloudflare.yml`, `site.config.json`, `_headers`, `vercel.json`, `netlify.toml`, `wrangler.toml`.
- Modify: only generated files required by `npm run gen`.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: verified public artifact, pushed `main), successful Actions deployment and clean completed worktrees.

- [ ] **Step 1: Verify idempotence and integrity**

Run:
```bash
npm run gen
git diff --check
npm run check
npm run gen
git diff --exit-code
git status --short
```
Expected: build/tests pass and the second generation leaves no diff.

- [ ] **Step 2: Verify local production behavior**

Run `npm run build && npm run serve`. Inspect homepage, store, all product routes, Markdown twins, `catalog.json`, `llms.txt`, `ai.txt`, `robots.txt`, `sitemap.xml` and a nonexistent route. Confirm 200/404 statuses, content types, canonical URLs, alternates, no false `InStock`, and truthful WhatsApp availability.

- [ ] **Step 3: Verify browser behavior**

Using the project verification flow at desktop and 390px, confirm seven hydrated cards, filters, product variants, cart and WhatsApp checkout, mobile menu, no horizontal overflow, 404 recovery and no new console errors. Preserve existing CSS and visual output.

- [ ] **Step 4: Commit final corrections if needed**

Run:
```bash
git diff --check
git status --short
```
Commit only intentional final changes:
```bash
git commit -am "chore: finalize discoverability and analytics hardening"
```

- [ ] **Step 5: Push and verify Actions**

Run `git push origin main`. Inspect the latest CI/deployment runs. Do not claim deployment success until the required workflow succeeds.

- [ ] **Step 6: Verify live domain and clean**

Check fresh responses from `https://chiclove-ec.com` for homepage, `catalog.json`, `ai.txt`, `llms.txt`, `robots.txt`, `sitemap.xml`, one product and 404. Only after deployment passes, delete fully merged local branches and remove their worktrees; never force-delete uncommitted work.

