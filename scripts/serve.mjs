// Servidor local de verificación: sirve el artefacto de despliegue igual que producción
// (rutas sin extensión, 404 real y negociación `Accept: text/markdown`).
// Solo para desarrollo y verificación; no se publica.
//
//   npm run build && node scripts/serve.mjs --root=dist --port=8765
import { resolve } from "node:path";

import { projectRoot } from "./lib/catalog.mjs";
import { createSiteServer } from "./lib/static-site.mjs";

const arg = (name, fallback) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};

const root = resolve(projectRoot, arg("root", "dist"));
const port = Number.parseInt(arg("port", "8765"), 10);

createSiteServer(root).listen(port, () => {
  console.log(`Sirviendo ${root} en http://localhost:${port} (404 real + Accept: text/markdown)`);
});
