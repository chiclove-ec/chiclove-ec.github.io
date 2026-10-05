// Pone lo generado al día con la fecha. Las promociones de js/products.js abren y
// cierran solas en el navegador, pero el JSON-LD, los markdown, catalog.json y
// llms.txt llevan los precios escritos: al cambiar de estado una promo hay que
// regenerarlos, o Google y los agentes siguen leyendo el precio viejo (y la suite
// falla, porque compara lo publicado con el catálogo de hoy).
//
//   npm run refresh                                       # con la fecha de hoy
//   npm run refresh -- --now=2026-11-01T00:00:00-05:00    # simula otro instante
//
// Si la regeneración cambia algo, `contentModified` pasa a ser el día en Ecuador,
// para que `dateModified` y el sitemap avisen a los buscadores de que hay precios
// nuevos. Termina con `changed=true|false`, también en $GITHUB_OUTPUT dentro de
// Actions: el workflow refresh-catalog.yml decide con eso si abre un PR.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { projectRoot } from "./lib/catalog.mjs";
import { CONFIG_FILE, assertContentModified } from "./lib/site-config.mjs";

const env = { ...process.env };
const nowArg = process.argv.find((value) => value.startsWith("--now="));
if (nowArg) env.CL_NOW = nowArg.slice("--now=".length);
const now = env.CL_NOW ? Date.parse(env.CL_NOW) : Date.now();
if (!Number.isFinite(now)) throw new Error("--now / CL_NOW no es una fecha válida: " + env.CL_NOW);

// Día de calendario en Ecuador (UTC-5, sin horario de verano): el mismo reloj que
// usan las ventanas de CL_PROMOS.
const ecuadorDay = new Date(now - 5 * 3600 * 1000).toISOString().slice(0, 10);

const git = (...args) => execFileSync("git", args, { cwd: projectRoot, encoding: "utf8" });
// Foto del árbol de trabajo: así un cambio local previo no se confunde con uno de fecha.
const snapshot = () => git("status", "--porcelain") + git("diff");
const generate = () => {
  for (const script of ["scripts/gen-products.mjs", "scripts/gen-jsonld.mjs"]) {
    execFileSync(process.execPath, [script], { cwd: projectRoot, env, stdio: ["ignore", "ignore", "inherit"] });
  }
};

const before = snapshot();
generate();
const changed = snapshot() !== before;

if (changed) {
  const file = resolve(projectRoot, CONFIG_FILE);
  const config = JSON.parse(readFileSync(file, "utf8"));
  // Solo hacia delante: simular una fecha pasada no debe envejecer la del sitio.
  if (assertContentModified(config.contentModified) < ecuadorDay) {
    config.contentModified = ecuadorDay;
    writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
    generate();
  }
}

console.log(
  (changed ? "Lo generado cambió con la fecha (" : "Lo generado ya estaba al día (") +
    new Date(now).toISOString() + ", " + ecuadorDay + " en Ecuador).\nchanged=" + changed
);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "changed=" + changed + "\n");
