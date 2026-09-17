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

test("the hydration contract compares product order, limit, and exclusion", () => {
  assert.match(mainSource, /function expectedGridProductIds\(grid\)/);
  assert.match(mainSource, /data-hydrated-card/);
  assert.match(mainSource, /data-analytics-item/);
});

test("hydration preserves the seven-card grid layout state", () => {
  assert.match(mainSource, /grid\.classList\.toggle\("is-seven", list\.length === 7\);[\s\S]{0,220}if \(!canHydrateGrid\(grid, list\)\)/);
});

test("prefetch only accepts same-origin document links", () => {
  assert.match(mainSource, /url\.origin !== window\.location\.origin/);
  assert.match(mainSource, /download/);
  assert.match(mainSource, /hash/);
});

test("lazy images only accept same-origin assets", () => {
  assert.match(mainSource, /function safeLazyImageUrl\(/);
  assert.match(mainSource, /url\.protocol !== window\.location\.protocol/);
  assert.match(mainSource, /url\.origin !== window\.location\.origin/);
  assert.match(mainSource, /assets\/img\//);
  assert.match(mainSource, /image\.src = safeSource;/);
  assert.doesNotMatch(mainSource, /image\.src = source;/);
});

test("header navigation uses the scheduler rather than a raw scroll callback", () => {
  assert.match(mainSource, /createScrollScheduler/);
  assert.doesNotMatch(mainSource, /window\.addEventListener\("scroll", onScroll/);
});

test("safeLazyImageSrcset and shouldPrefetchUrl enforce strict token and credential guards", () => {
  assert.match(mainSource, /url\.username \|\| url\.password/);
  assert.match(mainSource, /safeDescriptors/);
  assert.match(mainSource, /MAX_CART_LINES/);
});
