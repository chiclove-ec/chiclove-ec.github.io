// El dominio del sitio se declara una sola vez (site.config.json) y el build lo
// reescribe al publicar. Estas pruebas cuidan las tres cosas que harían que una
// mudanza de dominio saliera mal: que alguien vuelva a escribir el dominio a
// mano en el código, que la reescritura se lleve por delante las URLs del
// repositorio en GitHub, y que el despliegue a Cloudflare deje de cuadrar con
// la configuración.
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";
import { loadPublicFiles } from "./public-files.mjs";
import {
  assertOrigin,
  isTextArtifact,
  loadSiteConfig,
  originTraces,
  rewriteOrigin,
  TEXT_EXTENSIONS,
  withoutGitHubUrls
} from "../scripts/lib/site-config.mjs";

const read = (file) => readFileSync(resolve(projectRoot, file), "utf8");
const config = loadSiteConfig();

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: projectRoot })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

/* ---------- La configuración ---------- */

test("site.config.json declara orígenes válidos", () => {
  assert.equal(assertOrigin(config.canonicalOrigin, "canonicalOrigin"), config.canonicalOrigin);
  assert.equal(assertOrigin(config.sourceOrigin, "sourceOrigin"), config.sourceOrigin);
  assert.equal(config.base, config.canonicalOrigin + "/");
});

test("un origen mal formado se rechaza con un mensaje útil", () => {
  // Dominios ficticios a propósito: nombrar aquí el dominio real haría fallar
  // la prueba que prohíbe incrustarlo en el código en cuanto el sitio se mudara.
  for (const invalid of [
    "dominio.nuevo",
    "http://dominio.nuevo",
    "https://dominio.nuevo/",
    "https://dominio.nuevo/tienda",
    ""
  ]) {
    assert.throws(() => assertOrigin(invalid, "prueba"), /prueba/, `${invalid} debería rechazarse`);
  }
});

/* ---------- Nadie vuelve a escribir el dominio a mano ---------- */

// El dominio vive escrito en el CONTENIDO del sitio (canónicas, JSON-LD,
// markdown), que es justo lo que el build reescribe. Lo que no puede volver a
// pasar es que lo haga el CÓDIGO, que sí puede leer la configuración.
const CODE_DIRECTORIES = ["scripts/", "tests/", "functions/"];

test("el código no incrusta el dominio: lo lee de site.config.json", () => {
  for (const file of tracked) {
    if (!CODE_DIRECTORIES.some((directory) => file.startsWith(directory))) continue;
      const body = withoutGitHubUrls(read(file));
    for (const trace of originTraces(config.sourceOrigin)) {
      assert.ok(
        !body.includes(trace),
        `${file} escribe "${trace}" a mano; usa loadSiteConfig() en su lugar`
      );
    }
  }
});

// Se comprueba sobre lo que SE PUBLICA y sobre el código. La documentación del
// repositorio (README, CONTRIBUTING…) no se publica y nombra dominios de ejemplo
// para explicar precisamente cómo se muda el sitio.
test("nada de lo publicado nombra un dominio propio distinto del declarado", () => {
  const publicFiles = loadPublicFiles();
  const allowed = new Set([new URL(config.sourceOrigin).host, "github.com"]);
  const offenders = [];
  for (const file of tracked) {
    if (!TEXT_EXTENSIONS.has(extname(file))) continue;
    const publicado = publicFiles.has(file);
    const esCodigo = CODE_DIRECTORIES.some((directory) => file.startsWith(directory));
    if (!publicado && !esCodigo) continue;
    for (const [, host] of read(file).matchAll(/https:\/\/([a-z0-9.-]*chiclove[a-z0-9.-]*)/gi)) {
      if (!allowed.has(host.toLowerCase())) offenders.push(`${file}: ${host}`);
    }
  }
  assert.deepEqual(offenders, [], "hay dominios propios sin declarar en site.config.json");
});

/* ---------- La reescritura ---------- */

const OTHER = "https://ejemplo.test";

test("la reescritura mueve las URLs del sitio, en forma completa y de host suelto", () => {
  const source = [
    `<link rel="canonical" href="${config.sourceOrigin}/tienda.html">`,
    `Esta dirección no existe en ${new URL(config.sourceOrigin).host}.`,
    `Sitemap: ${config.sourceOrigin}/sitemap.xml`
  ].join("\n");

  const moved = rewriteOrigin(source, { from: config.sourceOrigin, to: OTHER });
  assert.ok(moved.includes(`href="${OTHER}/tienda.html"`), "no movió la canónica");
  assert.ok(moved.includes(`no existe en ${new URL(OTHER).host}.`), "no movió el host suelto");
  assert.ok(moved.includes(`Sitemap: ${OTHER}/sitemap.xml`), "no movió el sitemap");
  for (const trace of originTraces(config.sourceOrigin)) {
    assert.ok(!moved.includes(trace), `quedó "${trace}" tras la reescritura`);
  }
});

test("la reescritura no toca las URLs del repositorio en GitHub", () => {
  // El repositorio se llama igual que el dominio de Pages pero no se muda con él:
  // se construye así a propósito, para reproducir justamente ese caso.
  const repository = `https://github.com/chiclove-ec/${new URL(config.sourceOrigin).host}`;
  const source = [
    `[![CI](${repository}/actions/workflows/ci.yml/badge.svg)](${repository}/actions)`,
    `"url": "git+${repository}.git"`,
    `<link rel="canonical" href="${config.sourceOrigin}/">`
  ].join("\n");

  const moved = rewriteOrigin(source, { from: config.sourceOrigin, to: OTHER });
  assert.equal(
    moved.split(repository).length - 1,
    3,
    "se perdió alguna URL del repositorio al reescribir el dominio"
  );
  assert.ok(moved.includes(`href="${OTHER}/"`), "no movió la canónica del sitio");
});

test("reescribir al mismo origen no cambia nada", () => {
  const source = read("index.html");
  assert.equal(rewriteOrigin(source, { from: config.sourceOrigin, to: config.sourceOrigin }), source);
});

/* ---------- El build publica en el dominio declarado ---------- */

test("el build reescribe el artefacto entero al publicar en otro dominio", () => {
  const build = (args) =>
    execFileSync(process.execPath, ["scripts/build.mjs", ...args], {
      cwd: projectRoot,
      encoding: "utf8"
    });

  try {
    const log = build(["--target=cloudflare", `--origin=${OTHER}`]);
    assert.match(log, new RegExp(OTHER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    // El propio build falla si queda un rastro, así que llegar aquí ya es la
    // prueba; se comprueban además las canónicas por ser lo que ve Google.
    const published = readFileSync(resolve(projectRoot, "dist/index.html"), "utf8");
    assert.ok(published.includes(`href="${OTHER}/"`), "la canónica no se reescribió");
    assert.ok(
      !withoutGitHubUrls(published).includes(new URL(config.sourceOrigin).host),
      "el artefacto conserva el dominio de las fuentes"
    );
  } finally {
    // Deja dist/ como lo espera cualquier inspección posterior.
    build(["--target=github-pages"]);
  }
});

test("un origen inválido detiene el build", () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, ["scripts/build.mjs", "--target=generic", "--origin=dominio.nuevo"], {
        cwd: projectRoot,
        stdio: "pipe"
      }),
    /origin/i
  );
});

test("_headers también entra en la reescritura del dominio", () => {
  // No tiene extensión, así que `extname()` no lo reconoce como texto. Se quedó
  // fuera de la reescritura en su día: es justo el archivo del proveedor que
  // servirá el dominio oficial, y una cabecera con URL apuntaría al viejo.
  assert.ok(isTextArtifact("_headers"), "_headers debe tratarse como texto");
  assert.ok(isTextArtifact("index.html"));
  assert.ok(!isTextArtifact("assets/img/logo-dark.png"));
});

test("_headers se publica solo donde el proveedor lo aplica", () => {
  const build = read("scripts/build.mjs");
  assert.match(
    build,
    /artifacts\.push\("_headers"\)/,
    "_headers debe publicarse por la misma vía que el resto del artefacto"
  );
  assert.doesNotMatch(
    build,
    /cp\(await safeSource\("_headers"\)/,
    "_headers ya no debe copiarse por fuera de la reescritura"
  );
});

/* ---------- Cloudflare ---------- */

test("wrangler.toml cuadra con site.config.json y con el build", () => {
  const wrangler = read("wrangler.toml");
  const name = wrangler.match(/^name\s*=\s*"([^"]+)"/m);
  assert.ok(name, "wrangler.toml no declara name");
  assert.equal(
    name[1],
    config.cloudflare.projectName,
    "el proyecto de Pages no coincide con cloudflare.projectName"
  );
  assert.match(
    wrangler,
    /^pages_build_output_dir\s*=\s*"dist"/m,
    "wrangler.toml debe publicar dist/"
  );
  assert.match(wrangler, /^compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/m);
});

test("el despliegue manual a Cloudflare pasa por CI y exige sus secretos", () => {
  const workflow = read(".github/workflows/deploy-cloudflare.yml");
  assert.match(workflow, /uses:\s*\.\/\.github\/workflows\/ci\.yml/, "no llama a CI");
  assert.match(
    workflow,
    /needs\.guard\.outputs\.configured == 'true'/,
    "no está condicionado a que Cloudflare esté configurado"
  );
  assert.match(workflow, /npm run build:cloudflare/, "no usa el build de Cloudflare");
  for (const secret of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) {
    assert.ok(workflow.includes(secret), `el workflow no usa ${secret}`);
  }
});

test("todas las acciones de GitHub están ancladas a un SHA", () => {
  for (const file of tracked) {
    if (!file.startsWith(".github/workflows/")) continue;
    for (const [, ref] of read(file).matchAll(/uses:\s*([^\s]+)/g)) {
      if (ref.startsWith("./")) continue; // workflow reutilizable del propio repositorio
      assert.match(ref, /@[0-9a-f]{40}$/, `${file} usa ${ref} sin anclar a un SHA`);
    }
  }
});
