// Avisa a los buscadores que usan IndexNow (Bing, Yandex, Seznam, Naver…) de que hay
// contenido nuevo, en vez de esperar a que lo rastreen. Importa para los asistentes: el
// buscador de ChatGPT y Copilot se apoyan en el índice de Bing.
//
// Uso, DESPUÉS de que el despliegue esté en producción:
//   node scripts/indexnow.mjs            envía todas las URL públicas del sitio
//   node scripts/indexnow.mjs --dry-run  solo muestra lo que enviaría
//
// La clave NO es un secreto: IndexNow la verifica leyendo /<clave>.txt en el propio
// dominio, que es lo que demuestra que el aviso lo manda el dueño del sitio.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { projectRoot } from "./lib/catalog.mjs";
import { loadSiteConfig } from "./lib/site-config.mjs";

const { base, canonicalOrigin } = loadSiteConfig();
const keyFile = readdirSync(projectRoot).find((file) => /^[0-9a-f]{32}\.txt$/.test(file));
if (!keyFile) throw new Error("No hay archivo de clave IndexNow (<32 hex>.txt) en la raíz");
const key = readFileSync(resolve(projectRoot, keyFile), "utf8").trim();
if (key + ".txt" !== keyFile) throw new Error(keyFile + " no contiene su propia clave");

// Las páginas del sitemap y los documentos para máquinas, que no están en él.
const sitemap = readFileSync(resolve(projectRoot, "sitemap.xml"), "utf8");
const urls = [
  ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url),
  ...["llms.txt", "llms-full.txt", "agents.md", "ai.txt", "catalog.json", "respuestas.md",
    "guia-de-eleccion.md", "ingredientes.md", "en.md"].map((file) => base + file)
];

const payload = {
  host: new URL(canonicalOrigin).host,
  key,
  keyLocation: base + keyFile,
  urlList: [...new Set(urls)]
};

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  // 200 y 202 son éxito (202: recibido, la clave se verificará después).
  console.log("IndexNow respondió " + response.status + " para " + payload.urlList.length + " URL");
  if (![200, 202].includes(response.status)) process.exitCode = 1;
}
