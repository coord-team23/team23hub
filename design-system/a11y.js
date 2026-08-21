/* ============================================================================
   TEAM23 — Capa de accesibilidad (additive)
   ----------------------------------------------------------------------------
   Igual que interaction.css: se apoya encima de lo que ya hay y no reescribe
   nada. Nada de esto cambia el diseño ni la lógica de negocio.

   Va DESPUÉS del <script> inline de la página, porque envuelve funciones que
   ese script define (applyViewUI, dirRender).

   La estrategia es deliberada: en vez de tocar los ~20 template strings que
   generan los clickeables, se observa el DOM. Los render de esta app
   reconstruyen el markup entero (`renderDetail()` reemplaza el innerHTML del
   modal), así que cualquier atributo escrito a mano se perdería en el próximo
   render. Un MutationObserver los vuelve a poner solos.

   Para desactivarlo: se borra el <script>. No hay dependencias en la otra
   dirección.
   ============================================================================ */
(function () {
  "use strict";

  /* =========================================================================
     1 · TECLADO en los clickeables que no son <button>
     -------------------------------------------------------------------------
     19 de 21 elementos con onclick eran div/span/td/th: sin tabindex, sin role
     y sin handler de teclado. Entre ellos las cards de proyecto (la navegación
     principal), los toggles día-por-persona del tracker y el orden de columnas.
     ========================================================================= */

  var CLICKABLE = "div[onclick],span[onclick],p[onclick],li[onclick],td[onclick],th[onclick]";

  function preparar(el) {
    /* Si ya trae su propio onkeydown, no lo toco: activaría dos veces. */
    if (el.hasAttribute("onkeydown")) return;
    if (el.dataset.t23kb) return;
    el.dataset.t23kb = "1";

    if (!el.hasAttribute("tabindex")) el.tabIndex = 0;

    if (el.tagName === "TH") {
      /* Un <th> se queda columnheader: ponerle role="button" le saca el rol de
         cabecera y rompe la navegación por tabla. aria-sort ya anuncia que es
         ordenable, y el Enter/Space lo maneja el listener de abajo. */
      if (!el.hasAttribute("aria-sort")) el.setAttribute("aria-sort", "none");
      return;
    }

    if (!el.hasAttribute("role")) el.setAttribute("role", "button");

    /* Las celdas del tracker son un toggle, no un botón de una sola acción. */
    if (el.classList.contains("trk-cell")) {
      el.setAttribute("aria-pressed", String(el.classList.contains("on")));
    }
  }

  /* Nombre accesible para los botones que sólo tienen un glifo. Antes se
     anunciaban como "✕" o "▾", o directamente vacíos (.fase-sw y .cp-sw son
     botones sin contenido cuyo único significado es el color de fondo). */
  var GLIFOS = {
    "✕": "Quitar", "✎": "Editar", "▾": "Desplegar u ocultar",
    "‹": "Anterior", "›": "Siguiente", "+": "Agregar", "–": "Quitar", "✓": "Marcado"
  };

  function etiquetar(b) {
    if (b.dataset.t23lbl) return;
    b.dataset.t23lbl = "1";
    if (b.hasAttribute("aria-label")) return;

    var titulo = b.getAttribute("title");
    if (titulo) { b.setAttribute("aria-label", titulo); return; }

    var txt = (b.textContent || "").trim();
    if (txt && GLIFOS[txt]) b.setAttribute("aria-label", GLIFOS[txt]);
  }

  function barrer(raiz) {
    var scope = raiz && raiz.querySelectorAll ? raiz : document;

    if (raiz && raiz.matches && raiz.matches(CLICKABLE)) preparar(raiz);
    scope.querySelectorAll(CLICKABLE).forEach(preparar);

    if (raiz && raiz.matches && raiz.matches("button")) etiquetar(raiz);
    scope.querySelectorAll("button").forEach(etiquetar);

    /* El ▾ de los colapsables: el <button> real lleva tabindex="-1" y el
       onclick vive en el .glabel padre, que no era enfocable. Resultado: las
       secciones "Tareas TEAM 23" y "Calendario" no se podían abrir con teclado.
       Ahora el .glabel es el control (ya tiene role/tabindex por preparar()) y
       el botón interno queda como decoración. */
    document.querySelectorAll(".glabel .dd-toggle").forEach(function (b) {
      b.setAttribute("aria-hidden", "true");
      b.tabIndex = -1;
      var g = b.closest(".glabel");
      if (g && g.hasAttribute("role")) {
        g.setAttribute("aria-expanded", String(!b.classList.contains("closed")));
      }
    });

    /* 8 de los 17 diálogos declaraban aria-modal sin nombre accesible.
       Se re-verifica que la referencia siga resolviendo en vez de saltar los que
       ya tienen el atributo: el contenido de ovDetail lo reescribe renderDetail()
       entero, así que un id apuntado una vez desaparece en el próximo render y
       el diálogo se queda sin nombre igual que antes. */
    document.querySelectorAll('[role="dialog"]').forEach(function (d) {
      if (d.hasAttribute("aria-label")) return;
      var ref = d.getAttribute("aria-labelledby");
      if (ref && document.getElementById(ref)) return;
      var h = d.querySelector("h2") || d.querySelector("h3") || d.querySelector(".kicker");
      if (!h) return;
      var ov = d.closest(".overlay");
      if (!h.id) h.id = "t23-dlg-ttl-" + (ov && ov.id ? ov.id : Math.random().toString(36).slice(2, 8));
      d.setAttribute("aria-labelledby", h.id);
    });

    /* Los ojitos son decoración: no tienen que aparecer en el árbol. */
    document.querySelectorAll(".eyes, .t23-eyes").forEach(function (e) {
      e.setAttribute("aria-hidden", "true");
    });

    /* #acPanel se crea recién al tipear: se engancha cuando aparece. */
    cablearAc();
  }

  /* Enter y Space activan; Space además no tiene que scrollear la página. */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    var el = e.target;
    if (!el || el.dataset == null || el.dataset.t23kb !== "1") return;
    if (el.isContentEditable) return;
    e.preventDefault();
    el.click();
  });

  /* aria-pressed de las celdas del tracker, para los casos en que el handler
     muta la celda en lugar de re-renderizar la tabla. */
  document.addEventListener("click", function (e) {
    var c = e.target.closest ? e.target.closest("td.trk-cell") : null;
    if (!c) return;
    setTimeout(function () {
      if (c.isConnected) c.setAttribute("aria-pressed", String(c.classList.contains("on")));
    }, 0);
  });

  /* =========================================================================
     2 · FOCO en los modales
     -------------------------------------------------------------------------
     17 diálogos declaraban aria-modal="true" — que le dice al lector de
     pantalla que el resto de la página no está disponible — mientras el fondo
     seguía entero en el tab order, sin mover el foco al abrir, sin trap y sin
     devolverlo al cerrar.

     El trap se hace con `inert` en los hermanos, no con un handler de Tab:
     inert saca la rama entera del tab order Y del árbol de accesibilidad, así
     que el Tab cicla dentro del overlay sin código que lo persiga.

     Se observa la clase .open en vez de envolver openModal(), porque hay ~10
     lugares que hacen classList.add("open") directo sin pasar por ahí.
     ========================================================================= */

  var pila = [];
  var previo = null;

  function inertar() {
    var top = pila.length ? pila[pila.length - 1] : null;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.id === "toast") { el.inert = false; return; }   /* el feedback tiene que llegar */
      el.inert = top ? el !== top : false;
    });
  }

  function contenedor(el) {
    return el.querySelector(".modal") || el.querySelector(".t23-card") || el;
  }

  function enfocar(el) {
    var c = contenedor(el);
    if (!c) return;
    /* Se enfoca el contenedor y no el primer control: así el lector lee el
       título del diálogo, y no le pisa el foco a los inputs que varios
       handlers enfocan por su cuenta un tick después. */
    if (!c.hasAttribute("tabindex")) c.tabIndex = -1;
    try { c.focus({ preventScroll: true }); } catch (err) { c.focus(); }
  }

  function abrir(el) {
    if (pila.indexOf(el) >= 0) return;
    if (!pila.length) previo = document.activeElement;
    pila.push(el);
    inertar();
    enfocar(el);
  }

  function cerrar(el) {
    var i = pila.indexOf(el);
    if (i < 0) return;
    pila.splice(i, 1);
    inertar();
    if (pila.length) { enfocar(pila[pila.length - 1]); return; }
    if (previo && previo.isConnected && !previo.inert) {
      try { previo.focus({ preventScroll: true }); } catch (err) { /* nada */ }
    }
    previo = null;
  }

  document.querySelectorAll(".overlay").forEach(function (ov) {
    ov._t23abierto = ov.classList.contains("open");
    new MutationObserver(function () {
      var ahora = ov.classList.contains("open");
      if (ahora === ov._t23abierto) return;
      ov._t23abierto = ahora;
      if (ahora) abrir(ov); else cerrar(ov);
    }).observe(ov, { attributes: true, attributeFilter: ["class"] });
  });

  /* =========================================================================
     3 · MutationObserver: los render reconstruyen el markup
     ========================================================================= */

  var pendientes = null, agendado = false;

  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];

      /* .t23-ov (confirm y loader) se crean con appendChild y se sacan con
         remove(): no son .overlay, así que el observer de clase no los ve. */
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.classList && n.classList.contains("t23-ov")) abrir(n);
        if (!pendientes) pendientes = [];
        pendientes.push(n);
      });
      Array.prototype.forEach.call(m.removedNodes, function (n) {
        if (n.nodeType === 1 && n.classList && n.classList.contains("t23-ov")) cerrar(n);
      });
    }

    /* Un solo barrido por tanda: dirRender() inserta cientos de <td> de una,
       y todas caen en la misma task, así que un setTimeout(0) las agrupa igual.
       Va con timer y no con requestAnimationFrame a propósito: rAF no corre en
       una pestaña de fondo, así que un render hecho ahí se quedaba sin barrer y
       los controles aparecían sin teclado al volver. */
    if (pendientes && !agendado) {
      agendado = true;
      setTimeout(function () {
        var lote = pendientes;
        pendientes = null;
        agendado = false;
        for (var j = 0; j < lote.length; j++) {
          if (lote[j].isConnected) barrer(lote[j]);
        }
      }, 0);
    }
  }).observe(document.body, { childList: true, subtree: true });

  /* =========================================================================
     4 · Escape para .t23-ov
     -------------------------------------------------------------------------
     El handler de Escape que ya existe consulta `.overlay.open`, y los diálogos
     construidos en JS no son .overlay: quedaban fuera del cierre por teclado.
     En capture, para llegar antes y respetar la regla de "cerrar sólo el de
     arriba". El loader no tiene botones: ése no se cancela.
     ========================================================================= */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var top = pila.length ? pila[pila.length - 1] : null;
    if (!top || !top.classList.contains("t23-ov")) return;
    var no = top.querySelector('[data-a="no"]');
    if (!no) return;
    e.stopPropagation();
    no.click();
  }, true);

  /* =========================================================================
     5 · ARIA que faltaba
     ========================================================================= */

  var tabbar = document.getElementById("tabbar");
  if (tabbar) tabbar.setAttribute("aria-label", "Vistas del hub");

  /* El <h1> se reescribe al cambiar de vista pero no era live region: quien usa
     lector de pantalla no se enteraba de que la vista cambió. */
  var hero = document.getElementById("heroTitle");
  if (hero) {
    hero.setAttribute("aria-live", "polite");
    hero.setAttribute("aria-atomic", "true");
  }

  /* El estado de la tab activa era sólo una clase CSS. */
  if (typeof window.applyViewUI === "function") {
    var _applyViewUI = window.applyViewUI;
    window.applyViewUI = function (name) {
      _applyViewUI.apply(this, arguments);
      document.querySelectorAll(".tabbar button").forEach(function (b) {
        if (b.dataset.view === name) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
    };
  }

  /* Dirección real del orden: preparar() deja aria-sort="none" y acá se corrige. */
  if (typeof window.dirRender === "function") {
    var _dirRender = window.dirRender;
    window.dirRender = function () {
      _dirRender.apply(this, arguments);
      var col = -1, asc = true;
      try { col = dirSortCol; asc = dirSortAsc; } catch (err) { /* no existe en esta página */ }
      document.querySelectorAll(".dir-table th").forEach(function (th, i) {
        th.setAttribute("aria-sort", i === col ? (asc ? "ascending" : "descending") : "none");
      });
    };
  }

  /* -------- autocomplete: combobox ----------------------------------------
     Tenía navegación con flechas y Enter, pero cero ARIA: el lector de pantalla
     nunca se enteraba de que se abrió una lista ni de cuál item está activo.

     #acPanel no existe al cargar: acPanel() lo crea con appendChild la primera
     vez que se tipea. Así que se engancha cuando aparece, no en el init. */
  function cablearAc() {
    var acPanel = document.getElementById("acPanel");
    if (!acPanel || acPanel.dataset.t23ac) return;
    acPanel.dataset.t23ac = "1";
    acPanel.setAttribute("role", "listbox");
    var sincronizarAc = function () {
      var abierto = acPanel.style.display === "block";
      Array.prototype.forEach.call(acPanel.children, function (it, i) {
        it.setAttribute("role", "option");
        if (!it.id) it.id = "t23-ac-opt-" + i;
        it.setAttribute("aria-selected", it.classList.contains("on") ? "true" : "false");
      });
      var input = document.activeElement;
      if (!input || input.tagName !== "INPUT") return;
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-controls", "acPanel");
      input.setAttribute("aria-expanded", String(abierto));
      var activo = acPanel.querySelector(".ac-item.on");
      if (abierto && activo) {
        input.setAttribute("aria-activedescendant", activo.id);
        /* el panel tiene max-height: el highlight se iba de vista */
        activo.scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    };
    new MutationObserver(sincronizarAc).observe(acPanel, {
      attributes: true, childList: true, subtree: true,
      attributeFilter: ["style", "class"]
    });
  }

  /* -------- primer barrido ------------------------------------------------ */
  barrer(document);
})();
