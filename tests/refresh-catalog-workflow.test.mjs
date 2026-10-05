// Contrato del workflow que pone lo generado al día cuando una promoción abre o cierra
// (.github/workflows/refresh-catalog.yml + scripts/refresh-catalog-pr.sh).
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";

const read = (file) => readFileSync(resolve(projectRoot, file), "utf8");
const workflow = read(".github/workflows/refresh-catalog.yml");
const script = read("scripts/refresh-catalog-pr.sh");

test("corre justo después del cambio de día en Ecuador y reintenta", () => {
  const crons = [...workflow.matchAll(/cron:\s*["']([^"']+)["']/g)].map(([, value]) => value);
  // Las promos abren y cierran a las 00:00 de Ecuador = 05:00 UTC.
  assert.equal(crons[0], "7 5 * * *", "la primera pasada debe ir a las 00:07 de Ecuador");
  assert.ok(crons.length >= 2, "sin reintento, una caída de Actions deja el catálogo viejo un día entero");
  for (const cron of crons) {
    assert.notEqual(cron.split(" ")[0], "0", `${cron}: el minuto 0 es el más congestionado de GitHub`);
  }
  assert.match(workflow, /workflow_dispatch:/, "falta la vía manual y el simulacro");
});

test("regenera con el script del repositorio y solo actúa si algo cambió", () => {
  assert.match(workflow, /run: npm run refresh/);
  assert.match(read("package.json"), /"refresh": "node scripts\/refresh-catalog\.mjs"/);
  assert.match(workflow, /if: steps\.refresh\.outputs\.changed == 'true'\n\s+run: npm test/);
  assert.match(workflow, /if: steps\.refresh\.outputs\.changed == 'true'[\s\S]*run: bash scripts\/refresh-catalog-pr\.sh/);
});

test("pide solo los permisos que usa y no deja credenciales en el checkout", () => {
  assert.match(workflow, /^permissions:\n\s+contents: read/m, "el permiso por defecto debe ser de lectura");
  for (const scope of ["contents: write", "pull-requests: write", "actions: write", "issues: write"]) {
    assert.ok(workflow.includes(scope), `falta ${scope}`);
  }
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(workflow, /persist-credentials: false/);
});

test("ningún valor de GitHub se interpola dentro de un run:", () => {
  // Bloques `run: |` y líneas `run: ...`: todo lo de `${{ }}` debe llegar por `env:`.
  const runs = [...workflow.matchAll(/run: \|\n((?:\s{10,}.*\n?)+)|run: (.+)/g)].map(([, block, line]) => block || line);
  assert.ok(runs.length >= 4);
  for (const body of runs) assert.doesNotMatch(body, /\$\{\{/, `interpolación en un run:\n${body}`);
});

test("lanza CI y el despliegue de Pages, que el GITHUB_TOKEN no dispara solo", () => {
  assert.match(read(".github/workflows/ci.yml"), /^\s+workflow_dispatch:/m, "ci.yml no admite el lanzamiento manual");
  assert.match(read(".github/workflows/deploy-pages.yml"), /^\s+workflow_dispatch:/m);
  assert.match(script, /gh workflow run ci\.yml --ref "\$\{rama\}"/);
  assert.match(script, /gh workflow run deploy-pages\.yml --ref main/);
});

test("fusiona solo cuando main lo admite y el simulacro nunca fusiona", () => {
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /CLEAN\|UNSTABLE\|HAS_HOOKS\) break/, "debe esperar a que main admita el PR");
  assert.match(script, /gh pr checks "\$\{pr\}" --required/, "debe cortar en cuanto falle un check obligatorio");
  assert.match(script, /gh pr merge "\$\{pr\}" --squash/, "main exige historial lineal");
  const simulacro = script.indexOf('if [ -n "${simulated}" ]; then\n  gh pr close');
  assert.ok(simulacro > 0 && simulacro < script.indexOf("gh pr merge"), "el simulacro debe cerrar el PR antes de llegar a fusionar");
  assert.match(workflow, /if: failure\(\) && inputs\.simular == ''/, "un simulacro fallido no debe abrir avisos");
});
