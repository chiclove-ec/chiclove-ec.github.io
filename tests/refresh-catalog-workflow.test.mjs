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
  for (const scope of ["contents: write", "pull-requests: write", "statuses: write", "actions: write", "issues: write"]) {
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

test("cumple el check obligatorio de CI ejecutando los mismos pasos que ci.yml", () => {
  // Lo que hace el GITHUB_TOKEN no dispara ci.yml, y un CI con workflow_dispatch no se
  // asocia al PR (comprobado el 2026-10-06): el script lo ejecuta y publica el estado.
  const ci = read(".github/workflows/ci.yml");
  const jobName = ci.match(/^\s+name: (.+)$/m)[1];
  assert.ok(script.includes(`check="${jobName}"`), `el estado debe llamarse igual que el job de ci.yml («${jobName}»)`);
  for (const step of ["npm test", "npm run build:github", "npm run gen"]) {
    assert.ok(ci.includes(`run: ${step}`) || ci.includes(`  ${step}\n`), `ci.yml ya no ejecuta ${step}`);
    assert.ok(script.includes(`env -u CL_NOW ${step}`), `el script no ejecuta ${step} con el reloj real`);
  }
  assert.match(script, /npm run gen\nif ! git diff --quiet; then/, "falta la coherencia de lo generado");
  const verify = script.indexOf("env -u CL_NOW npm test");
  assert.ok(verify > 0 && verify < script.indexOf("git push"), "hay que verificar antes de subir");
  assert.match(script, /gh api "repos\/\$\{GH_REPO\}\/statuses\/\$\{sha\}" -f state=success -f context="\$\{check\}"/);
  assert.match(script, /gh workflow run deploy-pages\.yml --ref main/, "el push del GITHUB_TOKEN no dispara GitHub Pages");
  assert.match(read(".github/workflows/deploy-pages.yml"), /^\s+workflow_dispatch:/m);
});

test("fusiona solo cuando main lo admite y el simulacro nunca fusiona", () => {
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /CLEAN\|UNSTABLE\|HAS_HOOKS\) if \[ "\$\{obligatorios\}" = "true" \]; then break; fi/,
    "debe esperar a que main admita el PR y a ver todos los obligatorios en verde");
  assert.match(script, /gh pr checks "\$\{pr\}" --required/, "debe cortar en cuanto falle un check obligatorio");
  assert.match(script, /gh pr merge "\$\{pr\}" --squash --delete-branch --match-head-commit "\$\{sha\}"/,
    "main exige historial lineal y solo se fusiona el commit verificado");
  assert.match(script, /BEHIND\)[\s\S]*?exit 1 ;;/, "si main avanza no se fusiona un commit sin verificar");
  const simulacro = script.indexOf('if [ -n "${simulated}" ]; then\n  gh pr close');
  assert.ok(simulacro > 0 && simulacro < script.indexOf("gh pr merge"), "el simulacro debe cerrar el PR antes de llegar a fusionar");
  // El CI `pull_request` del PR del bot espera una aprobación que nunca llega: se cancela
  // antes de fusionar o cerrar, o caducaría en rojo (comprobado el 2026-10-06).
  const cancel = script.indexOf('gh run cancel "${run}"');
  assert.ok(cancel > 0 && cancel < script.indexOf("gh pr close") && cancel < script.indexOf("gh pr merge"),
    "hay que cancelar el CI pendiente del bot antes de cerrar o fusionar");
  // CI y Cloudflare comprueban con el reloj real: el simulacro ensaya con un commit vacío.
  assert.match(script, /git reset -q --hard\n  git commit -q --allow-empty/);
  assert.match(workflow, /if: failure\(\) && inputs\.simular == ''/, "un simulacro fallido no debe abrir avisos");
});
