// Helper compartido por las pruebas (no es una suite: `npm test` solo carga *.test.mjs).
//
// Lee el array `publicFiles` de scripts/build.mjs, que es la lista de lo que
// llega al artefacto publicado. El archivo declara además una lista `forbidden`
// con el mismo sangrado: mezclarlas daría por publicado lo privado, así que se
// acota al array correcto.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { projectRoot } from "../scripts/lib/catalog.mjs";

export function loadPublicFiles() {
  const source = readFileSync(resolve(projectRoot, "scripts/build.mjs"), "utf8");
  const start = source.indexOf("const publicFiles = [");
  if (start === -1) throw new Error("scripts/build.mjs ya no declara `const publicFiles = [`");
  const end = source.indexOf("\n];", start);
  if (end === -1) throw new Error("no se encontró el cierre del array publicFiles");
  return new Set([...source.slice(start, end).matchAll(/"([^"]+)"/g)].map(([, entry]) => entry));
}
