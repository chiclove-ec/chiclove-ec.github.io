/* Chic&Love Ecuador — comportamiento global:
   header, menú móvil, reveals, render de tarjetas, carrito (localStorage)
   y checkout vía WhatsApp. Sin dependencias externas. */
"use strict";

/* ---------- utilidades ---------- */
function makeEl(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function makeSvg(pathData) {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  var path = document.createElementNS(ns, "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
  return svg;
}

function trapDialogFocus(container, event) {
  if (event.key !== "Tab" || !container || !container.classList.contains("open")) return;
  var focusable = Array.from(container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function (el) {
    return !el.hidden && !el.inert;
  });
  if (!focusable.length) return;
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function starsFor(rating) {
  var full = Math.round(rating);
  var out = "";
  for (var i = 0; i < 5; i++) out += i < full ? "★" : "☆";
  return out;
}

var toastTimer = null;
function toast(msg) {
  var el = document.getElementById("cl-toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
}

/* ---------- imágenes diferidas ---------- */
var lazyImageObserver = null;
function revealLazyImage(image) {
  var source = image.getAttribute("data-lazy-src");
  if (!source) return;
  image.addEventListener("load", function () { image.classList.add("loaded"); }, { once: true });
  var sourceSet = image.getAttribute("data-lazy-srcset");
  var sizes = image.getAttribute("data-lazy-sizes");
  if (sourceSet) image.srcset = sourceSet;
  if (sizes) image.sizes = sizes;
  image.src = source;
  image.removeAttribute("data-lazy-src");
  image.removeAttribute("data-lazy-srcset");
  image.removeAttribute("data-lazy-sizes");
  if (image.complete) image.classList.add("loaded");
}

function observeLazyImages(scope) {
  var images = (scope || document).querySelectorAll("img[data-lazy-src]");
  if (!("IntersectionObserver" in window)) {
    images.forEach(revealLazyImage);
    return;
  }
  if (!lazyImageObserver) {
    lazyImageObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealLazyImage(entry.target);
        lazyImageObserver.unobserve(entry.target);
      });
    }, { rootMargin: "320px 0px" });
  }
  images.forEach(function (image) { lazyImageObserver.observe(image); });
}

/* ---------- carrito ---------- */
var CART_KEY = "cl_cart_v1";
var MAX_CART_STORAGE_LENGTH = 8192;
var MAX_CART_LINES = CL_PRODUCTS.length * 3;

function cartLoad() {
  try {
    var stored = localStorage.getItem(CART_KEY) || "[]";
    if (stored.length > MAX_CART_STORAGE_LENGTH) {
      localStorage.removeItem(CART_KEY);
      return [];
    }
    var raw = JSON.parse(stored);
    if (!Array.isArray(raw)) {
      cartSave([]);
      return [];
    }
    // Revalida, elimina campos inesperados y consolida duplicados manipulados.
    var normalized = [];
    raw.forEach(function (it) {
      if (!it || !clFindProduct(it.id) ||
          (it.variant !== "uno" && it.variant !== "pack" && it.variant !== "pack3") ||
          !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 99) return;
      var found = normalized.find(function (known) {
        return known.id === it.id && known.variant === it.variant;
      });
      if (found) found.qty = Math.min(found.qty + it.qty, 99);
      else if (normalized.length < MAX_CART_LINES) {
        normalized.push({ id: it.id, variant: it.variant, qty: it.qty });
      }
    });
    if (JSON.stringify(normalized) !== stored) cartSave(normalized);
    return normalized;
  } catch (e) {
    try { localStorage.removeItem(CART_KEY); } catch (storageError) { /* sin acceso */ }
    return [];
  }
}

function cartSave(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* modo privado */ }
}

function itemPrice(it) {
  var p = clFindProduct(it.id);
  if (it.variant === "pack3") return p.pricePack3;
  return it.variant === "pack" ? p.pricePack : clSinglePrice(p);
}

function itemTotal(it) {
  var p = clFindProduct(it.id);
  if (it.variant === "uno") return clBestSingleBundle(p, it.qty).total;
  return itemPrice(it) * it.qty;
}

function cartTotal(items) {
  return items.reduce(function (sum, it) { return sum + itemTotal(it); }, 0);
}

function cartCount(items) {
  return items.reduce(function (sum, it) { return sum + it.qty; }, 0);
}

function cartAdd(id, variant, qty) {
  var p = clFindProduct(id);
  if (!p) return;
  if (variant !== "pack" && variant !== "pack3") variant = "uno";
  qty = Math.min(Math.max(parseInt(qty, 10) || 1, 1), 99);
  var items = cartLoad();
  var found = items.find(function (it) { return it.id === id && it.variant === variant; });
  if (found) found.qty = Math.min(found.qty + qty, 99);
  else items.push({ id: id, variant: variant, qty: qty });
  cartSave(items);
  renderCart();
  openCart();
}

function cartSetQty(id, variant, qty) {
  var items = cartLoad();
  var it = items.find(function (x) { return x.id === id && x.variant === variant; });
  if (!it) return;
  qty = Number(qty);
  it.qty = Number.isInteger(qty) ? Math.min(qty, 99) : 0;
  cartSave(items.filter(function (x) { return x.qty > 0; }));
  renderCart();
}

function cartRemove(id, variant) {
  cartSave(cartLoad().filter(function (x) { return !(x.id === id && x.variant === variant); }));
  renderCart();
}

function checkoutWhatsApp() {
  var items = cartLoad();
  if (!items.length) { toast("Tu carrito está vacío"); return; }
  var lines = ["¡Hola Chic&Love! Quiero hacer este pedido:", ""];
  items.forEach(function (it) {
    var p = clFindProduct(it.id);
    var v = it.variant === "pack3" ? "Pack x3" : (it.variant === "pack" ? "Pack x2" : "1 frasco");
    var automaticDiscount = it.variant === "uno" && it.qty > 1 ? ", descuento por packs aplicado" : "";
    lines.push("• " + p.name + " (" + v + ") × " + it.qty + automaticDiscount + " — " + clMoney(itemTotal(it)));
  });
  lines.push("", "Total referencial: " + clMoney(cartTotal(items)), "El precio final será confirmado por Chic&Love.", "", "Mi nombre es: ");
  var url = clWhatsAppUrl(lines.join("\n"));
  if (!url) {
    toast("No se pudo abrir WhatsApp. Escríbenos desde el enlace de contacto.");
    return;
  }
  var checkoutWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (checkoutWindow) checkoutWindow.opener = null;
}

/* ---------- drawer del carrito (chrome inyectado) ---------- */
function buildCartChrome() {
  var overlay = document.createElement("div");
  overlay.className = "cart-overlay";
  overlay.id = "cart-overlay";
  overlay.addEventListener("click", closeCart);

  var drawer = document.createElement("aside");
  drawer.className = "cart-drawer";
  drawer.id = "cart-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-label", "Carrito de compras");
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;
  var head = makeEl("div", "cart-head");
  head.appendChild(makeEl("h3", "", "Tu carrito"));
  var close = makeEl("button", "icon-btn", "×");
  close.type = "button";
  close.id = "cart-close";
  close.setAttribute("aria-label", "Cerrar carrito");
  head.appendChild(close);

  var cartItems = makeEl("div", "cart-items");
  cartItems.id = "cart-items";
  var foot = makeEl("div", "cart-foot");
  var total = makeEl("div", "cart-total");
  total.appendChild(makeEl("span", "", "Total"));
  var totalValue = makeEl("span", "", "$0.00");
  totalValue.id = "cart-total";
  total.appendChild(totalValue);
  foot.appendChild(total);
  var shipping = makeEl("div", "cart-shipping");
  var shippingText = makeEl("p", "", "Añade productos para activar el envío gratis");
  shippingText.id = "cart-shipping-text";
  var shippingProgress = document.createElement("progress");
  shippingProgress.id = "cart-shipping-progress";
  shippingProgress.max = CL_FREE_SHIPPING;
  shippingProgress.value = 0;
  shippingProgress.setAttribute("aria-label", "Progreso para obtener envío gratis");
  shipping.append(shippingText, shippingProgress);
  foot.appendChild(shipping);
  foot.appendChild(makeEl("p", "cart-note", "Total referencial. Confirmamos precio y disponibilidad por WhatsApp"));
  var checkout = makeEl("button", "btn btn-wa btn-wide");
  checkout.type = "button";
  checkout.id = "cart-checkout";
  checkout.appendChild(makeSvg("M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a13 13 0 0 1-5.7-5 6.6 6.6 0 0 1-1.3-3.4c0-1.6.9-2.4 1.2-2.7.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.7.5l1 2.3c0 .2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.1.3.7 1.1 1.5 1.9 1 .9 1.9 1.2 2.2 1.4.3.1.5.1.7-.1l.8-1c.2-.3.4-.2.7-.1l2.2 1c.3.2.5.3.6.4 0 .2 0 .7-.2 1.2Z"));
  checkout.appendChild(document.createTextNode("Finalizar pedido por WhatsApp"));
  foot.appendChild(checkout);
  drawer.append(head, cartItems, foot);

  var toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.id = "cl-toast";
  toastEl.setAttribute("role", "status");
  toastEl.setAttribute("aria-live", "polite");

  document.body.append(overlay, drawer, toastEl);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  document.getElementById("cart-checkout").addEventListener("click", checkoutWhatsApp);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      if (drawer.classList.contains("open")) trapDialogFocus(drawer, e);
      else trapDialogFocus(document.getElementById("mobile-menu"), e);
    }
    if (e.key === "Escape") { closeCart(); closeMenu(); }
  });
}

function openCart() {
  var drawer = document.getElementById("cart-drawer");
  document.getElementById("cart-overlay").classList.add("open");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  drawer.inert = false;
  document.body.classList.add("ui-locked");
  var trigger = document.getElementById("cart-open");
  if (trigger) trigger.setAttribute("aria-expanded", "true");
  document.getElementById("cart-close").focus();
}

function closeCart() {
  var drawer = document.getElementById("cart-drawer");
  var shouldRestoreFocus = drawer.contains(document.activeElement);
  document.getElementById("cart-overlay").classList.remove("open");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;
  if (!document.getElementById("mobile-menu").classList.contains("open")) document.body.classList.remove("ui-locked");
  var trigger = document.getElementById("cart-open");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (trigger && shouldRestoreFocus) trigger.focus();
}

function renderCart() {
  var items = cartLoad();
  var box = document.getElementById("cart-items");
  var totalEl = document.getElementById("cart-total");
  var shippingText = document.getElementById("cart-shipping-text");
  var shippingProgress = document.getElementById("cart-shipping-progress");
  var countEl = document.getElementById("cart-count");
  if (countEl) {
    var n = cartCount(items);
    var visibleCount = n > 99 ? "99+" : String(n);
    countEl.textContent = visibleCount;
    countEl.classList.toggle("on", n > 0);
    var cartTrigger = document.getElementById("cart-open");
    if (cartTrigger) cartTrigger.setAttribute("aria-label", "Abrir carrito, " + visibleCount + (n === 1 ? " producto" : " productos"));
  }
  if (!box) return;
  box.textContent = "";
  if (!items.length) {
    var empty = makeEl("div", "cart-empty");
    empty.appendChild(makeEl("div", "empty-mark", "0"));
    var emptyText = makeEl("p", "", "Tu carrito está vacío.");
    emptyText.append(document.createElement("br"), document.createTextNode("Tus gomitas favoritas te esperan."));
    empty.appendChild(emptyText);
    box.appendChild(empty);
  } else {
    items.forEach(function (it) {
      var p = clFindProduct(it.id);
      var vLabel;
      if (it.variant === "pack3") vLabel = "Pack x3 frascos";
      else if (it.variant === "pack") vLabel = "Pack x2 frascos";
      else if (it.qty === 2) vLabel = "2 frascos, pack x2 aplicado";
      else if (it.qty === 3) vLabel = "3 frascos, pack x3 aplicado";
      else if (it.qty > 3) vLabel = it.qty + " frascos, descuento por packs aplicado";
      else vLabel = "1 frasco con 60 gummies";
      var row = makeEl("div", "cart-item");
      var image = makeEl("img");
      image.src = p.bottle;
      image.alt = p.name;
      image.decoding = "async";
      var details = makeEl("div");
      details.appendChild(makeEl("h4", "", p.name));
      details.appendChild(makeEl("div", "variant", vLabel));
      details.appendChild(makeEl("div", "price", clMoney(itemTotal(it))));
      var qtyControl = makeEl("span", "qty");
      var minus = makeEl("button", "", "−");
      minus.type = "button";
      minus.setAttribute("aria-label", "Quitar uno");
      var quantity = makeEl("span", "q", it.qty);
      var plus = makeEl("button", "", "+");
      plus.type = "button";
      plus.setAttribute("aria-label", "Añadir uno");
      qtyControl.append(minus, quantity, plus);
      details.appendChild(qtyControl);
      var remove = makeEl("button", "rm", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", "Eliminar del carrito");
      row.append(image, details, remove);
      minus.addEventListener("click", function () { cartSetQty(it.id, it.variant, it.qty - 1); });
      plus.addEventListener("click", function () { cartSetQty(it.id, it.variant, Math.min(it.qty + 1, 99)); });
      remove.addEventListener("click", function () { cartRemove(it.id, it.variant); });
      box.appendChild(row);
    });
  }
  var addMore = makeEl("a", "btn btn-ghost btn-wide cart-add-more");
  addMore.href = "tienda.html";
  var addMoreIcon = makeEl("span", "cart-add-more-icon", "+");
  addMoreIcon.setAttribute("aria-hidden", "true");
  addMore.append(addMoreIcon, document.createTextNode("Añadir más productos"));
  addMore.addEventListener("click", function (event) {
    if (!document.body.classList.contains("page-store")) return;
    event.preventDefault();
    closeCart();
    var productGrid = document.querySelector("[data-products-grid]");
    if (productGrid) productGrid.scrollIntoView({ block: "start" });
  });
  box.appendChild(addMore);
  var total = cartTotal(items);
  if (totalEl) totalEl.textContent = clMoney(total);
  if (shippingProgress) shippingProgress.value = Math.min(total, CL_FREE_SHIPPING);
  if (shippingText) {
    if (total >= CL_FREE_SHIPPING) shippingText.textContent = "Tu pedido incluye envío gratis";
    else if (total > 0) shippingText.textContent = "Te faltan " + clMoney(CL_FREE_SHIPPING - total) + " para el envío gratis";
    else shippingText.textContent = "Envío gratis en pedidos desde " + clMoney(CL_FREE_SHIPPING);
  }
}

/* ---------- tarjetas de producto ---------- */
function productCard(p, revealDelay) {
  var card = makeEl("article", "pcard reveal" + (revealDelay ? " reveal-d" + revealDelay : ""));
  card.style.setProperty("--a", p.accent);
  card.style.setProperty("--a-dark", p.accentDark);
  card.style.setProperty("--soft", p.soft);
  var productUrl = "producto.html?id=" + encodeURIComponent(p.id);
  card.appendChild(makeEl("span", "pcard-tag", p.goalLabel));
  var imageLink = makeEl("a", "pcard-img");
  imageLink.href = productUrl;
  imageLink.setAttribute("aria-label", "Ver " + p.name);
  var image = makeEl("img");
  image.className = "lazy-media";
  image.setAttribute("data-lazy-src", p.splash);
  image.setAttribute("data-lazy-srcset", p.splashSmall + " 640w, " + p.splash + " " + p.splashWidth + "w");
  image.setAttribute("data-lazy-sizes", "(max-width: 720px) 80vw, 280px");
  image.width = p.splashWidth;
  image.height = 1600;
  image.alt = p.name;
  image.loading = "lazy";
  image.decoding = "async";
  imageLink.appendChild(image);
  card.appendChild(imageLink);

  var body = makeEl("div", "pcard-body");
  var rating = makeEl("div", "pcard-rating");
  var ratingStars = makeEl("span", "stars", starsFor(p.rating));
  ratingStars.setAttribute("role", "img");
  ratingStars.setAttribute("aria-label", Math.round(p.rating) + " de 5 estrellas");
  rating.append(ratingStars, document.createTextNode(" " + p.rating.toFixed(1) + " con " + p.reviews + " reseñas"));
  body.appendChild(rating);
  var heading = makeEl(document.body.classList.contains("page-store") ? "h2" : "h3");
  var nameLink = makeEl("a", "", p.name);
  nameLink.href = productUrl;
  heading.appendChild(nameLink);
  body.appendChild(heading);
  body.appendChild(makeEl("p", "ptagline", p.tagline));
  var cardFoot = makeEl("div", "pcard-foot");
  var singlePrice = clSinglePrice(p);
  var promoActive = clIsJulyPromoActive();
  var price = makeEl("div", "pcard-price");
  var priceHead = makeEl("div", "pcard-price-head");
  priceHead.appendChild(makeEl("strong", "pcard-now-price", clMoney(singlePrice)));
  if (promoActive) {
    priceHead.appendChild(makeEl("del", "pcard-was-price", clMoney(p.price)));
    priceHead.appendChild(makeEl("span", "pcard-promo", "Promo julio"));
  }
  price.appendChild(priceHead);
  var packPrices = makeEl("div", "pcard-pack-prices");
  packPrices.appendChild(makeEl("small", "", "Pack x2 " + clMoney(p.pricePack)));
  packPrices.appendChild(makeEl("small", "", "Pack x3 " + clMoney(p.pricePack3)));
  price.appendChild(packPrices);
  price.appendChild(makeEl("span", "pcard-saving", "Ahorra hasta " + clMoney(p.price * 3 - p.pricePack3)));
  var add = makeEl("button", "add-btn", "Añadir");
  add.type = "button";
  add.setAttribute("aria-label", "Añadir " + p.name + " al carrito");
  add.addEventListener("click", function () { cartAdd(p.id, "uno", 1); });
  cardFoot.append(price, add);
  body.appendChild(cardFoot);
  card.appendChild(body);
  return card;
}

function renderGrids() {
  document.querySelectorAll("[data-products-grid]").forEach(function (grid) {
    var filter = grid.getAttribute("data-filter") || "todos";
    var limit = parseInt(grid.getAttribute("data-limit"), 10) || CL_PRODUCTS.length;
    var exclude = grid.getAttribute("data-exclude") || "";
    var list = CL_PRODUCTS.filter(function (p) {
      if (p.id === exclude) return false;
      return filter === "todos" || p.goal === filter;
    }).slice(0, limit);
    grid.textContent = "";
    grid.classList.toggle("is-seven", list.length === 7);
    list.forEach(function (p, i) { grid.appendChild(productCard(p, (i % 4) ? (i % 4) : 0)); });
    var filterStatus = document.getElementById("filter-status");
    if (filterStatus && grid.hasAttribute("data-filter")) {
      filterStatus.textContent = list.length + (list.length === 1 ? " producto mostrado" : " productos mostrados");
    }
    observeReveals(grid);
    observeLazyImages(grid);
  });
}

/* chips de filtro (tienda) */
function initChips() {
  var bar = document.querySelector("[data-chips]");
  var grid = document.querySelector("[data-products-grid]");
  if (!bar || !grid) return;
  CL_GOALS.forEach(function (g, i) {
    var b = document.createElement("button");
    b.className = "chip" + (i === 0 ? " on" : "");
    b.textContent = g.label;
    b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    b.addEventListener("click", function () {
      bar.querySelectorAll(".chip").forEach(function (c) {
        c.classList.remove("on");
        c.setAttribute("aria-pressed", "false");
      });
      b.classList.add("on");
      b.setAttribute("aria-pressed", "true");
      grid.setAttribute("data-filter", g.id);
      renderGrids();
    });
    bar.appendChild(b);
  });
}

/* ---------- reveals ---------- */
var revealObserver = null;
function observeReveals(scope) {
  if (!("IntersectionObserver" in window)) {
    (scope || document).querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          revealObserver.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  (scope || document).querySelectorAll(".reveal:not(.in)").forEach(function (el) { revealObserver.observe(el); });
}

/* ---------- menú móvil ---------- */
function openMenu() {
  var m = document.getElementById("mobile-menu");
  if (m) {
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    m.inert = false;
    document.body.classList.add("ui-locked");
    var trigger = document.getElementById("burger");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    document.getElementById("menu-close").focus();
  }
}
function closeMenu() {
  var m = document.getElementById("mobile-menu");
  if (m) {
    var shouldRestoreFocus = m.contains(document.activeElement);
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    m.inert = true;
    if (!document.getElementById("cart-drawer").classList.contains("open")) document.body.classList.remove("ui-locked");
    var trigger = document.getElementById("burger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (trigger && shouldRestoreFocus) trigger.focus();
  }
}

/* ---------- datos comerciales desde una sola fuente ---------- */
function initBusinessData() {
  var singleMinimum = clCurrentSingleMinimum();
  var pack2Minimum = clCatalogMinimum("pricePack");
  var pack3Minimum = clCatalogMinimum("pricePack3");
  var whatsappDisplay = clWhatsAppDisplay();
  var instagramHandle = "@" + CL_INSTAGRAM;

  document.querySelectorAll("[data-single-start]").forEach(function (el) {
    el.textContent = "Desde " + clMoney(singleMinimum);
  });
  document.querySelectorAll("[data-free-shipping-banner]").forEach(function (el) {
    el.textContent = "Envío gratis desde " + clMoney(CL_FREE_SHIPPING) + " en todo Ecuador.";
  });
  document.querySelectorAll("[data-free-shipping-short]").forEach(function (el) {
    el.textContent = "A todo Ecuador. Gratis desde " + clMoney(CL_FREE_SHIPPING) + ".";
  });
  document.querySelectorAll("[data-free-shipping-faq]").forEach(function (el) {
    el.textContent = "Sí, enviamos a todo el país. La entrega suele tardar entre 24 y 48 horas hábiles. Los pedidos desde " + clMoney(CL_FREE_SHIPPING) + " tienen envío gratis.";
  });
  document.querySelectorAll("[data-catalog-offer]").forEach(function (el) {
    el.textContent = clIsJulyPromoActive()
      ? "Promo julio: 1 frasco por " + clMoney(singleMinimum) + "."
      : "Packs x2 por " + clMoney(pack2Minimum) + " y x3 por " + clMoney(pack3Minimum) + ".";
  });

  document.querySelectorAll("[data-whatsapp-link]").forEach(function (link) {
    var url = clWhatsAppUrl(link.getAttribute("data-whatsapp-text") || "");
    if (url) link.href = url;
    else link.removeAttribute("href");
    if (link.hasAttribute("data-whatsapp-label")) link.textContent = "WhatsApp: " + whatsappDisplay;
  });
  document.querySelectorAll("[data-whatsapp-number]").forEach(function (el) {
    el.textContent = whatsappDisplay;
  });
  document.querySelectorAll("[data-instagram-link]").forEach(function (link) {
    link.href = clInstagramUrl();
    if (link.hasAttribute("data-instagram-label")) link.textContent = "Instagram: " + instagramHandle;
  });
  document.querySelectorAll("[data-instagram-handle]").forEach(function (el) {
    el.textContent = instagramHandle;
  });
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", function () {
  initBusinessData();
  buildCartChrome();
  renderCart();
  renderGrids();
  initChips();
  observeReveals(document);
  observeLazyImages(document);

  document.querySelectorAll("[data-editorial-product]").forEach(function (link) {
    var product = clFindProduct(link.getAttribute("data-editorial-product"));
    var price = link.querySelector("[data-editorial-price]");
    if (!product || !price) return;
    var currentPrice = clSinglePrice(product);
    price.textContent = "";
    if (clIsJulyPromoActive()) {
      price.appendChild(makeEl("del", "", clMoney(product.price)));
      price.appendChild(makeEl("span", "", clMoney(currentPrice)));
      price.appendChild(makeEl("em", "", "Solo julio"));
      link.setAttribute("aria-label", "Ver " + product.name + " por " + clMoney(currentPrice) + ", precio normal " + clMoney(product.price));
    } else {
      price.textContent = clMoney(product.price);
      link.setAttribute("aria-label", "Ver " + product.name + " por " + clMoney(product.price));
    }
  });

  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var cartBtn = document.getElementById("cart-open");
  if (cartBtn) {
    cartBtn.setAttribute("aria-expanded", "false");
    cartBtn.setAttribute("aria-controls", "cart-drawer");
    cartBtn.addEventListener("click", openCart);
  }

  var burger = document.getElementById("burger");
  if (burger) {
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-controls", "mobile-menu");
    burger.addEventListener("click", openMenu);
  }
  var menuClose = document.getElementById("menu-close");
  if (menuClose) menuClose.addEventListener("click", closeMenu);
  document.querySelectorAll("#mobile-menu nav a").forEach(function (a) {
    a.addEventListener("click", closeMenu);
  });

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
});
