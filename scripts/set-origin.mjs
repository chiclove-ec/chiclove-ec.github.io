// Muda el sitio de dominio de forma permanente: reescribe el origen en todos los
// archivos versionados y deja `site.config.json` coherente.
//
//   node scripts/set-origin.mjs https://dominio.nuevo
//   node scripts/set-origin.mjs https://dominio.nuevo --dry-run
//
// (El ejemplo usa un dominio ficticio a propósito: si nombrara el dominio real
// del sitio, la prueba que prohíbe incrustarlo en el código fallaría al mudarse.)
//
// No hace falta para cambiar de dominio —basta con `canonicalOrigin` en
// site.config.json, porque el build reescribe al copiar a `dist/`—. Sirve para
// dejar de arrastrar esa reescritura una vez la mudanza es definitiva: después
// de ejecutarlo, `sourceOrigin` y `canonicalOrigin` vuelven a coincidir y lo que
// está escrito en el repositorio es ya el dominio real.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, resolve } from "node:path";

import { projectRoot } from "./lib/catalog.mjs";
import {
  assertOrigin,
  CONFIG_FILE,
  loadSiteConfig,
  originTraces,
  rewriteOrigin,
  TEXT_EXTENSIONS,
  withoutGitHubUrls
} from "./lib/site-config.mjs";

const [, , requested, ...flags] = process.argv;
const dryRun = flags.includes("--dry-run");

if (!requested) {
  console.error("Uso: node scripts/set-origin.mjs https://dominio.nuevo [--dry-run]");
  process.exit(1);
}

const target = assertOrigin(requested, "nuevo origen");
const config = loadSiteConfig();

if (target === config.sourceOrigin && target === config.canonicalOrigin) {
  console.log(`El sitio ya está escrito en ${target}. No hay nada que hacer.`);
  process.exit(0);
}

// Solo lo versionado: así nunca se tocan artefactos locales ni dist/.
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: projectRoot })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const changed = [];
for (const file of tracked) {
  if (file === CONFIG_FILE) continue;
  if (!TEXT_EXTENSIONS.has(extname(file))) continue;

  const path = resolve(projectRoot, file);
  const original = readFileSync(path, "utf8");
  const updated = rewriteOrigin(original, { from: config.sourceOrigin, to: target });
  if (updated === original) continue;

  changed.push(file);
  if (!dryRun) writeFileSync(path, updated);
}

if (!dryRun) {
  const configPath = resolve(projectRoot, CONFIG_FILE);
  const raw = JSON.parse(readFileSync(configPath, "utf8"));
  raw.canonicalOrigin = target;
  raw.sourceOrigin = target;
  writeFileSync(configPath, JSON.stringify(raw, null, 2) + "\n");
}

const verb = dryRun ? "cambiaría" : "cambió";
console.log(`${config.sourceOrigin} → ${target}`);
console.log(`Se ${verb} el origen en ${changed.length} archivos y en ${CONFIG_FILE}.`);

if (dryRun) {
  for (const file of changed) console.log("  " + file);
  process.exit(0);
}

// Nada versionado puede seguir nombrando el dominio viejo, ni siquiera como host suelto.
const leftovers = [];
for (const file of tracked) {
  if (!TEXT_EXTENSIONS.has(extname(file))) continue;
  const body = withoutGitHubUrls(readFileSync(resolve(projectRoot, file), "utf8"));
  for (const trace of originTraces(config.sourceOrigin)) {
    if (body.includes(trace)) leftovers.push(`${file} (${trace})`);
  }
}
if (leftovers.length) {
  console.error("\nQuedaron referencias al dominio anterior:");
  for (const leftover of leftovers) console.error("  " + leftover);
  process.exit(1);
}

console.log(`
Siguientes pasos:
  1. npm run gen     # regenera lo derivado con el dominio nuevo
  2. npm run check   # build y suite completa
  3. Revisa el diff, súbelo y apunta el DNS al nuevo dominio.
  4. En Google Search Console, registra la nueva propiedad y usa "Cambio de
     dirección" desde la anterior.`);
