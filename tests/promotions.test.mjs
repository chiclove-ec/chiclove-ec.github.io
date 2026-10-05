// Reglas de las promociones de CL_PROMOS: fechas coherentes, packs retirados solo cuando
// dejan de ahorrar, grupos que comparten de verdad la misma oferta y bandas bien formadas.
// Cada promoción se evalúa en su propia ventana, así que estas pruebas no caducan con el mes.
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { loadCatalog, projectRoot } from "../scripts/lib/catalog.mjs";
import { loadPublicFiles } from "./public-files.mjs";

const catalog = loadCatalog();
const promos = Object.entries(catalog.CL_PROMOS);
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];
const cents = (value) => Math.round(value * 100);
const ecuadorDay = (timestamp) => new Date(timestamp - 5 * 3600 * 1000).toISOString().slice(0, 10);

test("cada promoción apunta a un producto y rebaja su precio de lista", () => {
  for (const [id, promo] of promos) {
    const product = catalog.CL_PRODUCTS.find((p) => p.id === id);
    assert.ok(product, `${id}: promoción de un producto que no existe`);
    assert.ok(promo.price > 0 && promo.price < product.price, `${id}: el precio promocional no rebaja el de lista`);
    assert.ok(Number.isFinite(promo.start) && Number.isFinite(promo.end) && promo.start < promo.end, `${id}: ventana inválida`);
  }
});

test("las fechas visibles de cada promoción coinciden con su ventana", () => {
  for (const [id, promo] of promos) {
    // `end` es exclusivo: el último día de la promo es el anterior, en hora de Ecuador.
    const lastDay = ecuadorDay(promo.end - 1);
    assert.equal(promo.priceValidUntil, lastDay, `${id}: priceValidUntil no es el último día`);
    const [, month, day] = lastDay.split("-").map(Number);
    assert.equal(promo.endsLabel, day + " de " + MONTHS[month - 1], `${id}: endsLabel no coincide con el cierre`);
    assert.equal(promo.monthLabel, MONTHS[Number(ecuadorDay(promo.start).slice(5, 7)) - 1], `${id}: monthLabel no es el mes de inicio`);
  }
});

test("los packs se retiran exactamente cuando los frascos sueltos salen más baratos", () => {
  for (const [id, promo] of promos) {
    const product = catalog.CL_PRODUCTS.find((p) => p.id === id);
    const singlesBeatPacks =
      cents(promo.price) * 2 <= cents(product.pricePack) || cents(promo.price) * 3 <= cents(product.pricePack3);
    assert.equal(
      Boolean(promo.singleOnly),
      singlesBeatPacks,
      singlesBeatPacks
        ? `${id}: a ${promo.price} los sueltos ya ahorran más que el pack; hay que retirar los packs (singleOnly)`
        : `${id}: los packs siguen ahorrando a ${promo.price}; no hace falta retirarlos`
    );
  }
});

test("las fórmulas de un grupo comparten la misma oferta", () => {
  const groups = new Map();
  for (const [id, promo] of promos) {
    if (!promo.group) continue;
    assert.ok(catalog.CL_PROMO_GROUPS[promo.group], `${id}: grupo ${promo.group} sin ficha en CL_PROMO_GROUPS`);
    const key = [promo.price, promo.start, promo.end, Boolean(promo.singleOnly)].join("|");
    const known = groups.get(promo.group);
    if (known) assert.equal(key, known, `${id}: no comparte precio y fechas con el resto de ${promo.group}`);
    else groups.set(promo.group, key);
  }
});

test("las imágenes de cada grupo existen y se publican", () => {
  const publicFiles = loadPublicFiles();
  for (const [name, group] of Object.entries(catalog.CL_PROMO_GROUPS)) {
    for (const field of ["title", "label", "cta", "accent", "accentDark"]) {
      assert.ok(group[field], `${name}: falta ${field}`);
    }
    for (const file of [group.image, group.imageSmall, group.imageNarrow].filter(Boolean)) {
      assert.ok(existsSync(resolve(projectRoot, file)), `${name}: falta ${file}`);
      assert.ok(publicFiles.has(file), `${name}: ${file} no está en la lista blanca del build`);
    }
  }
});

test("las bandas agrupan, ordenan por descuento y desaparecen al cerrar la promo", () => {
  for (const [id, promo] of promos) {
    const bands = catalog.clPromoBands(promo.start);
    const percents = bands.map((band) => band.percent);
    assert.deepEqual(percents, [...percents].sort((a, b) => b - a), "las bandas no van de mayor a menor descuento");
    const ids = bands.flatMap((band) => band.products.map((p) => p.id));
    assert.equal(new Set(ids).size, ids.length, "un producto aparece en dos bandas");
    assert.ok(ids.includes(id), `${id}: su promoción no tiene banda`);
    const groupIds = bands.filter((band) => band.groupId).map((band) => band.groupId);
    assert.equal(new Set(groupIds).size, groupIds.length, "un grupo genera más de una banda");
    for (const band of bands) {
      assert.equal(band.percent, catalog.clPromoPercent(band.product, promo.start));
      assert.ok(band.group || band.products.length === 1, "una banda sin grupo anuncia varios productos");
    }
    assert.equal(
      catalog.clPromoBands(promo.end).some((band) => band.products.some((p) => p.id === id)),
      false,
      `${id}: la banda sigue viva al cerrar la promo`
    );
  }
});
