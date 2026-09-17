import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

test("la configuración incompleta enumera cada secreto requerido sin exponer valores", () => {
  const check = `
import importlib.util
spec = importlib.util.spec_from_file_location("report", "scripts/analytics_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
try:
    module.validate_config({})
except RuntimeError as error:
    message = str(error)
    for name in ("GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_JSON", "REPORT_SMTP_USER", "REPORT_SMTP_PASSWORD"):
        assert name in message, message
    assert "marketing@laboratorioslira.com" not in message
else:
    raise AssertionError("La configuración vacía debe rechazarse")
`;
  execFileSync("python3", ["-B", "-c", check], { cwd: projectRoot, stdio: "pipe" });
});

test("el preflight de CLI informa el error sin una traza técnica", () => {
  const env = { ...process.env };
  for (const name of ["GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_JSON", "REPORT_SMTP_USER", "REPORT_SMTP_PASSWORD"]) {
    delete env[name];
  }
  assert.throws(
    () => execFileSync("python3", ["scripts/analytics_report.py", "--check-config"], { cwd: projectRoot, env, stdio: "pipe" }),
    (error) => {
      const stderr = error.stderr.toString();
      assert.match(stderr, /Configuración inválida del informe semanal/);
      assert.doesNotMatch(stderr, /Traceback/);
      return true;
    },
  );
});

test("la configuración válida se normaliza y conserva el destinatario de Lira", () => {
  const check = `
import importlib.util
spec = importlib.util.spec_from_file_location("report", "scripts/analytics_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
config = module.validate_config({
    "GA4_PROPERTY_ID": "123456789",
    "GA4_SERVICE_ACCOUNT_JSON": '{"type":"service_account","client_email":"reporter@example.com","private_key":"-----BEGIN PRIVATE KEY-----\\\\nfake\\\\n-----END PRIVATE KEY-----"}',
    "REPORT_SMTP_USER": "reporter@example.com",
    "REPORT_SMTP_PASSWORD": "app-password",
    "REPORT_TO_EMAIL": "marketing@laboratorioslira.com",
    "REPORT_TIMEZONE": "America/Guayaquil",
})
assert config["property_id"] == "123456789"
assert config["smtp_host"] == "smtp.gmail.com"
assert config["smtp_port"] == 465
assert config["recipient"] == "marketing@laboratorioslira.com"
try:
    module.validate_config({
        "GA4_PROPERTY_ID": "123456789",
        "GA4_SERVICE_ACCOUNT_JSON": '{"client_email":"reporter@example.com","private_key":"-----BEGIN PRIVATE KEY-----\\\\nfake\\\\n-----END PRIVATE KEY-----"}',
        "REPORT_SMTP_USER": "reporter@example.com",
        "REPORT_SMTP_PASSWORD": "app-password",
        "REPORT_TO_EMAIL": "otro@example.com",
    })
except RuntimeError as error:
    assert "REPORT_TO_EMAIL" in str(error)
else:
    raise AssertionError("El destinatario del reporte no debe poder cambiarse")
try:
    module.validate_config({
        "GA4_PROPERTY_ID": "123456789",
        "GA4_SERVICE_ACCOUNT_JSON": '{"type":"service_account","client_email":"reporter@example.com","private_key":"fake-key"}',
        "REPORT_SMTP_USER": "reporter@example.com",
        "REPORT_SMTP_PASSWORD": "app-password",
    })
except RuntimeError as error:
    assert "private_key" in str(error)
else:
    raise AssertionError("Una clave privada que no es PEM debe rechazarse")
`;
  execFileSync("python3", ["-B", "-c", check], { cwd: projectRoot, stdio: "pipe" });
});

test("la previsualización con fixture sigue funcionando sin credenciales", () => {
  const folder = mkdtempSync(`${tmpdir()}/cl-analytics-`);
  const fixture = `${folder}/fixture.json`;
  const output = `${folder}/report.html`;
  writeFileSync(fixture, "{}", "utf8");
  const env = { ...process.env };
  for (const name of ["GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_JSON", "REPORT_SMTP_USER", "REPORT_SMTP_PASSWORD"]) {
    delete env[name];
  }
  try {
    execFileSync("python3", ["scripts/analytics_report.py", "--fixture", fixture, "--output", output], {
      cwd: projectRoot,
      env,
      stdio: "pipe",
    });
    assert.match(readFileSync(output, "utf8"), /Tu semana en datos/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("la contraseña SMTP tolera espacios invisibles o separadores de copia", () => {
  const check = `
import importlib.util
spec = importlib.util.spec_from_file_location("report", "scripts/analytics_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
config = module.validate_config({
    "GA4_PROPERTY_ID": "123456789",
    "GA4_SERVICE_ACCOUNT_JSON": '{"client_email":"reporter@example.com","private_key":"-----BEGIN PRIVATE KEY-----\\\\nfake\\\\n-----END PRIVATE KEY-----"}',
    "REPORT_SMTP_USER": "reporter@example.com",
    "REPORT_SMTP_PASSWORD": "\\u00a0app- password\\u00a0",
})
assert config["smtp_password"] == "app-password"
`;
  execFileSync("python3", ["-B", "-c", check], { cwd: projectRoot, stdio: "pipe" });
});

test("el envío SMTP construye un correo HTML dirigido a Lira", () => {
  const check = `
import importlib.util
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("report", "scripts/analytics_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class FakeSMTP:
    instance = None
    def __init__(self, *args, **kwargs):
        FakeSMTP.instance = self
        self.args = args
        self.kwargs = kwargs
        self.message = None
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def login(self, username, password):
        assert username == "reporter@example.com"
        assert password == "app-password"
    def send_message(self, message):
        self.message = message
config = {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 465,
    "smtp_user": "reporter@example.com",
    "smtp_password": "app-password",
    "sender": "reporter@example.com",
    "recipient": "marketing@laboratorioslira.com",
}
with patch.object(module.smtplib, "SMTP_SSL", FakeSMTP):
    module.send_email("Asunto", "<p>Informe</p>", "Informe", config)
assert FakeSMTP.instance.args == ("smtp.gmail.com", 465)
assert FakeSMTP.instance.message["To"] == "marketing@laboratorioslira.com"
assert FakeSMTP.instance.message.get_body(preferencelist=("html",)).get_content().strip() == "<p>Informe</p>"
`;
  execFileSync("python3", ["-B", "-c", check], { cwd: projectRoot, stdio: "pipe" });
});

test("el workflow queda programado los lunes y usa el destinatario correcto", () => {
  const workflow = readFileSync(`${projectRoot}/.github/workflows/weekly-analytics-report.yml`, "utf8");
  assert.match(workflow, /cron: ["']0 14 \* \* 1["']/);
  assert.match(workflow, /REPORT_TO_EMAIL: marketing@laboratorioslira\.com/);
  assert.match(workflow, /GA4_SERVICE_ACCOUNT_JSON/);
  assert.match(workflow, /REPORT_SMTP_PASSWORD/);
  const preflight = workflow.indexOf("python3 scripts/analytics_report.py --check-config");
  const report = workflow.indexOf("python3 scripts/analytics_report.py\n");
  assert.ok(preflight >= 0, "El workflow debe validar la configuración antes del envío");
  assert.ok(report > preflight, "El envío debe ocurrir después de la validación");
});
