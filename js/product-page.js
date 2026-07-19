/* Chic&Love — página de producto: renderiza el detalle desde el catálogo.
   El id llega por ?id= y se valida contra CL_PRODUCTS (whitelist);
   nunca se inyecta contenido de la URL en el DOM. */
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  var params = new URLSearchParams(window.location.search);
  var product = clFindProduct(params.get("id") || "");

  // id inválido o ausente → primer producto del catálogo como fallback amable
  if (!product) {
    product = CL_PRODUCTS[0];
    try {
      window.history.replaceState(null, "", "producto.html?id=" + encodeURIComponent(product.id));
    } catch (e) { /* file:// puede restringir replaceState */ }
  }

  var state = { variant: "uno", qty: 1 };

  // Tema de acento por producto
  document.documentElement.style.setProperty("--a", product.accent);
  document.documentElement.style.setProperty("--a-dark", product.accentDark);
  document.documentElement.style.setProperty("--a-soft", product.soft);

  document.title = product.name + " — Chic&Love Ecuador";

  // Textos (todo con textContent: cero riesgo de inyección)
  document.getElementById("pd-crumb").textContent = product.name;
  document.getElementById("pd-goal").textContent = product.goalLabel;
  document.getElementById("pd-name").textContent = product.name;
  document.getElementById("pd-tagline").textContent = product.tagline;
  document.getElementById("pd-desc").textContent = product.desc;
  document.getElementById("pd-flavor").textContent = "🍭 Sabor " + product.flavor.toLowerCase();
  document.getElementById("pd-dose").textContent = "💊 " + product.dose;

  var img = document.getElementById("pd-img");
  img.src = product.splash;
  img.alt = "Frasco de " + product.name;

  var rating = document.getElementById("pd-rating");
  rating.textContent = "";
  var stars = document.createElement("span");
  stars.className = "stars";
  stars.textContent = "★★★★★";
  stars.setAttribute("aria-label", Math.round(product.rating) + " de 5 estrellas");
  rating.append(stars, " " + product.rating.toFixed(1) + " con " + product.reviews + " reseñas verificadas");

  var badges = document.getElementById("pd-badges");
  product.badges.forEach(function (b) {
    var s = document.createElement("span");
    s.textContent = b;
    badges.appendChild(s);
  });

  var benefits = document.getElementById("pd-benefits");
  product.benefits.forEach(function (b) {
    var li = document.createElement("li");
    li.textContent = b;
    benefits.appendChild(li);
  });

  var actives = document.getElementById("pd-actives");
  product.actives.forEach(function (a) {
    var s = document.createElement("span");
    s.textContent = a;
    actives.appendChild(s);
  });

  // Variantes
  var saveAmt = product.price * 2 - product.pricePack;
  var variants = [
    { key: "uno", name: "1 frasco", sub: "60 gummies para 1 mes", price: product.price, save: 0 },
    { key: "pack", name: "Pack x2 frascos", sub: "120 gummies para 2 meses", price: product.pricePack, save: saveAmt }
  ];
  var vBox = document.getElementById("pd-variants");

  function chooseVariant(index, restoreFocus) {
    state.variant = variants[index].key;
    renderVariants();
    updateBuy();
    if (restoreFocus) vBox.querySelectorAll(".variant-opt")[index].focus();
  }

  function renderVariants() {
    vBox.textContent = "";
    variants.forEach(function (v, index) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "variant-opt" + (state.variant === v.key ? " on" : "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", state.variant === v.key ? "true" : "false");
      b.tabIndex = state.variant === v.key ? 0 : -1;

      var left = document.createElement("span");
      var nm = document.createElement("span");
      nm.className = "v-name";
      nm.textContent = v.name;
      if (v.save > 0.009) {
        var sv = document.createElement("span");
        sv.className = "save";
        sv.textContent = "Ahorra " + clMoney(v.save);
        nm.appendChild(sv);
      }
      var sub = document.createElement("span");
      sub.className = "v-sub";
      sub.textContent = v.sub;
      left.append(nm, document.createElement("br"), sub);

      var pr = document.createElement("span");
      pr.className = "v-price";
      pr.textContent = clMoney(v.price);

      b.append(left, pr);
      b.addEventListener("click", function () {
        chooseVariant(index, true);
      });
      b.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % variants.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + variants.length) % variants.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = variants.length - 1;
        else return;
        event.preventDefault();
        chooseVariant(next, true);
      });
      vBox.appendChild(b);
    });
  }

  function currentPrice() {
    return state.variant === "pack" ? product.pricePack : product.price;
  }

  function updateBuy() {
    document.getElementById("pd-qty").textContent = String(state.qty);
    document.getElementById("pd-add-price").textContent = clMoney(currentPrice() * state.qty);
  }

  document.getElementById("pd-qminus").addEventListener("click", function () {
    state.qty = Math.max(1, state.qty - 1);
    updateBuy();
  });
  document.getElementById("pd-qplus").addEventListener("click", function () {
    state.qty = Math.min(99, state.qty + 1);
    updateBuy();
  });
  document.getElementById("pd-add").addEventListener("click", function () {
    cartAdd(product.id, state.variant, state.qty);
  });

  renderVariants();
  updateBuy();

  // Relacionados: excluir el producto actual y re-renderizar
  var related = document.getElementById("related-grid");
  if (related) {
    related.setAttribute("data-exclude", product.id);
    renderGrids();
  }
});
