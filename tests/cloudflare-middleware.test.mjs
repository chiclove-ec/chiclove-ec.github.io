// La función de Cloudflare Pages solo usa APIs web (Request/Response/Headers), así que se
// puede ejercitar en Node con un `env.ASSETS` y un `next()` simulados.
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { onRequest } from "../functions/_middleware.js";

const assets = {
  fetch: async (url) =>
    new Response("# markdown\n", {
      status: url.endsWith(".md") ? 200 : 404,
      headers: { "content-type": "text/plain" }
    })
};

const call = (path, accept, { nextStatus = 200, method = "GET" } = {}) =>
  onRequest({
    request: new Request("https://chiclove-ec.github.io" + path, {
      method,
      headers: accept ? { accept } : {}
    }),
    env: { ASSETS: assets },
    next: async () =>
      new Response(nextStatus === 404 ? "<!DOCTYPE html>404" : "<!DOCTYPE html>", {
        status: nextStatus,
        headers: { "content-type": "text/html; charset=utf-8" }
      })
  });

test("sirve el gemelo markdown cuando se negocia", async () => {
  const response = await call("/", "text/markdown");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(response.headers.get("vary"), "Accept, Accept-Encoding");
  assert.match(response.headers.get("link"), /<\/index\.md>; rel="alternate"/);
  assert.match(await response.text(), /^# /);
});

test("el HTML negociado conserva su tipo y declara Vary", async () => {
  const response = await call("/tienda.html", "text/html");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.equal(response.headers.get("vary"), "Accept, Accept-Encoding");
});

test("responde 406 a un tipo no soportado", async () => {
  const response = await call("/about.html", "application/json");
  assert.equal(response.status, 406);
  assert.equal(response.headers.get("vary"), "Accept, Accept-Encoding");
  assert.match(await response.text(), /406 Not Acceptable/);
});

test("el 404 se sirve en markdown si el agente lo pide", async () => {
  const response = await call("/no-existe", "text/markdown", { nextStatus: 404 });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
});

test("el 404 normal se sirve en HTML", async () => {
  const response = await call("/no-existe", "text/html", { nextStatus: 404 });
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /text\/html/);
});

test("los recursos que no son páginas pasan sin tocar", async () => {
  const response = await call("/css/styles.css", "text/markdown");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("vary"), null);
});

test("HEAD no devuelve cuerpo", async () => {
  const response = await call("/", "text/markdown", { method: "HEAD" });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
});
