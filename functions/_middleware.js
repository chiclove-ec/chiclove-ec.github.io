// Cloudflare Pages Function: negociación de contenido `Accept: text/markdown`.
//
// Cloudflare Pages es el único destino de despliegue del proyecto capaz de negociar
// por cabecera (GitHub Pages y Netlify sirven estáticos sin lógica; ver README).
// La lógica vive en scripts/lib/markdown-negotiation.mjs para poder testearla.
import {
  MARKDOWN_CONTENT_TYPE,
  negotiationHeaders,
  planResponse,
  prefersMarkdown
} from "../scripts/lib/markdown-negotiation.mjs";

const NOT_ACCEPTABLE_BODY = [
  "# 406 Not Acceptable",
  "",
  "Este recurso solo existe como `text/html` y `text/markdown`.",
  "Repite la petición con `Accept: text/markdown` o `Accept: text/html`.",
  "",
  "- Índice para agentes: https://chiclove-ec.github.io/llms.txt",
  "- Mapa del sitio: https://chiclove-ec.github.io/sitemap.xml",
  ""
].join("\n");

function withNegotiationHeaders(headers, markdownPath) {
  const merged = new Headers(headers);
  for (const [key, value] of Object.entries(negotiationHeaders(markdownPath))) {
    merged.set(key, value);
  }
  return merged;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const plan = planResponse({
    pathname: url.pathname,
    accept: request.headers.get("accept")
  });

  if (plan.kind === "passthrough") {
    const response = await next();
    // El 404 también se negocia: un agente que pide markdown recibe /404.md.
    if (response.status === 404 && prefersMarkdown(request.headers.get("accept"))) {
      const notFound = await env.ASSETS.fetch(new URL("/404.md", url).toString());
      if (notFound.ok) {
        const headers = withNegotiationHeaders(notFound.headers, "/404.md");
        headers.set("Content-Type", MARKDOWN_CONTENT_TYPE);
        return new Response(request.method === "HEAD" ? null : notFound.body, {
          status: 404,
          headers
        });
      }
    }
    return response;
  }

  if (plan.kind === "notAcceptable") {
    return new Response(NOT_ACCEPTABLE_BODY, {
      status: 406,
      headers: withNegotiationHeaders(
        { "Content-Type": "text/plain; charset=utf-8" },
        plan.markdownPath
      )
    });
  }

  if (plan.kind === "markdown") {
    const asset = await env.ASSETS.fetch(new URL(plan.markdownPath, url).toString());
    if (asset.ok) {
      const headers = withNegotiationHeaders(asset.headers, plan.markdownPath);
      headers.set("Content-Type", MARKDOWN_CONTENT_TYPE);
      return new Response(request.method === "HEAD" ? null : asset.body, {
        status: 200,
        headers
      });
    }
    // Si el gemelo markdown faltara, es preferible servir el HTML que fallar.
  }

  const response = await next();
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: withNegotiationHeaders(response.headers, plan.markdownPath)
  });
}
