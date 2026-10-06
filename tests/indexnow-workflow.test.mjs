import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";

const workflow = readFileSync(
  resolve(projectRoot, ".github/workflows/deploy-pages.yml"),
  "utf8"
);

test("IndexNow solo se notifica después de publicar GitHub Pages", () => {
  assert.match(workflow, /notify-indexnow:/, "falta el trabajo automático de IndexNow");
  const job = workflow.split(/\n  notify-indexnow:/)[1];
  assert.ok(job, "falta el trabajo automático de IndexNow");
  assert.match(job, /needs:\s*deploy/, "debe esperar a que termine el despliegue");
  assert.match(job, /if:\s*\$\{\{\s*success\(\)\s*\}\}/, "no debe ejecutarse si falla el despliegue");
  assert.match(job, /node scripts\/indexnow\.mjs/, "debe usar el generador IndexNow existente");
  assert.doesNotMatch(job, /secrets\./, "la clave pública IndexNow no requiere secretos");
  assert.doesNotMatch(job, /pull_request:/, "no debe notificar desde revisiones");
});
