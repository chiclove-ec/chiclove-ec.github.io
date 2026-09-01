import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { projectRoot } from "../scripts/lib/catalog.mjs";

test("el informe semanal genera HTML determinista sin credenciales", () => {
  const check = `
import datetime as dt
import importlib.util
from zoneinfo import ZoneInfo
spec = importlib.util.spec_from_file_location("report", "scripts/analytics_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
windows = module.date_windows(dt.date(2026, 9, 7))
html = module.report_html(module.sample_data(), windows, dt.datetime(2026, 9, 7, 14, tzinfo=ZoneInfo("America/Guayaquil")))
assert "<svg" in html
assert "marketing@laboratorioslira.com" in html
assert "Hair &amp; Nails Forte" in html
assert windows["current_start"].isoformat() == "2026-08-31"
`;
  execFileSync("python3", ["-B", "-c", check], { cwd: projectRoot, stdio: "pipe" });
});

test("el workflow queda programado los lunes y usa el destinatario correcto", () => {
  const workflow = readFileSync(`${projectRoot}/.github/workflows/weekly-analytics-report.yml`, "utf8");
  assert.match(workflow, /cron: ["']0 14 \* \* 1["']/);
  assert.match(workflow, /REPORT_TO_EMAIL: marketing@laboratorioslira\.com/);
  assert.match(workflow, /GA4_SERVICE_ACCOUNT_JSON/);
  assert.match(workflow, /REPORT_SMTP_PASSWORD/);
});
