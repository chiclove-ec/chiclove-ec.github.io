// Carga js/products.js (que es un script clásico del navegador) en un sandbox y expone
// el catálogo y sus helpers a las herramientas de Node: generador de páginas y tests.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadCatalog() {
  const source = readFileSync(resolve(projectRoot, "js/products.js"), "utf8").replace(
    /^\s*"use strict";/,
    ""
  );
  const catalog = {};
  new Function(
    "Date",
    source +
      "\nthis.CL_PRODUCTS=CL_PRODUCTS; this.CL_FREE_SHIPPING=CL_FREE_SHIPPING;" +
      "\nthis.CL_INSTAGRAM=CL_INSTAGRAM; this.CL_WHATSAPP=CL_WHATSAPP;" +
      "\nthis.clSinglePrice=clSinglePrice; this.clWhatsAppDisplay=clWhatsAppDisplay;" +
      "\nthis.clMoney=clMoney; this.clActivePromo=clActivePromo; this.clHasPacks=clHasPacks;"
  ).call(catalog, Date);
  return catalog;
}
