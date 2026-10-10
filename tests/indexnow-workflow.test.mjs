import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";

const workflow = readFileSync(
  resolve(projectRoot, ".github/workflows/indexnow.yml"),
  "utf8"
);

test("IndexNow solo se notifica después de que Cloudflare Pages publique", () => {
  assert.match(workflow, /push:\s*\n\s+branches: \[main\]/, "debe avisar tras cada push a main");
  assert.match(workflow, /workflow_dispatch:/, "refresh-catalog.yml lo lanza tras fusionar");
  assert.doesNotMatch(workflow, /pull_request/, "no debe notificar desde revisiones");
  const job = workflow.split(/\n  notify-indexnow:/)[1];
  assert.ok(job, "falta el trabajo automático de IndexNow");
  const wait = job.indexOf("check_name=Cloudflare%20Pages");
  const notify = job.indexOf("node scripts/indexnow.mjs");
  assert.ok(wait > 0, "debe esperar al check «Cloudflare Pages» del commit");
  assert.ok(notify > wait, "debe avisar solo después de que Cloudflare publique");
  assert.match(job, /"completed success"\)/, "solo un despliegue en verde da paso al aviso");
  assert.match(job, /select\(\.app\.slug == "cloudflare-workers-and-pages"\)/, "el check debe venir de la app de Cloudflare");
  assert.match(job, /checks: read/, "necesita leer los checks del commit");
  assert.doesNotMatch(job, /secrets\./, "la clave pública IndexNow no requiere secretos");
});

test("ningún valor de GitHub se interpola dentro de un run:", () => {
  const runs = [...workflow.matchAll(/run: \|\n((?:\s{10,}.*\n?)+)|run: (.+)/g)].map(([, block, line]) => block || line);
  assert.ok(runs.length >= 2);
  for (const body of runs) assert.doesNotMatch(body, /\$\{\{/, `interpolación en un run:\n${body}`);
});
