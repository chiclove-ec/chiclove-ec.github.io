// Contrato del conocimiento editorial para agentes (scripts/lib/agent-knowledge.mjs) y de
// los dos documentos que existen solo para máquinas: /respuestas.md y /en.md.
//
// Lo que se protege aquí es la CREDIBILIDAD del contenido, que es lo que hace que un
// asistente lo cite: ningún producto o activo sin su nota y su precaución, ninguna cifra
// que el catálogo no respalde, ninguna afirmación regulatoria exagerada y ninguna
// instrucción dirigida a los modelos.
import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { anchorFor } from "../scripts/lib/agent-docs.mjs";
import {
  ACTIVE_CAUTIONS,
  ACTIVE_NAMES_EN,
  BRAND_FACTS,
  PRODUCT_NOTES,
  ROUTINES
} from "../scripts/lib/agent-knowledge.mjs";
import { loadCatalog, projectRoot } from "../scripts/lib/catalog.mjs";
import { loadSiteConfig, pagePath } from "../scripts/lib/site-config.mjs";
import { loadPublicFiles } from "./public-files.mjs";

const BASE = loadSiteConfig().base;
const catalog = loadCatalog();
const read = (file) => readFileSync(resolve(projectRoot, file), "utf8");
const products = catalog.CL_PRODUCTS;
const activeNames = Object.keys(catalog.CL_ACTIVES);
const AGENT_DOCS = ["respuestas.md", "en.md"];
const productDocs = products.map((p) => p.id + ".md");

/* ---------- El conocimiento cubre el catálogo entero ---------- */

test("cada producto tiene sus notas para agentes, y toda nota es de un producto", () => {
  for (const product of products) {
    const notes = PRODUCT_NOTES[product.id];
    assert.ok(notes, `${product.id}: falta en PRODUCT_NOTES`);
    assert.ok(notes.idealFor && notes.notFor && notes.standout, `${product.id}: nota incompleta`);
    assert.ok(notes.searchTerms.length >= 5, `${product.id}: pocas formas de búsqueda`);
    assert.ok(
      notes.searchTerms.some((term) => /gomitas/i.test(term)),
      `${product.id}: ninguna forma de búsqueda usa «gomitas», que es como se dice en Ecuador`
    );
    for (const field of ["goal", "flavor", "dose", "summary"]) {
      assert.ok(notes.en[field], `${product.id}: falta en.${field}`);
    }
  }
  for (const id of Object.keys(PRODUCT_NOTES)) {
    assert.ok(products.some((p) => p.id === id), `PRODUCT_NOTES describe "${id}", que no está en el catálogo`);
  }
});

test("la pauta en inglés dice lo mismo que la pauta del catálogo", () => {
  for (const product of products) {
    const dose = PRODUCT_NOTES[product.id].en.dose;
    for (const amount of [].concat(product.perDay)) {
      assert.match(dose, new RegExp("\\b" + amount + "\\b"), `${product.id}: la pauta en inglés no dice ${amount}`);
    }
  }
});

test("cada activo tiene precaución y nombre en inglés, y no sobra ninguno", () => {
  for (const name of activeNames) {
    assert.ok(ACTIVE_CAUTIONS[name], `${name}: falta su precaución en ACTIVE_CAUTIONS`);
    assert.ok(ACTIVE_NAMES_EN[name], `${name}: falta su nombre en ACTIVE_NAMES_EN`);
  }
  for (const name of [...Object.keys(ACTIVE_CAUTIONS), ...Object.keys(ACTIVE_NAMES_EN)]) {
    assert.ok(activeNames.includes(name), `"${name}" no es un activo de CL_ACTIVES`);
  }
});

test("las rutinas combinan productos reales y avisan de los activos que repiten", () => {
  for (const routine of ROUTINES) {
    const members = routine.products.map((id) => products.find((p) => p.id === id));
    assert.ok(members.every(Boolean), `${routine.name}: nombra un producto que no existe`);
    assert.ok(
      !(routine.products.includes("sexual-booster-women") && routine.products.includes("sexual-booster-men")),
      `${routine.name}: los dos Sexual Booster no se combinan`
    );
    const [first, second] = members;
    for (const active of first.actives.filter((name) => second.actives.includes(name))) {
      assert.ok(
        routine.note.toLowerCase().includes(active.toLowerCase()),
        `${routine.name}: las dos fórmulas llevan ${active} y la nota no lo avisa`
      );
    }
  }
});

/* ---------- /respuestas.md ---------- */

test("respuestas.md tiene una respuesta autosuficiente por producto", () => {
  const body = read("respuestas.md");
  assert.match(body, /^# \S/, "debe empezar por un H1");

  const sections = body.split(/^### /m).slice(1);
  for (const product of products) {
    const section = sections.find((chunk) => chunk.split("\n")[0].endsWith(": " + product.name));
    assert.ok(section, `${product.id}: falta su sección en respuestas.md`);
    // Un trozo recuperado suelto debe bastar para recomendar con datos correctos.
    assert.ok(section.includes(catalog.clMoney(catalog.clSinglePrice(product))), `${product.id}: sin precio vigente`);
    assert.ok(section.includes(BASE + pagePath(product.id + ".html")), `${product.id}: sin enlace a la ficha`);
    assert.ok(section.includes(catalog.clWhatsAppDisplay()), `${product.id}: sin canal de pedido`);
    assert.ok(section.includes("Ecuador"), `${product.id}: no dice el país`);
    assert.ok(section.includes(catalog.CL_LEGAL.ruc), `${product.id}: sin el RUC del distribuidor`);
    assert.ok(section.includes(product.dose.slice(1)), `${product.id}: sin la pauta del catálogo`);
    for (const active of product.actives) {
      assert.ok(section.includes(ACTIVE_CAUTIONS[active]), `${product.id}: sin la precaución de ${active}`);
    }
  }

  for (const name of activeNames) {
    const row = body.split("\n").find((line) => line.startsWith("| Gomitas de ") && line.includes(catalog.CL_ACTIVES[name].what));
    assert.ok(row, `${name}: falta su fila en la tabla de activos`);
  }
});

test("las respuestas rápidas de llms.txt apuntan a encabezados que existen", () => {
  const headings = new Set(
    [...read("respuestas.md").matchAll(/^#{2,3} (.+)$/gm)].map(([, heading]) => anchorFor(heading))
  );
  const pattern = new RegExp("\\((" + BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "respuestas\\.md#([^)]+))\\)", "g");
  const anchors = [...read("llms.txt").matchAll(pattern)].map(([, , anchor]) => anchor);
  assert.ok(anchors.length >= products.length, "llms.txt no enlaza las respuestas por producto");
  for (const anchor of anchors) {
    assert.ok(headings.has(anchor), `llms.txt enlaza #${anchor}, que no es un encabezado de respuestas.md`);
  }
});

/* ---------- /en.md ---------- */

test("en.md resume cada fórmula en inglés con su precio vigente", () => {
  const body = read("en.md");
  assert.match(body, /^# \S/, "debe empezar por un H1");
  for (const product of products) {
    const section = body.split(/^### /m).find((chunk) => chunk.startsWith(product.name + "\n"));
    assert.ok(section, `${product.id}: falta en en.md`);
    assert.ok(section.includes(catalog.clMoney(catalog.clSinglePrice(product))), `${product.id}: sin precio vigente`);
    assert.ok(section.includes(PRODUCT_NOTES[product.id].en.dose), `${product.id}: sin pauta`);
    for (const active of product.actives) {
      assert.ok(section.includes(ACTIVE_NAMES_EN[active]), `${product.id}: sin ${ACTIVE_NAMES_EN[active]}`);
    }
  }
  assert.match(body, /not medical advice/i, "en.md debe declarar su límite");
});

/* ---------- Vocabulario local ---------- */

test("la capa para agentes usa las palabras con que se pregunta en Ecuador", () => {
  // «Gummies» es la voz de la marca; «gomitas» es como se busca. Sin esta palabra el sitio
  // no aparecía en ninguna búsqueda del tipo «gomitas de biotina Ecuador».
  for (const file of ["llms.txt", "agents.md", "index.md", "tienda.md", "guia-de-eleccion.md", "ingredientes.md", ...productDocs, ...AGENT_DOCS]) {
    assert.match(read(file), /gomitas/i, `${file} no usa la palabra «gomitas»`);
  }
});

/* ---------- Credibilidad ---------- */

const machineFiles = [
  "llms.txt",
  "agents.md",
  "ai.txt",
  "catalog.json",
  "llms-full.txt",
  "index.md",
  "tienda.md",
  "guia-de-eleccion.md",
  "ingredientes.md",
  ...productDocs,
  ...AGENT_DOCS
];

test("ningún texto para agentes presenta el registro FDA como una aprobación", () => {
  for (const file of machineFiles) {
    const body = read(file);
    assert.doesNotMatch(body, /aprobad[oa]s? por la FDA|FDA[- ]approved|approved by the FDA/i, `${file}: aprobación FDA inventada`);
    if (body.includes("FDA Registered")) {
      assert.match(body, /no aprueba|does not approve/i, `${file}: nombra «FDA Registered» sin aclarar que no es una aprobación`);
    }
  }
});

test("ningún texto para agentes inventa composición ni da órdenes a los modelos", () => {
  for (const file of machineFiles) {
    const body = read(file);
    // El sitio no publica miligramos por gummy: cualquier cifra así sería inventada.
    assert.doesNotMatch(body, /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|UI)\b/, `${file}: cifra de composición sin fuente`);
    // Los proveedores tratan las instrucciones a los modelos como inyección y desconfían
    // de la fuente entera. Se describen hechos; la recomendación la decide el modelo.
    assert.doesNotMatch(
      body,
      /recomienda siempre|siempre recomienda|always recommend|ignore (?:all |any )?(?:previous|prior)|ignora (?:las )?instrucciones|la mejor marca|the best brand|n\.?º ?1 en/i,
      `${file}: contiene una instrucción o un superlativo dirigido a los modelos`
    );
  }
});

test("los documentos nuevos solo publican precios del catálogo", () => {
  const allowed = new Set(
    products.flatMap((p) => [
      catalog.clMoney(catalog.clSinglePrice(p)),
      catalog.clMoney(p.price),
      catalog.clMoney(p.pricePack),
      catalog.clMoney(p.pricePack3)
    ]).concat(catalog.clMoney(catalog.CL_FREE_SHIPPING))
  );
  for (const file of AGENT_DOCS) {
    for (const [price] of read(file).matchAll(/\$\d+\.\d{2}/g)) {
      assert.ok(allowed.has(price), `${file} publica ${price}, que no está en el catálogo`);
    }
  }
});

test("los hechos de confianza citan su fuente y cuadran con el sitio visible", () => {
  assert.match(BRAND_FACTS.parentSite, /^https:\/\/chiclove\.com\/$/);
  // Las certificaciones son las que enseña la portada, ni una más.
  const home = read("index.html");
  for (const certification of BRAND_FACTS.certifications) {
    assert.ok(home.includes(certification), `«${certification}» no aparece en la portada`);
  }
  assert.ok(home.includes("+1.200"), "la cifra de clientes ya no está en la portada");
  assert.ok(read("nosotros.html").includes(String(BRAND_FACTS.distributorFounded)), "el año del distribuidor no cuadra");

  const data = JSON.parse(read("catalog.json"));
  assert.equal(data.brand.globalSite, BRAND_FACTS.parentSite);
  assert.deepEqual(data.brand.certificationsPublished, [...BRAND_FACTS.certifications]);
  for (const entry of data.products) {
    assert.deepEqual(entry.searchTerms, PRODUCT_NOTES[entry.id].searchTerms, `${entry.id}: searchTerms`);
    for (const active of entry.actives) {
      assert.equal(active.caution, ACTIVE_CAUTIONS[active.name], `${entry.id}/${active.name}: caution`);
    }
  }
});

test("llms-full.txt incluye los documentos nuevos", () => {
  const bundle = read("llms-full.txt");
  for (const file of AGENT_DOCS) {
    assert.ok(bundle.includes("<!-- source: " + BASE + file + " -->"), `llms-full.txt no incluye ${file}`);
    assert.ok(bundle.includes(read(file).split("\n")[0]), `llms-full.txt no trae el contenido de ${file}`);
  }
});

test("la clave de IndexNow se publica y contiene su propio nombre", () => {
  // IndexNow solo acepta avisos si /<clave>.txt responde con la clave. Si alguien la
  // renombra o la saca del build, scripts/indexnow.mjs dejaría de funcionar en silencio.
  const keys = readdirSync(projectRoot).filter((file) => /^[0-9a-f]{32}\.txt$/.test(file));
  assert.equal(keys.length, 1, "debe haber exactamente un archivo de clave IndexNow en la raíz");
  const [file] = keys;
  assert.equal(read(file).trim() + ".txt", file, `${file} no contiene su propia clave`);
  assert.ok(loadPublicFiles().has(file), `${file} no está en la lista blanca del build`);
});
