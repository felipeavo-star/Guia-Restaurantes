/*
 * Guía definitiva de restaurantes · Santiago
 *
 * Fuente única de datos: restaurants.json (inyectado en el build como window.GUIA_DATA).
 * Render del índice, filtros por comuna y movimiento.
 *
 * No usa Google Maps ni Places en el navegador: cada ficha enlaza a Google Maps
 * y las notas las actualiza el job semanal del servidor.
 *
 * El movimiento es nativo (CSS + IntersectionObserver + Web Animations API).
 * prefers-reduced-motion lo desactiva por completo.
 */
(function () {
  'use strict';

  var COMUNAS = ['Providencia', 'Vitacura', 'Las Condes', 'Santiago Centro'];
  var EASE = 'cubic-bezier(.16,1,.3,1)';

  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { list: [], filter: 'all' };

  /* ================================================================ utils */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rating(v) { return Number(v).toFixed(1).replace('.', ','); }
  function reviews(v) { return Number(v).toLocaleString('es-CL'); }

  /* Orden: mejor puntuación de Google primero; sin dato, al final. */
  function byGoogle(a, b) {
    var ar = a.googleRating == null ? -1 : a.googleRating;
    var br = b.googleRating == null ? -1 : b.googleRating;
    if (br !== ar) return br - ar;
    return (b.googleReviewCount || 0) - (a.googleReviewCount || 0);
  }

  /* ============================================================ movimiento */

  /* Parte el titular en caracteres animables sin romper el <em>
     ni el texto que leen los lectores de pantalla. */
  function splitChars(root) {
    root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
    var chars = [];

    root.querySelectorAll('.line').forEach(function (line) {
      line.setAttribute('aria-hidden', 'true');
      var walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach(function (node) {
        var frag = document.createDocumentFragment();
        node.nodeValue.split('').forEach(function (ch) {
          if (ch === ' ') return frag.appendChild(document.createTextNode(' '));
          var span = document.createElement('span');
          span.className = 'ch';
          span.textContent = ch;
          frag.appendChild(span);
          chars.push(span);
        });
        node.parentNode.replaceChild(frag, node);
      });
    });
    return chars;
  }

  function animarTitular() {
    var title = document.getElementById('coverTitle');
    if (!title || quieto) return;

    splitChars(title).forEach(function (ch, i) {
      ch.animate(
        [{ opacity: 0, transform: 'translateY(0.7em) rotate(2deg)' }, { opacity: 1, transform: 'none' }],
        { duration: 620, delay: i * 16, easing: EASE, fill: 'backwards' }
      );
    });
  }

  var revelador = null;
  function observarReveal(el, delay) {
    if (quieto || !('IntersectionObserver' in window)) return el.classList.add('is-in');

    if (!revelador) {
      revelador = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var d = Number(entry.target.dataset.revealDelay || 0);
          setTimeout(function () { entry.target.classList.add('is-in'); }, d);
          revelador.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    }

    el.dataset.revealDelay = delay || 0;
    revelador.observe(el);
  }

  function barraProgreso() {
    var bar = document.getElementById('progress');
    if (!bar) return;
    function pintar() {
      var alto = document.documentElement.scrollHeight - window.innerHeight;
      var p = alto > 0 ? window.scrollY / alto : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)).toFixed(4) + ')';
    }
    window.addEventListener('scroll', pintar, { passive: true });
    pintar();
  }

  function contadores() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var fin = Number(el.dataset.count);
      if (quieto || !('IntersectionObserver' in window)) { el.textContent = fin; return; }
      el.textContent = '0';

      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var t0 = performance.now();
        (function paso(now) {
          var p = Math.min(1, (now - t0) / 900);
          el.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(paso);
        })(t0);
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* Al filtrar, las filas se deslizan a su nueva posición en vez de saltar. */
  function flip(cambiar) {
    var filas = [].slice.call(document.querySelectorAll('.entry'));
    if (quieto || !document.body.animate) return cambiar();

    var antes = new Map();
    filas.forEach(function (f) {
      if (f.style.display !== 'none') antes.set(f, f.getBoundingClientRect().top);
    });

    cambiar();

    filas.forEach(function (f) {
      if (f.style.display === 'none') return;
      var previo = antes.get(f);
      var ahora = f.getBoundingClientRect().top;
      if (previo == null) {
        f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: EASE });
        return;
      }
      var dy = previo - ahora;
      if (Math.abs(dy) < 1) return;
      f.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }],
        { duration: 480, easing: EASE });
    });
  }

  /* ============================================================== entradas */

  /* Jerarquía del botón sólido: reservar > web > mapa. Solo uno por ficha. */
  function accionPrincipal(r) {
    if (r.reservationType === 'online' && r.reservation) return 'reservation';
    if (r.website) return 'website';
    return 'maps';
  }

  function accionesHtml(r) {
    var key = accionPrincipal(r);
    var out = [];

    function act(kind, href, label, extra) {
      out.push('<a class="act' + (key === kind ? ' act--key' : '') + '" href="' +
        esc(href) + '"' + (extra || '') + '>' + label + '</a>');
    }

    if (r.website) act('website', r.website, 'Web', ' target="_blank" rel="noopener"');

    if (r.reservationType === 'online' && r.reservation) {
      act('reservation', r.reservation, 'Reservar', ' target="_blank" rel="noopener"');
    } else if (r.reservationType === 'walk-in') {
      out.push('<span class="walkin">Por orden de llegada</span>');
    }
    /* reservationType "unknown": no mostramos nada antes que un botón falso. */

    if (r.instagram) act('instagram', r.instagram, 'Instagram', ' target="_blank" rel="noopener"');
    if (r.phone) act('phone', 'tel:' + r.phone, 'Tel.');
    if (r.maps) act('maps', r.maps, 'Mapa', ' target="_blank" rel="noopener"');

    return out.join('');
  }

  function factsHtml(r) {
    var rows = [];
    if (r.address) rows.push(['Dirección', esc(r.address)]);
    if (r.price) rows.push(['Precio', '<span class="money">' + esc(r.price) + '</span>']);
    if (r.idealFor && r.idealFor.length) rows.push(['Ideal para', esc(r.idealFor.join(' · '))]);
    if (!rows.length) return '';
    return '<dl class="facts">' + rows.map(function (row) {
      return '<dt>' + row[0] + '</dt><dd>' + row[1] + '</dd>';
    }).join('') + '</dl>';
  }

  function scoreHtml(r) {
    if (r.googleRating == null) return '<span class="row-none">Sin nota aún</span>';
    return '<span class="star" aria-hidden="true">★</span>' + rating(r.googleRating) +
      '<span class="row-rev">' + reviews(r.googleReviewCount) + ' reseñas</span>';
  }

  /* Etiqueta para lectores de pantalla: el ★ y los números sueltos no se leen bien. */
  function scoreAria(r) {
    if (r.googleRating == null) return 'sin nota de Google todavía';
    return 'nota de Google ' + rating(r.googleRating) + ' con ' +
      reviews(r.googleReviewCount) + ' reseñas';
  }

  function entryHtml(r, i) {
    var id = esc(r.id);
    var fuente = r.updatedAt
      ? 'Fuente: Google · actualizado ' + new Date(r.updatedAt).toLocaleDateString('es-CL')
      : 'Fuente: Google · puntuación y número de reseñas';

    return '<li class="entry" id="card-' + id + '" data-comuna="' + esc(r.comuna) + '">' +
      '<h3 class="entry-h">' +
        '<button type="button" class="row" aria-expanded="false" aria-controls="d-' + id + '">' +
          '<span class="row-n">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="row-main">' +
            '<span class="row-name">' + esc(r.name) + '</span>' +
            '<span class="row-meta">' + esc(r.comuna) + ' · ' + esc(r.category) + '</span>' +
          '</span>' +
          '<span class="row-score">' + scoreHtml(r) + '</span>' +
          '<span class="sr-only">, ' + esc(scoreAria(r)) + '</span>' +
          '<span class="row-plus"></span>' +
        '</button>' +
      '</h3>' +
      '<div class="detail" id="d-' + id + '">' +
        '<div class="detail-clip"><div class="detail-in">' +
          '<p class="blurb">' + esc(r.description) + '</p>' +
          (r.badge ? '<span class="stamp">' + esc(r.badge) + '</span>' : '') +
          factsHtml(r) +
          '<div class="acts">' + accionesHtml(r) + '</div>' +
          '<p class="source">' + esc(fuente) + '</p>' +
        '</div></div>' +
      '</div>' +
    '</li>';
  }

  function renderIndice() {
    var lista = document.getElementById('index');
    lista.innerHTML = state.list.map(entryHtml).join('');

    lista.querySelectorAll('.entry').forEach(function (entry, i) {
      observarReveal(entry, Math.min(i, 6) * 55);
    });

    lista.addEventListener('click', function (e) {
      var btn = e.target.closest('.row');
      if (btn) alternar(btn);
    });
  }

  /* Acordeón: una sola entrada abierta a la vez, como un índice de verdad. */
  function alternar(btn) {
    var entry = btn.closest('.entry');
    var abierta = entry.classList.contains('is-open');

    document.querySelectorAll('.entry.is-open').forEach(function (otra) {
      otra.classList.remove('is-open');
      otra.querySelector('.row').setAttribute('aria-expanded', 'false');
    });

    if (!abierta) {
      entry.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  /* =============================================================== filtros */

  function visibles() {
    if (state.filter === 'all') return state.list;
    return state.list.filter(function (r) { return r.comuna === state.filter; });
  }

  function renderFilters() {
    var presentes = COMUNAS.filter(function (c) {
      return state.list.some(function (r) { return r.comuna === c; });
    });
    var nav = document.getElementById('filters');

    nav.innerHTML = [{ id: 'all', label: 'Todas' }]
      .concat(presentes.map(function (c) { return { id: c, label: c }; }))
      .map(function (f) {
        return '<button type="button" class="filter" data-filter="' + esc(f.id) + '" ' +
          'aria-pressed="' + (state.filter === f.id) + '">' + esc(f.label) + '</button>';
      }).join('');

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (btn) aplicarFiltro(btn.dataset.filter);
    });
  }

  function aplicarFiltro(value) {
    state.filter = value;

    document.querySelectorAll('.filter').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === value));
    });

    flip(function () {
      document.querySelectorAll('.entry').forEach(function (entry) {
        var on = value === 'all' || entry.dataset.comuna === value;
        entry.style.display = on ? '' : 'none';
        entry.hidden = !on;
        if (!on) {
          /* Una entrada oculta no debe quedar abierta al reaparecer. */
          entry.classList.remove('is-open');
          entry.querySelector('.row').setAttribute('aria-expanded', 'false');
        }
      });
    });

    var n = visibles().length;
    document.getElementById('empty').style.display = n ? 'none' : 'block';
    document.getElementById('tally').innerHTML =
      '<b>' + n + '</b> ' + (n === 1 ? 'local' : 'locales') +
      (value === 'all' ? ' en la guía' : ' en ' + esc(value));
  }

  /* ================================================================== boot */

  async function cargarDatos() {
    /* En el build, __RESTAURANTS_JSON__ se reemplaza por el JSON real.
       Si se abre el HTML sin build, caemos al archivo suelto. */
    if (Array.isArray(window.GUIA_DATA)) return window.GUIA_DATA;
    var res = await fetch('restaurants.json');
    return res.json();
  }

  async function start() {
    animarTitular();
    barraProgreso();
    contadores();
    document.querySelectorAll('[data-reveal]').forEach(function (el) { observarReveal(el, 0); });

    try {
      state.list = (await cargarDatos()).slice().sort(byGoogle);
    } catch (error) {
      console.error('No se pudieron cargar los restaurantes:', error);
      return;
    }

    renderIndice();
    renderFilters();
    aplicarFiltro('all');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
