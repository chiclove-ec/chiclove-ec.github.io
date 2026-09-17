/* Chic&Love — analítica opcional y respetuosa con el consentimiento.
   Completa los identificadores cuando estén creadas las propiedades:
   - GA4: formato G-XXXXXXXXXX
   - Microsoft Clarity: identificador del proyecto
   No se envían nombres, teléfonos, mensajes de WhatsApp ni datos del carrito. */
"use strict";

(function initAnalytics() {
  var config = {
    ga4MeasurementId: "G-9QHN0YJKJW",
    clarityProjectId: ""
  };
  var CONSENT_KEY = "cl_analytics_consent_v1";
  var state = {
    consent: readConsent(),
    toolsStarted: false,
    gaReady: false,
    pending: [],
    pageViewSent: false
  };

  function validGaId(id) {
    return /^G-[A-Z0-9-]+$/i.test(String(id || ""));
  }

  function validClarityId(id) {
    return /^[a-z0-9]+$/i.test(String(id || ""));
  }

  function hasConfiguredTool() {
    return validGaId(config.ga4MeasurementId) || validClarityId(config.clarityProjectId);
  }

  function readConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY) || ""; } catch (e) { return ""; }
  }

  function saveConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* modo privado */ }
  }

  function loadScript(src, attributeName) {
    var script = document.createElement("script");
    script.async = true;
    script.src = src;
    if (attributeName) script.setAttribute("data-cl-analytics", attributeName);
    document.head.appendChild(script);
  }

  function startGoogleAnalytics() {
    if (!validGaId(config.ga4MeasurementId)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500
    });
    window.gtag("js", new Date());
    window.gtag("config", config.ga4MeasurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    loadScript(
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(config.ga4MeasurementId),
      "ga4"
    );
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    state.gaReady = true;
  }

  function startClarity() {
    if (!validClarityId(config.clarityProjectId)) return;
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    loadScript("https://www.clarity.ms/tag/" + encodeURIComponent(config.clarityProjectId), "clarity");
  }

  function cleanParams(params) {
    var clean = {};
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (!/^[a-zA-Z0-9_]+$/.test(key)) return;
      if (key === "items" && Array.isArray(value)) {
        clean.items = value.slice(0, 20).map(function (item) {
          item = item || {};
          var safeItem = {};
          ["item_id", "item_name", "item_category", "item_variant"].forEach(function (itemKey) {
            if (typeof item[itemKey] === "string" && item[itemKey].length <= 120) safeItem[itemKey] = item[itemKey];
          });
          ["price", "quantity"].forEach(function (itemKey) {
            if (typeof item[itemKey] === "number" && Number.isFinite(item[itemKey])) safeItem[itemKey] = item[itemKey];
          });
          return safeItem;
        }).filter(function (item) { return item.item_id || item.item_name; });
        return;
      }
      if (typeof value === "string") {
        if (value.length <= 500) clean[key] = value;
      } else if ((typeof value === "number" && Number.isFinite(value)) || typeof value === "boolean") {
        clean[key] = value;
      }
    });
    return clean;
  }

  function send(name, params) {
    if (state.consent !== "granted") return false;
    var payload = cleanParams(params);
    if (state.gaReady && window.gtag) {
      window.gtag("event", name, payload);
      return true;
    }
    if (validGaId(config.ga4MeasurementId)) {
      state.pending.push({ name: name, params: payload });
      return true;
    }
    return false;
  }

  function flush() {
    if (!state.gaReady || !window.gtag) return;
    state.pending.splice(0).forEach(function (item) { window.gtag("event", item.name, item.params); });
  }

  function pageView() {
    if (state.pageViewSent || state.consent !== "granted") return;
    var sent = send("page_view", {
      page_title: document.title,
      page_path: window.location.pathname,
      page_location: window.location.origin + window.location.pathname
    });
    if (sent) state.pageViewSent = true;
  }

  function linkContext(target) {
    var declared = target.getAttribute("data-analytics-context") || "";
    if (/^[a-z0-9_-]{1,40}$/i.test(declared)) return declared.toLowerCase();
    return target.closest && target.closest("[data-product-id]") ? "product" : "site";
  }

  function trackClicks() {
    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("a, button") : null;
      if (!target) return;
      if (target.matches("[data-whatsapp-link]")) send("whatsapp_click", {
        link_type: "contact",
        link_context: linkContext(target),
        page_path: window.location.pathname
      });
      if (target.matches("[data-instagram-link]")) send("instagram_click", { link_type: "social" });
      var itemId = target.getAttribute("data-analytics-item");
      if (itemId) {
        send("select_item", {
          item_id: itemId,
          item_name: target.getAttribute("data-analytics-item-name") || undefined,
          items: [{
            item_id: itemId,
            item_name: target.getAttribute("data-analytics-item-name") || undefined,
            item_category: target.getAttribute("data-analytics-item-category") || undefined,
            quantity: 1
          }]
        });
      }
      var filterId = target.getAttribute("data-analytics-filter");
      if (filterId) send("filter_select", { filter_id: filterId });
      if (target.id === "burger") send("open_menu", {});
    }, true);

    document.addEventListener("toggle", function (event) {
      if (event.target.matches && event.target.matches("details[open]")) send("faq_open", {});
    }, true);
  }

  function removeBanner() {
    var banner = document.getElementById("cl-consent-banner");
    if (banner) banner.remove();
  }

  function activate() {
    if (state.toolsStarted) return;
    state.toolsStarted = true;
    startGoogleAnalytics();
    startClarity();
    flush();
    pageView();
  }

  function setConsent(value) {
    state.consent = value;
    saveConsent(value);
    removeBanner();
    if (value === "granted") activate();
    else {
      if (window.gtag) window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
      if (window.clarity) window.clarity("consent", false);
    }
  }

  function showBanner() {
    if (!hasConfiguredTool() || document.getElementById("cl-consent-banner")) return;
    var banner = document.createElement("aside");
    banner.id = "cl-consent-banner";
    banner.className = "cl-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Preferencias de privacidad");
    var title = document.createElement("strong");
    title.textContent = "Tu privacidad importa";
    var copy = document.createElement("p");
    copy.textContent = "Medimos visitas y clics de forma opcional para mejorar tu experiencia. No recogemos nombres, teléfonos ni mensajes.";
    var actions = document.createElement("div");
    actions.className = "cl-consent-actions";
    var reject = document.createElement("button");
    reject.type = "button";
    reject.className = "btn btn-ghost";
    reject.textContent = "Rechazar";
    reject.addEventListener("click", function () { setConsent("denied"); });
    var accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn btn-primary";
    accept.textContent = "Aceptar analítica";
    accept.addEventListener("click", function () { setConsent("granted"); });
    actions.append(reject, accept);
    banner.append(title, copy, actions);
    document.body.appendChild(banner);
  }

  window.clAnalytics = {
    track: send,
    openPreferences: showBanner,
    consentState: function () { return state.consent; }
  };

  if (state.consent === "granted") activate();
  else if (state.consent !== "denied") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner);
    else showBanner();
  }
  trackClicks();
  document.querySelectorAll("[data-privacy-settings]").forEach(function (button) {
    button.addEventListener("click", showBanner);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pageView);
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    state.pageViewSent = false;
    pageView();
  });
}());
