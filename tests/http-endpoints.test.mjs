// Verificación de extremo a extremo sobre el artefacto de despliegue (dist/): códigos de
// estado, tipos de contenido y negociación markdown de cada endpoint público.
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { after, before, describe, test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";
import { MARKDOWN_TWINS } from "../scripts/lib/markdown-negotiation.mjs";
import { createSiteServer } from "../scripts/lib/static-site.mjs";

describe("endpoints publicados", () => {
  let server;
  let origin;

  before(async () => {
    // Se verifica el artefacto real, no el árbol de trabajo. El build reescribe dist/,
    // por eso `npm test` corre los ficheros en serie (--test-concurrency=1).
    execFileSync(process.execPath, ["scripts/build.mjs", "--target=github-pages"], {
      cwd: projectRoot,
      stdio: "pipe"
    });
    server = createSiteServer(resolve(projectRoot, "dist"));
    await new Promise((ready) => server.listen(0, ready));
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => server?.close());

  const get = (path, accept) =>
    fetch(origin + path, { headers: accept ? { Accept: accept } : {} });

  test("las páginas públicas responden 200 en HTML", async () => {
    const paths = ["/", "/tienda.html", "/nosotros.html", "/about", "/contact", "/privacy"];
    for (const path of paths) {
      const response = await get(path, "text/html");
      assert.equal(response.status, 200, `${path} no responde 200`);
      assert.match(response.headers.get("content-type"), /text\/html/, `${path}: tipo`);
    }
  });

  test("los archivos legibles por máquina se sirven con su tipo", async () => {
    const expected = {
      "/llms.txt": /text\/plain/,
      "/llms-full.txt": /text\/plain/,
      "/agents.md": /text\/markdown/,
      "/sitemap.xml": /xml/,
      "/robots.txt": /text\/plain/,
      "/index.md": /text\/markdown/,
      "/404.md": /text\/markdown/,
      "/.well-known/security.txt": /text\/plain/
    };
    for (const [path, type] of Object.entries(expected)) {
      const response = await get(path);
      assert.equal(response.status, 200, `${path} no responde 200`);
      assert.match(response.headers.get("content-type"), type, `${path}: tipo`);
    }
  });

  test("cada gemelo markdown se sirve por Accept y por su URL .md", async () => {
    for (const [page, markdown] of Object.entries(MARKDOWN_TWINS)) {
      const negotiated = await get(page, "text/markdown");
      assert.equal(negotiated.status, 200, `${page}: negociación`);
      assert.equal(
        negotiated.headers.get("content-type"),
        "text/markdown; charset=utf-8",
        `${page}: tipo negociado`
      );
      assert.equal(negotiated.headers.get("vary"), "Accept, Accept-Encoding", `${page}: Vary`);
      assert.match(
        negotiated.headers.get("link"),
        /rel="alternate"; type="text\/markdown"/,
        `${page}: Link alternate`
      );
      assert.match(await negotiated.text(), /^# /, `${page}: el cuerpo no es markdown`);

      const direct = await get(markdown);
      assert.equal(direct.status, 200, `${markdown}: acceso directo`);
    }
  });

  test("el HTML negociado también declara Vary: Accept", async () => {
    const response = await get("/", "text/html");
    assert.equal(response.headers.get("vary"), "Accept, Accept-Encoding");
    assert.match(await response.text(), /^<!DOCTYPE html>/);
  });

  test("se respetan los valores q en la negociación", async () => {
    const markdown = await get("/tienda.html", "text/markdown;q=0.9, text/html;q=0.1");
    assert.match(markdown.headers.get("content-type"), /text\/markdown/);

    const html = await get("/tienda.html", "text/markdown;q=0.1, text/html;q=0.9");
    assert.match(html.headers.get("content-type"), /text\/html/);

    const excluded = await get("/tienda.html", "text/markdown;q=0, */*");
    assert.match(excluded.headers.get("content-type"), /text\/html/);
  });

  test("un tipo no soportado devuelve 406", async () => {
    const response = await get("/", "application/json");
    assert.equal(response.status, 406);
    assert.equal(response.headers.get("vary"), "Accept, Accept-Encoding");
  });

  test("una ruta inexistente devuelve 404 con cuerpo de recuperación", async () => {
    const response = await get("/esta-ruta-no-existe", "text/html");
    assert.equal(response.status, 404);
    const body = await response.text();
    for (const target of ["/llms.txt", "/sitemap.xml", "/tienda.html"]) {
      assert.ok(body.includes(`href="${target}"`), `el 404 no enlaza ${target}`);
    }
  });

  test("un agente que pide markdown recibe el 404 en markdown", async () => {
    const response = await get("/esta-ruta-no-existe", "text/markdown");
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type"), /text\/markdown/);
    const body = await response.text();
    assert.match(body, /^# 404/);
    assert.ok(body.includes("llms.txt"));
  });

  test("los recursos que no son páginas no se negocian", async () => {
    const response = await get("/css/styles.css", "text/markdown");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/css/);
    assert.equal(response.headers.get("vary"), null);
  });

  test("el artefacto no publica archivos privados", async () => {
    for (const path of ["/README.md", "/vercel.json", "/scripts/build.mjs", "/docs/"]) {
      const response = await get(path, "text/html");
      assert.equal(response.status, 404, `${path} no debería publicarse`);
    }
  });
});
