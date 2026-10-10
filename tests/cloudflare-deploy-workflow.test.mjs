// El sitio se publica SOLO en Cloudflare Pages, por su integración Git nativa.
// El deploy directo con Wrangler es una vía manual de recuperación, para que dos
// despliegues automáticos no compitan por el mismo proyecto. GitHub Pages no se
// usa: las condiciones de GitHub no lo admiten como hosting de una tienda.
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";

const workflow = readFileSync(
  resolve(projectRoot, ".github/workflows/deploy-cloudflare.yml"),
  "utf8"
);

test("Cloudflare Pages conserva una vía manual sin despliegue automático duplicado", () => {
  assert.match(workflow, /workflow_dispatch:/, "falta la vía manual");
  assert.doesNotMatch(workflow, /push:\s*\n\s+branches: \[main\]/, "no debe competir con la integración Git nativa");
  assert.match(workflow, /npm run build:cloudflare/, "no construye el artefacto de Cloudflare");
  assert.match(workflow, /pages deploy dist/, "no publica dist en Cloudflare Pages");
  assert.match(
    workflow,
    /\.\/\.github\/workflows\/ci\.yml/,
    "Cloudflare debe reutilizar CI antes de publicar"
  );
});

test("ningún workflow publica en GitHub Pages", () => {
  const dir = resolve(projectRoot, ".github/workflows");
  assert.ok(!existsSync(resolve(dir, "deploy-pages.yml")), "deploy-pages.yml no debe volver");
  for (const file of readdirSync(dir).filter((name) => /\.ya?ml$/.test(name))) {
    const source = readFileSync(resolve(dir, file), "utf8");
    for (const pattern of [
      /actions\/(?:deploy|configure)-pages@/,
      /actions\/upload-pages-artifact@/,
      /^\s+pages: write/m,
      /name: github-pages/,
      /gh workflow run deploy-pages/
    ]) {
      assert.doesNotMatch(source, pattern, `${file} vuelve a publicar en GitHub Pages`);
    }
  }
});

test("el build ya no tiene objetivo de GitHub Pages", () => {
  const build = readFileSync(resolve(projectRoot, "scripts/build.mjs"), "utf8");
  const pkg = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
  assert.doesNotMatch(build, /github-pages|\.nojekyll/, "scripts/build.mjs conserva el objetivo de GitHub Pages");
  assert.ok(!("build:github" in pkg.scripts), "package.json conserva build:github");
  assert.match(pkg.scripts.check, /build:cloudflare/, "npm run check debe construir lo que publica Cloudflare");
  assert.ok(!existsSync(resolve(projectRoot, ".nojekyll")), ".nojekyll solo servía a GitHub Pages");
});

test("el deploy directo reporta su estado a GitHub usando secretos sin exponerlos", () => {
  assert.match(workflow, /deployments: write/, "falta permiso para informar el despliegue");
  assert.match(workflow, /gitHubToken: \$\{\{ secrets\.GITHUB_TOKEN \}\}/, "Wrangler no recibe GITHUB_TOKEN");
  assert.match(workflow, /apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(workflow, /accountId: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN.*CLOUDFLARE_ACCOUNT_ID/s, "falta el guard de secretos");
});
