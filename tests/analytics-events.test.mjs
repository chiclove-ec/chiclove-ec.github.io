import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const analytics = readFileSync(new URL("../js/analytics.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");

test("los clics de WhatsApp publican contexto mínimo y no contenido personal", () => {
  assert.match(analytics, /name: "whatsapp_click"|send\("whatsapp_click"/);
  assert.match(analytics, /link_context/);
  assert.match(analytics, /page_path/);
  assert.doesNotMatch(analytics, /whatsappOrderMessage|message|phone|address/i);
});

test("el checkout por WhatsApp mide un lead sólo después de abrirse", () => {
  const start = main.indexOf("function checkoutWhatsApp");
  const end = main.indexOf("\n}\n", start) + 3;
  assert.ok(start >= 0 && end > start, "no se encontró checkoutWhatsApp");
  const checkout = main.slice(start, end);
  const openBranch = checkout.indexOf("if (checkoutWindow)");
  assert.ok(openBranch >= 0, "no se encontró la confirmación de ventana abierta");
  const afterOpen = checkout.slice(openBranch);
  assert.match(afterOpen, /track\("begin_checkout"/);
  assert.match(afterOpen, /track\("generate_lead"/);
  assert.match(afterOpen, /method: "whatsapp"/);
  assert.match(afterOpen, /currency: "USD"/);
  assert.ok(!afterOpen.includes("whatsappOrderMessage"), "no se envía el mensaje del pedido a analítica");
});
