#!/usr/bin/env bash
# Lo llama .github/workflows/refresh-catalog.yml cuando `npm run refresh` cambió algo
# porque una promoción abrió o cerró. Sube lo regenerado a una rama, abre el PR, espera
# a que `main` lo admita y lo fusiona. Cloudflare Pages publica solo al ver el push a
# `main`; después se lanza el aviso a IndexNow, que espera a que Cloudflare termine.
#
# El check obligatorio de CI no puede venir de ci.yml: lo que hace el GITHUB_TOKEN no
# dispara `pull_request`, y un CI lanzado con `workflow_dispatch` corre pero GitHub no
# lo asocia al PR (comprobado el 2026-10-06). Por eso este script ejecuta los mismos
# tres pasos que ci.yml sobre el commit exacto que sube y publica el resultado como
# estado de ese commit, con el nombre del check. El otro obligatorio, Cloudflare Pages,
# lo pone Cloudflare al construir la rama.
#
# Con SIMULATED (la fecha de un simulacro) no fusiona nunca. El contenido simulado ya
# pasó la suite con su reloj en el paso anterior del workflow; aquí se prueba el
# circuito con un commit vacío, porque CI y Cloudflare comprueban con el reloj real.
set -euo pipefail

: "${GH_TOKEN:?falta GH_TOKEN}" "${GH_REPO:?falta GH_REPO}"
simulated="${SIMULATED:-}"
check="Pruebas, build y coherencia de lo generado"
dia="$(TZ=America/Guayaquil date +%F)"
if [ -n "${simulated}" ]; then
  rama="auto/simulacro-$(date -u +%Y%m%d%H%M%S)"
  titulo="Simulacro del catálogo para ${simulated} (no se fusiona)"
else
  rama="auto/catalogo-${dia}"
  titulo="Catálogo al día con las promociones del ${dia}"
fi
# El paso de aviso necesita la rama si algo falla más abajo.
if [ -n "${GITHUB_ENV:-}" ]; then echo "RAMA=${rama}" >> "${GITHUB_ENV}"; fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git switch -c "${rama}"
if [ -n "${simulated}" ]; then
  git reset -q --hard
  git commit -q --allow-empty -m "${titulo}" -m "Commit vacío: prueba el circuito de refresh-catalog.yml sin publicar nada."
else
  git add -A
  git commit -q -m "${titulo}" -m "Regenerado por refresh-catalog.yml: una promoción de js/products.js abrió o cerró y lo generado (JSON-LD, markdown, catalog.json y la franja superior del HTML) llevaba el precio anterior."
fi
sha="$(git rev-parse HEAD)"

# Los tres pasos de ci.yml, sobre este commit y con el reloj real, como los haría CI.
env -u CL_NOW npm test
env -u CL_NOW npm run build:cloudflare
env -u CL_NOW npm run gen
if ! git diff --quiet; then
  echo "::error::Lo generado no está al día con el catálogo en el commit que se iba a subir."
  git --no-pager diff --stat
  exit 1
fi

gh auth setup-git
# Una rama de hoy que ya exista es de un intento anterior: se reemplaza.
git push --force origin "${rama}"

pr="$(gh pr list --head "${rama}" --state open --json number --jq '.[0].number // empty')"
if [ -z "${pr}" ]; then
  cuerpo="$(printf '%s\n\n%s\n\n%s' \
    "Una promoción de \`js/products.js\` abrió o cerró y lo generado llevaba el precio anterior. Esto es la salida de \`npm run refresh\` con la fecha del ${dia} en Ecuador." \
    "La web visible ya había cambiado sola en el navegador; este PR pone al día lo que leen Google y los agentes (JSON-LD, markdown, \`catalog.json\`, \`llms.txt\`) y la franja superior escrita en el HTML." \
    "Lo abrió y lo fusiona \`.github/workflows/refresh-catalog.yml\` en cuanto pasan los checks obligatorios de \`main\`. El de CI lo publica el propio workflow tras ejecutar los pasos de \`ci.yml\` sobre este commit: ${RUN_URL:-}")"
  url="$(gh pr create --base main --head "${rama}" --title "${titulo}" --body "${cuerpo}")"
  pr="${url##*/}"
fi
echo "PR #${pr}: ${rama} (${sha})"

gh api "repos/${GH_REPO}/statuses/${sha}" -f state=success -f context="${check}" \
  -f description="Suite, build y coherencia: ejecutados por refresh-catalog.yml" \
  -f target_url="${RUN_URL:-}" >/dev/null

# Espera a que `main` admita el PR (falta Cloudflare, que construye la rama).
limite=$(( $(date +%s) + 30 * 60 ))
while :; do
  # GitHub sí crea un CI `pull_request` para el PR del bot, pero lo deja esperando
  # aprobación (trata al bot como quien contribuye por primera vez), sin jobs, y al
  # cerrarse el PR caduca en rojo. Se aprueba: el CI corre de verdad sobre el PR y su
  # resultado también cuenta como el check obligatorio. Si no se pudiera, basta el estado.
  for run in $(gh run list --branch "${rama}" --workflow ci.yml --json databaseId,conclusion \
      --jq '.[] | select(.conclusion == "action_required") | .databaseId'); do
    if gh api -X POST "repos/${GH_REPO}/actions/runs/${run}/approve" >/dev/null; then
      echo "CI del PR aprobado: ejecución ${run}"
    else
      echo "::warning::No se pudo aprobar el CI ${run}; el check obligatorio lo cubre el estado publicado."
    fi
  done
  estado="$(gh pr view "${pr}" --json mergeStateStatus --jq .mergeStateStatus)"
  # UNSTABLE = obligatorios en verde y algún check opcional (CodeQL) aún sin terminar.
  # Se confirma además con la lista de obligatorios: el estado agregado puede ir con retraso.
  obligatorios="$(gh pr checks "${pr}" --required --json bucket \
    --jq 'length > 0 and all(.[]; .bucket == "pass")' || true)"
  case "${estado}" in
    CLEAN|UNSTABLE|HAS_HOOKS) if [ "${obligatorios}" = "true" ]; then break; fi ;;
    BEHIND)
      # `main` avanzó: el commit validado ya no es el que se fusionaría. Mejor parar
      # que fusionar algo sin comprobar; la siguiente pasada lo rehace desde `main`.
      echo "::error::main avanzó mientras se esperaba al PR #${pr}."
      exit 1 ;;
    DIRTY) echo "::error::El PR #${pr} entra en conflicto con main."; exit 1 ;;
  esac
  fallidos="$(gh pr checks "${pr}" --required --json name,bucket \
    --jq '[.[] | select(.bucket == "fail" or .bucket == "cancel") | .name] | join(", ")' || true)"
  if [ -n "${fallidos}" ]; then
    echo "::error::Fallaron checks obligatorios del PR #${pr}: ${fallidos}"
    exit 1
  fi
  if [ "$(date +%s)" -ge "${limite}" ]; then
    echo "::error::El PR #${pr} no quedó listo para fusionar en 30 minutos (estado: ${estado})."
    exit 1
  fi
  sleep 30
done

if [ -n "${simulated}" ]; then
  gh pr close "${pr}" --delete-branch \
    --comment "Simulacro completado: el PR del bot quedó fusionable (${estado}) con los checks obligatorios en verde. No se fusiona."
  echo "Simulacro completado sin fusionar: el PR #${pr} quedó ${estado}."
  exit 0
fi

gh pr merge "${pr}" --squash --delete-branch --match-head-commit "${sha}"
# El push del GITHUB_TOKEN no dispara workflows: IndexNow se lanza a mano y espera
# a que Cloudflare publique el commit fusionado antes de avisar.
gh workflow run indexnow.yml --ref main
echo "PR #${pr} fusionado; Cloudflare publica el push a main y el aviso a IndexNow queda lanzado."

# Si quedaba abierto un aviso de un intento fallido, ya no aplica.
if [ -n "${ALERT_TITLE:-}" ]; then
  abierto="$(gh issue list --state open --limit 100 --json number,title \
    --jq 'map(select(.title == env.ALERT_TITLE)) | .[0].number // empty')"
  if [ -n "${abierto}" ]; then
    gh issue close "${abierto}" --comment "Resuelto: el PR #${pr} actualizó y publicó el catálogo."
  fi
fi
