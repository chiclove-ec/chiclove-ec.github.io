import { access, cp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const outputDir = join(projectRoot, "dist");
const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
const target = targetArg ? targetArg.slice("--target=".length) : "generic";
const validTargets = new Set(["generic", "github-pages", "netlify", "cloudflare", "vercel"]);

if (!validTargets.has(target)) {
  throw new Error(`Target de despliegue no válido: ${target}`);
}
if (basename(outputDir) !== "dist" || dirname(outputDir) !== projectRoot) {
  throw new Error("Ruta de salida insegura; se canceló el build.");
}

const publicFiles = [
  ".well-known/security.txt",
  "404.html",
  "index.html",
  "nosotros.html",
  "producto.html",
  "robots.txt",
  "sitemap.xml",
  "tienda.html",
  "css/styles.css",
  "js/frame-guard.js",
  "js/main.js",
  "js/product-page.js",
  "js/products.js",
  "assets/img/blueberries.webp",
  "assets/img/bottle-acv.webp",
  "assets/img/bottle-antistress.webp",
  "assets/img/bottle-hair-nails.webp",
  "assets/img/bottle-radiant-skin.webp",
  "assets/img/bottle-sexual-m.webp",
  "assets/img/bottle-sexual-w.webp",
  "assets/img/bottle-sleep.webp",
  "assets/img/cover-lifestyle.webp",
  "assets/img/editorial-hair.webp",
  "assets/img/editorial-hair-bite.webp",
  "assets/img/editorial-gummy.webp",
  "assets/img/editorial-ritual.webp",
  "assets/img/editorial-skin.webp",
  "assets/img/favicon.svg",
  "assets/img/logo-dark.png",
  "assets/img/logo-white.png",
  "assets/img/splash-acv.webp",
  "assets/img/splash-antistress.webp",
  "assets/img/splash-hair-nails.webp",
  "assets/img/splash-radiant-skin.webp",
  "assets/img/splash-sexual-m.webp",
  "assets/img/splash-sexual-w.webp",
  "assets/img/splash-sleep.webp"
];

async function safeSource(entry) {
  const source = join(projectRoot, entry);
  const resolved = await realpath(source);
  const relativePath = relative(projectRoot, resolved);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`La entrada pública sale del proyecto: ${entry}`);
  }
  if (resolved !== resolve(source)) {
    throw new Error(`La entrada pública contiene un enlace simbólico: ${entry}`);
  }
  return source;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of publicFiles) {
  const destination = join(outputDir, entry);
  await mkdir(dirname(destination), { recursive: true });
  await cp(await safeSource(entry), destination, {
    errorOnExist: true,
    force: false
  });
}

if (target === "netlify" || target === "cloudflare" || target === "generic") {
  await cp(await safeSource("_headers"), join(outputDir, "_headers"));
}

if (target === "github-pages" || target === "generic") {
  await writeFile(join(outputDir, ".nojekyll"), "", { flag: "wx" });
}

const forbidden = ["README.md", "vercel.json", "netlify.toml", ".git", "docs", "output", ".agents", ".claude", ".playwright-cli"];
for (const entry of forbidden) {
  try {
    await access(join(outputDir, entry));
    throw new Error(`El artefacto contiene un archivo privado: ${entry}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

console.log(`Build seguro para ${target}: ${outputDir}`);
