#!/usr/bin/env python3
"""Informe semanal de GA4 para Chic&Love.

Solo usa la biblioteca estándar de Python: consulta la GA4 Data API con una
cuenta de servicio y envía un correo HTML por SMTP. No guarda datos personales
ni escribe informes dentro del repositorio.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import html
import json
import math
import os
import re
import smtplib
import ssl
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from email.utils import parseaddr
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional
from zoneinfo import ZoneInfo


API_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
TOKEN_URL = "https://oauth2.googleapis.com/token"
API_URL = "https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
DEFAULT_TO = "marketing@laboratorioslira.com"
DEFAULT_TIMEZONE = "America/Guayaquil"
MONTHS = ("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")
REQUIRED_ENV = ("GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_JSON", "REPORT_SMTP_USER", "REPORT_SMTP_PASSWORD")


def b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def http_json(url: str, data: Optional[bytes] = None, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    request = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"Respuesta HTTP {error.code} de {url}: {detail[:800]}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"No se pudo conectar con {url}: {error.reason}") from error


def _valid_email(value: str) -> bool:
    name, address = parseaddr(value)
    return not name and address == value and bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value))


def validate_config(environ: Mapping[str, str]) -> Dict[str, Any]:
    """Valida y normaliza la configuración sin llamar a servicios externos."""
    errors: List[str] = []
    missing = [name for name in REQUIRED_ENV if not str(environ.get(name, "")).strip()]
    if missing:
        errors.append("Faltan secretos o variables requeridas: " + ", ".join(missing))

    property_id = str(environ.get("GA4_PROPERTY_ID", "")).strip()
    if property_id and not re.fullmatch(r"\d+", property_id):
        errors.append("GA4_PROPERTY_ID debe ser un ID numérico de propiedad GA4")

    credentials: Optional[Dict[str, Any]] = None
    credentials_raw = str(environ.get("GA4_SERVICE_ACCOUNT_JSON", "")).strip()
    if credentials_raw:
        try:
            parsed = json.loads(credentials_raw)
        except json.JSONDecodeError:
            errors.append("GA4_SERVICE_ACCOUNT_JSON no contiene JSON válido")
        else:
            if not isinstance(parsed, dict):
                errors.append("GA4_SERVICE_ACCOUNT_JSON debe ser un objeto JSON")
            else:
                credentials = parsed
                if not str(parsed.get("client_email", "")).strip():
                    errors.append("GA4_SERVICE_ACCOUNT_JSON no contiene client_email")
                private_key = str(parsed.get("private_key", "")).strip()
                if not private_key:
                    errors.append("GA4_SERVICE_ACCOUNT_JSON no contiene private_key")
                elif not re.search(r"-----BEGIN (?:RSA )?PRIVATE KEY-----", private_key):
                    errors.append("GA4_SERVICE_ACCOUNT_JSON contiene una private_key que no parece PEM")

    username = str(environ.get("REPORT_SMTP_USER", "")).strip()
    if username and not _valid_email(username):
        errors.append("REPORT_SMTP_USER debe ser una dirección de correo válida")

    smtp_password = str(environ.get("REPORT_SMTP_PASSWORD", ""))
    smtp_host = str(environ.get("REPORT_SMTP_HOST", "")).strip() or "smtp.gmail.com"
    smtp_port_raw = str(environ.get("REPORT_SMTP_PORT", "")).strip() or "465"
    try:
        smtp_port = int(smtp_port_raw)
        if not 1 <= smtp_port <= 65535:
            raise ValueError
    except ValueError:
        errors.append("REPORT_SMTP_PORT debe ser un puerto entre 1 y 65535")
        smtp_port = 465

    sender = str(environ.get("REPORT_FROM_EMAIL", "")).strip() or username
    if sender and not _valid_email(sender):
        errors.append("REPORT_FROM_EMAIL debe ser una dirección de correo válida")

    recipient = str(environ.get("REPORT_TO_EMAIL", "")).strip() or DEFAULT_TO
    if recipient != DEFAULT_TO:
        errors.append(f"REPORT_TO_EMAIL debe ser {DEFAULT_TO}")

    timezone_name = str(environ.get("REPORT_TIMEZONE", "")).strip() or DEFAULT_TIMEZONE
    try:
        ZoneInfo(timezone_name)
    except Exception:
        errors.append("REPORT_TIMEZONE no es una zona horaria IANA válida")

    if errors:
        raise RuntimeError("Configuración inválida del informe semanal:\n- " + "\n- ".join(errors))

    return {
        "property_id": property_id,
        "credentials": credentials,
        "smtp_host": smtp_host,
        "smtp_port": smtp_port,
        "smtp_user": username,
        "smtp_password": smtp_password,
        "sender": sender,
        "recipient": recipient,
        "timezone": timezone_name,
    }


def access_token(credentials: Dict[str, Any]) -> str:
    now = int(time.time())
    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = {
        "iss": credentials["client_email"],
        "scope": API_SCOPE,
        "aud": TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    body = b64url(json.dumps(claims, separators=(",", ":")).encode())
    signing_input = f"{header}.{body}".encode("ascii")

    with tempfile.TemporaryDirectory(prefix="cl-ga4-") as folder:
        root = Path(folder)
        key_path = root / "private-key.pem"
        input_path = root / "jwt-input"
        signature_path = root / "jwt-signature"
        key_path.write_text(credentials["private_key"].replace("\\n", "\n"), encoding="utf-8")
        os.chmod(key_path, 0o600)
        input_path.write_bytes(signing_input)
        try:
            subprocess.run(
                ["openssl", "dgst", "-sha256", "-sign", str(key_path), "-out", str(signature_path), str(input_path)],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        except FileNotFoundError as error:
            raise RuntimeError("OpenSSL no está disponible para autenticar GA4") from error
        except subprocess.CalledProcessError as error:
            raise RuntimeError("OpenSSL no pudo firmar la autenticación de GA4") from error
        assertion = f"{signing_input.decode('ascii')}.{b64url(signature_path.read_bytes())}"

    token_response = http_json(
        TOKEN_URL,
        data=urllib.parse.urlencode({
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        }).encode("ascii"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = token_response.get("access_token")
    if not token:
        raise RuntimeError("Google no devolvió un token de acceso para GA4")
    return token


def number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def run_report(token: str, property_id: str, start: dt.date, end: dt.date,
               dimensions: Iterable[str], metrics: Iterable[str], limit: int = 100,
               order_metric: Optional[str] = None) -> List[Dict[str, Any]]:
    dimension_names = list(dimensions)
    metric_names = list(metrics)
    payload: Dict[str, Any] = {
        "dateRanges": [{"startDate": start.isoformat(), "endDate": end.isoformat()}],
        "dimensions": [{"name": name} for name in dimension_names],
        "metrics": [{"name": name} for name in metric_names],
        "limit": str(limit),
        "keepEmptyRows": False,
    }
    if order_metric:
        payload["orderBys"] = [{"metric": {"metricName": order_metric}, "desc": True}]

    response = http_json(
        API_URL.format(property_id=urllib.parse.quote(property_id, safe="")),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    rows: List[Dict[str, Any]] = []
    for row in response.get("rows", []):
        values = [item.get("value", "") for item in row.get("dimensionValues", [])]
        metric_values = [number(item.get("value")) for item in row.get("metricValues", [])]
        rows.append({
            **dict(zip(dimension_names, values)),
            **dict(zip(metric_names, metric_values)),
        })
    return rows


def summary(token: str, property_id: str, start: dt.date, end: dt.date) -> Dict[str, float]:
    metrics = [
        "activeUsers", "totalUsers", "newUsers", "sessions", "engagedSessions",
        "screenPageViews", "eventCount", "userEngagementDuration", "engagementRate", "bounceRate",
    ]
    rows = run_report(token, property_id, start, end, [], metrics, limit=1)
    return {metric: (rows[0].get(metric, 0.0) if rows else 0.0) for metric in metrics}


def date_windows(today: dt.date) -> Dict[str, dt.date]:
    monday = today - dt.timedelta(days=today.weekday())
    current_start = monday - dt.timedelta(days=7)
    current_end = current_start + dt.timedelta(days=6)
    previous_start = current_start - dt.timedelta(days=7)
    previous_end = current_start - dt.timedelta(days=1)
    four_start = current_start - dt.timedelta(days=21)
    return {
        "current_start": current_start,
        "current_end": current_end,
        "previous_start": previous_start,
        "previous_end": previous_end,
        "four_start": four_start,
        "four_end": current_end,
    }


def fetch_data(token: str, property_id: str, windows: Dict[str, dt.date]) -> Dict[str, Any]:
    current_start, current_end = windows["current_start"], windows["current_end"]
    four_start, four_end = windows["four_start"], windows["four_end"]
    event_metrics = ["eventCount", "totalUsers"]
    daily = run_report(token, property_id, four_start, four_end, ["date"], ["sessions", "activeUsers", "screenPageViews"], 40)
    daily.sort(key=lambda row: str(row.get("date", "")))
    return {
        "weekly": summary(token, property_id, current_start, current_end),
        "previous": summary(token, property_id, windows["previous_start"], windows["previous_end"]),
        "four_weeks": summary(token, property_id, four_start, four_end),
        "daily": daily,
        "events_week": run_report(token, property_id, current_start, current_end, ["eventName"], event_metrics, 50, "eventCount"),
        "events_four": run_report(token, property_id, four_start, four_end, ["eventName"], event_metrics, 50, "eventCount"),
        "pages": run_report(token, property_id, four_start, four_end, ["pagePath"], ["screenPageViews", "activeUsers"], 15, "screenPageViews"),
        "channels": run_report(token, property_id, four_start, four_end, ["sessionDefaultChannelGroup"], ["sessions", "activeUsers", "screenPageViews"], 10, "sessions"),
        "devices": run_report(token, property_id, four_start, four_end, ["deviceCategory"], ["activeUsers", "sessions", "screenPageViews"], 10, "activeUsers"),
        "countries": run_report(token, property_id, four_start, four_end, ["country"], ["activeUsers", "sessions"], 10, "activeUsers"),
        "products": run_report(token, property_id, four_start, four_end, ["itemName", "itemId"], ["itemsClickedInList", "itemsViewed", "itemsAddedToCart", "itemsCheckedOut"], 12, "itemsViewed"),
    }


def period_label(start: dt.date, end: dt.date) -> str:
    if start.year == end.year and start.month == end.month:
        return f"{start.day}–{end.day} {MONTHS[end.month - 1]} {end.year}"
    return f"{start.day} {MONTHS[start.month - 1]} – {end.day} {MONTHS[end.month - 1]} {end.year}"


def fmt(value: Any) -> str:
    return f"{number(value):,.0f}".replace(",", ".")


def fmt_duration(seconds: Any) -> str:
    total = max(0, int(number(seconds)))
    minutes, secs = divmod(total, 60)
    return f"{minutes} min {secs:02d} s" if minutes else f"{secs} s"


def fmt_pct(value: Any) -> str:
    return f"{number(value) * 100:.1f}%"


def change(current: Any, previous: Any) -> str:
    current_value, previous_value = number(current), number(previous)
    if previous_value == 0:
        return "Nuevo" if current_value else "—"
    percentage = (current_value - previous_value) / previous_value * 100
    return f"{'↑' if percentage >= 0 else '↓'} {abs(percentage):.1f}%"


def esc(value: Any) -> str:
    return html.escape(str(value if value not in (None, "") else "—"), quote=True)


def metric_card(title: str, value: str, comparison: str, tone: str = "purple") -> str:
    return f'<div class="metric {tone}"><div class="metric-title">{esc(title)}</div><div class="metric-value">{esc(value)}</div><div class="metric-change">{esc(comparison)} vs. semana anterior</div></div>'


def line_chart(rows: List[Dict[str, Any]]) -> str:
    width, height, pad = 720, 220, 30
    values = [number(row.get("screenPageViews")) for row in rows]
    sessions = [number(row.get("sessions")) for row in rows]
    maximum = max([1.0] + values + sessions)

    def points(series: List[float]) -> str:
        if not series:
            return ""
        coordinates = []
        for index, value in enumerate(series):
            x = pad + (width - pad * 2) * (index / max(1, len(series) - 1))
            y = height - pad - (height - pad * 2) * value / maximum
            coordinates.append(f"{x:.1f},{y:.1f}")
        return " ".join(coordinates)

    grid = "".join(f'<line x1="{pad}" x2="{width - pad}" y1="{y}" y2="{y}" />' for y in (60, 110, 160))
    return f'''<div class="chart-wrap"><div class="chart-legend"><span><i class="dot purple"></i>Vistas</span><span><i class="dot green"></i>Sesiones</span></div>
<svg class="line-chart" viewBox="0 0 {width} {height}" role="img" aria-label="Evolución de vistas y sesiones en las últimas cuatro semanas">
<g class="grid">{grid}</g><polyline class="line purple-line" points="{points(values)}" /><polyline class="line green-line" points="{points(sessions)}" /></svg></div>'''


def bar_chart(rows: List[Dict[str, Any]], label_key: str, value_key: str, title: str) -> str:
    top = rows[:8]
    width, row_height, label_width = 720, 31, 195
    maximum = max([1.0] + [number(row.get(value_key)) for row in top])
    bars = []
    for index, row in enumerate(top):
        label = str(row.get(label_key) or "(sin nombre)")
        value = number(row.get(value_key))
        y = index * row_height + 8
        bar_width = max(2, (width - label_width - 80) * value / maximum)
        bars.append(f'<text x="0" y="{y + 15}">{esc(label[:28])}</text><rect x="{label_width}" y="{y}" width="{bar_width:.1f}" height="16" rx="8" /><text class="bar-value" x="{label_width + bar_width + 8:.1f}" y="{y + 13}">{fmt(value)}</text>')
    height = max(64, len(top) * row_height + 12)
    return f'<div class="bar-title">{esc(title)}</div><svg class="bar-chart" viewBox="0 0 {width} {height}" role="img" aria-label="{esc(title)}">{"".join(bars)}</svg>'


def table(headers: List[str], rows: List[List[Any]], empty: str = "Sin datos todavía") -> str:
    if not rows:
        return f'<p class="empty">{esc(empty)}</p>'
    head = "".join(f"<th>{esc(item)}</th>" for item in headers)
    body = "".join("<tr>" + "".join(f"<td>{esc(item)}</td>" for item in row) + "</tr>" for row in rows)
    return f"<div class=\"table-scroll\"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>"


def event_map(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {str(row.get("eventName") or "(sin nombre)"): row for row in rows}


def report_html(data: Dict[str, Any], windows: Dict[str, dt.date], generated_at: dt.datetime) -> str:
    weekly = data.get("weekly", {})
    previous = data.get("previous", {})
    four = data.get("four_weeks", {})
    week_label = period_label(windows["current_start"], windows["current_end"])
    four_label = period_label(windows["four_start"], windows["four_end"])
    events_week, events_four = event_map(data.get("events_week", [])), event_map(data.get("events_four", []))
    tracked_events = ["page_view", "whatsapp_click", "instagram_click", "select_item", "filter_select", "view_item", "view_cart", "add_to_cart", "remove_from_cart", "begin_checkout", "faq_open", "open_menu"]
    event_rows = [[name, fmt(events_week.get(name, {}).get("eventCount")), fmt(events_four.get(name, {}).get("eventCount"))] for name in tracked_events]
    page_rows = [[row.get("pagePath"), fmt(row.get("screenPageViews")), fmt(row.get("activeUsers"))] for row in data.get("pages", [])]
    channel_rows = [[row.get("sessionDefaultChannelGroup"), fmt(row.get("sessions")), fmt(row.get("activeUsers")), fmt(row.get("screenPageViews"))] for row in data.get("channels", [])]
    device_rows = [[row.get("deviceCategory"), fmt(row.get("activeUsers")), fmt(row.get("sessions")), fmt(row.get("screenPageViews"))] for row in data.get("devices", [])]
    country_rows = [[row.get("country"), fmt(row.get("activeUsers")), fmt(row.get("sessions"))] for row in data.get("countries", [])]
    product_rows = [[row.get("itemName"), fmt(row.get("itemsClickedInList")), fmt(row.get("itemsViewed")), fmt(row.get("itemsAddedToCart")), fmt(row.get("itemsCheckedOut"))] for row in data.get("products", []) if row.get("itemName") or row.get("itemId")]

    return f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Informe Chic&amp;Love   {esc(week_label)}</title>
<style>
body{{margin:0;background:#f6f3f0;color:#242229;font-family:Arial,Helvetica,sans-serif;line-height:1.45}}.page{{max-width:920px;margin:auto;background:#fff}}.hero{{padding:42px 48px 38px;background:linear-gradient(135deg,#27222f,#7454aa 58%,#72b87d);color:#fff}}.eyebrow{{font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.8}}h1{{margin:10px 0 8px;font-size:32px;line-height:1.12}}.subtitle{{margin:0;opacity:.88;font-size:14px}}.content{{padding:30px 48px 42px}}h2{{margin:30px 0 14px;font-size:20px}}h3{{margin:0 0 12px;font-size:15px}}.period{{color:#76727c;font-size:12px}}.metrics{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0 24px}}.metric{{padding:16px;border-radius:16px;background:#f7f4fb;border:1px solid #ebe5f4}}.metric.green{{background:#f3f8f2;border-color:#e0eee0}}.metric-title{{font-size:11px;color:#77717f;text-transform:uppercase;letter-spacing:.06em}}.metric-value{{margin:5px 0;font-size:25px;font-weight:700}}.metric-change{{font-size:11px;color:#6c6475}}.section{{border-top:1px solid #ece8e5;padding-top:8px;margin-top:28px}}.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:22px}}.panel{{border:1px solid #ece8e5;border-radius:16px;padding:18px;background:#fff}}.chart-wrap{{padding:6px 0 0}}.chart-legend{{display:flex;gap:18px;font-size:11px;color:#716d76;margin-bottom:6px}}.dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:#8c6fc9}}.dot.green{{background:#35b34a}}.line-chart{{width:100%;height:auto;overflow:visible}}.grid line{{stroke:#eeeaf0;stroke-width:1}}.line{{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}}.purple-line{{stroke:#8c6fc9}}.green-line{{stroke:#35b34a}}.bar-title{{font-size:12px;color:#6e6873;margin-bottom:7px}}.bar-chart{{width:100%;height:auto;overflow:visible}}.bar-chart text{{font-size:11px;fill:#514c58}}.bar-chart rect{{fill:#8c6fc9;opacity:.82}}.bar-chart .bar-value{{font-weight:700;fill:#37313f}}.table-scroll{{overflow-x:auto}}table{{width:100%;border-collapse:collapse;font-size:12px}}th{{padding:9px 8px;text-align:left;color:#756e7d;font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #ddd8d3}}td{{padding:10px 8px;border-bottom:1px solid #eeeae7}}td:not(:first-child),th:not(:first-child){{text-align:right}}.empty{{font-size:13px;color:#817b83;background:#faf8f6;border-radius:10px;padding:14px}}.note{{margin-top:28px;padding:15px 17px;border-radius:12px;background:#f7f4fb;color:#665e70;font-size:12px}}footer{{padding:22px 48px;background:#25212a;color:#c6c0cc;font-size:11px}}a{{color:#8c6fc9}}@media(max-width:700px){{.hero,.content,footer{{padding-left:22px;padding-right:22px}}h1{{font-size:27px}}.metrics{{grid-template-columns:repeat(2,1fr)}}.grid2{{grid-template-columns:1fr}}.metric-value{{font-size:21px}}}}
</style></head><body><div class="page"><header class="hero"><div class="eyebrow">Chic&amp;Love Ecuador   informe de analítica</div><h1>Tu semana en datos</h1><p class="subtitle">{esc(week_label)}   comparación con la semana anterior   ventana general de {esc(four_label)}</p></header><main class="content">
<div class="metrics">{metric_card("Visitantes",fmt(weekly.get("activeUsers")),change(weekly.get("activeUsers"),previous.get("activeUsers")))}{metric_card("Sesiones",fmt(weekly.get("sessions")),change(weekly.get("sessions"),previous.get("sessions")),"green")}{metric_card("Vistas",fmt(weekly.get("screenPageViews")),change(weekly.get("screenPageViews"),previous.get("screenPageViews")))}{metric_card("Eventos",fmt(weekly.get("eventCount")),change(weekly.get("eventCount"),previous.get("eventCount")),"green")}</div>
<p class="period">Semana reportada: {esc(week_label)}   datos agregados de GA4</p>
<section class="section"><h2>Resumen ejecutivo</h2><div class="grid2"><div class="panel"><h3>Calidad de la visita</h3><table><tbody><tr><td>Sesiones con interacción</td><td>{fmt(weekly.get("engagedSessions"))}   {fmt_pct(weekly.get("engagementRate"))}</td></tr><tr><td>Usuarios nuevos</td><td>{fmt(weekly.get("newUsers"))}</td></tr><tr><td>Tiempo de interacción</td><td>{esc(fmt_duration(weekly.get("userEngagementDuration")))}</td></tr><tr><td>Rebote</td><td>{esc(fmt_pct(weekly.get("bounceRate")))}</td></tr></tbody></table></div><div class="panel"><h3>Acciones comerciales</h3>{table(["Evento","Semana","4 semanas"],event_rows)}</div></div></section>
<section class="section"><h2>Tendencia de las últimas 4 semanas</h2>{line_chart(data.get("daily", []))}</section>
<section class="section"><h2>Qué está funcionando</h2><div class="grid2"><div class="panel">{bar_chart(data.get("events_four", []),"eventName","eventCount","Eventos registrados")}</div><div class="panel">{bar_chart(data.get("pages", []),"pagePath","screenPageViews","Páginas más vistas")}</div></div></section>
<section class="section"><h2>Productos y navegación</h2><div class="panel"><h3>Rendimiento por fórmula   últimas 4 semanas</h3>{table(["Producto","Clicados","Vistos","Al carrito","Checkout"],product_rows,"Aún no hay eventos de producto suficientes para esta tabla")}</div><div class="grid2" style="margin-top:22px"><div class="panel"><h3>Canales de entrada</h3>{table(["Canal","Sesiones","Usuarios","Vistas"],channel_rows)}</div><div class="panel"><h3>Dispositivos</h3>{table(["Dispositivo","Usuarios","Sesiones","Vistas"],device_rows)}</div></div></section>
<section class="section"><h2>Audiencia</h2><div class="panel">{table(["País","Usuarios","Sesiones"],country_rows)}</div></section>
<div class="note"><strong>Lectura rápida:</strong> el informe compara la semana cerrada anterior con la precedente y añade una ventana consolidada de cuatro semanas. Solo incluye métricas agregadas de GA4; no contiene nombres, teléfonos, mensajes, IP ni contenido del carrito.</div>
</main><footer>Generado automáticamente el {esc(generated_at.strftime("%d/%m/%Y a las %H:%M"))} ({esc(str(generated_at.tzinfo))}). Chic&amp;Love Ecuador   marketing@laboratorioslira.com</footer></div></body></html>'''


def report_text(data: Dict[str, Any], windows: Dict[str, dt.date]) -> str:
    weekly = data.get("weekly", {})
    return "\n".join([
        "Chic&Love Ecuador — informe semanal de analítica",
        f"Periodo: {period_label(windows['current_start'], windows['current_end'])}",
        "",
        f"Visitantes: {fmt(weekly.get('activeUsers'))}",
        f"Sesiones: {fmt(weekly.get('sessions'))}",
        f"Vistas: {fmt(weekly.get('screenPageViews'))}",
        f"Eventos: {fmt(weekly.get('eventCount'))}",
        "",
        "El informe HTML adjunto contiene tendencias, eventos, páginas, productos, canales, dispositivos y países.",
        "Solo se usan datos agregados de GA4; no se incluyen nombres, teléfonos, mensajes ni contenido del carrito.",
    ])


def send_email(subject: str, html_body: str, text_body: str, config: Dict[str, Any]) -> None:
    host = config["smtp_host"]
    port = config["smtp_port"]
    username = config["smtp_user"]
    password = config["smtp_password"]
    sender = config["sender"]
    recipient = config["recipient"]
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=45) as server:
            server.login(username, password)
            server.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=45) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(username, password)
            server.send_message(message)


def sample_data() -> Dict[str, Any]:
    return {
        "weekly": {"activeUsers": 124, "sessions": 168, "screenPageViews": 403, "eventCount": 912, "engagedSessions": 118, "newUsers": 105, "userEngagementDuration": 7320, "engagementRate": .70, "bounceRate": .30},
        "previous": {"activeUsers": 100, "sessions": 150, "screenPageViews": 360, "eventCount": 800},
        "four_weeks": {},
        "daily": [{"date": "20260901", "sessions": 12, "activeUsers": 9, "screenPageViews": 27}, {"date": "20260902", "sessions": 15, "activeUsers": 11, "screenPageViews": 39}],
        "events_week": [{"eventName": "whatsapp_click", "eventCount": 24}, {"eventName": "view_item", "eventCount": 58}],
        "events_four": [{"eventName": "whatsapp_click", "eventCount": 89}, {"eventName": "view_item", "eventCount": 210}],
        "pages": [{"pagePath": "/index.html", "screenPageViews": 220, "activeUsers": 100}],
        "channels": [{"sessionDefaultChannelGroup": "Direct", "sessions": 70, "activeUsers": 55, "screenPageViews": 160}],
        "devices": [{"deviceCategory": "mobile", "activeUsers": 80, "sessions": 110, "screenPageViews": 250}],
        "countries": [{"country": "Ecuador", "activeUsers": 100, "sessions": 140}],
        "products": [{"itemName": "Hair & Nails Forte", "itemsViewed": 60, "itemsAddedToCart": 10, "itemsCheckedOut": 4}],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Envía el informe semanal de GA4 de Chic&Love")
    parser.add_argument("--fixture", help="JSON local para previsualizar sin llamar a GA4")
    parser.add_argument("--output", help="Guarda el HTML en esta ruta en vez de enviarlo")
    parser.add_argument("--no-send", action="store_true", help="No envía correo; útil para comprobar el diseño")
    parser.add_argument("--check-config", action="store_true", help="Valida secretos y configuración sin llamar a GA4 ni enviar correo")
    args = parser.parse_args()
    preview_only = bool(args.fixture and (args.output or args.no_send))
    try:
        config = None if preview_only and not args.check_config else validate_config(os.environ)
    except RuntimeError as error:
        raise SystemExit(str(error)) from None
    if args.check_config:
        print(f"Configuración válida; el informe se enviará a {config['recipient']}")
        return

    timezone = ZoneInfo(config["timezone"]) if config else ZoneInfo(DEFAULT_TIMEZONE)
    now = dt.datetime.now(timezone)
    windows = date_windows(now.date())

    if args.fixture:
        data = json.loads(Path(args.fixture).read_text(encoding="utf-8"))
    else:
        assert config is not None
        data = fetch_data(access_token(config["credentials"]), config["property_id"], windows)

    html_body = report_html(data, windows, now)
    if args.output:
        Path(args.output).write_text(html_body, encoding="utf-8")
        print(f"Informe generado: {args.output}")
        return
    if args.no_send:
        print("Informe validado sin envío")
        return
    assert config is not None
    subject = f"Chic&Love   Analítica semanal   {period_label(windows['current_start'], windows['current_end'])}"
    send_email(subject, html_body, report_text(data, windows), config)
    print(f"Informe enviado a {config['recipient']}")


if __name__ == "__main__":
    main()
