// El deploy de Cloudflare Pages es directo desde GitHub Actions. Esta prueba
// protege los detalles que hacen que cada push a main publique y deje su estado
// visible en el commit, sin sustituir GitHub Pages.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";

const workflow = readFileSync(
  resolve(projectRoot, ".github/workflows/deploy-cloudflare.yml"),
  "utf8"
);

test("Cloudflare Pages se despliega automáticamente desde main sin desactivar GitHub Pages", () => {
  assert.match(workflow, /push:\s*\n\s+branches: \[main\]/, "el workflow no escucha main");
  assert.match(workflow, /npm run build:cloudflare/, "no construye el artefacto de Cloudflare");
  assert.match(workflow, /pages deploy dist/, "no publica dist en Cloudflare Pages");
  assert.match(
    workflow,
    /\.\/\.github\/workflows\/ci\.yml/,
    "Cloudflare debe reutilizar CI antes de publicar"
  );
  assert.doesNotMatch(
    workflow,
    /deploy-pages\.yml/,
    "Cloudflare no debe modificar el workflow independiente de GitHub Pages"
  );
});

test("el deploy directo reporta su estado a GitHub usando secretos sin exponerlos", () => {
  assert.match(workflow, /deployments: write/, "falta permiso para informar el despliegue");
  assert.match(workflow, /gitHubToken: \$\{\{ secrets\.GITHUB_TOKEN \}\}/, "Wrangler no recibe GITHUB_TOKEN");
  assert.match(workflow, /apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(workflow, /accountId: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN.*CLOUDFLARE_ACCOUNT_ID/s, "falta el guard de secretos");
});
