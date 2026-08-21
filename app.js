/*
 * Guía definitiva de restaurantes · Santiago
 *
 * Fuente única de datos: restaurants.json (inyectado en el build como window.GUIA_DATA).
 * Este archivo hace todo: fichas, filtros, mapa, fotos y movimiento.
 *
 * El movimiento es nativo (CSS + IntersectionObserver + Web Animations API).
 * No hay librerías de animación: prefers-reduced-motion desactiva todo.
 */
(function () {
  'use strict';

  var COMUNAS = ['Providencia', 'Vitacura', 'Las Condes', 'Santiago Centro'];
  var SANTIAGO = { lat: -33.4189, lng: -70.5945 };
  var EASE = 'cubic-bezier(.16,1,.3,1)';

  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { list: [], filter: 'all', map: null, markers: {}, info: null };

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

  /* Parte cada línea del titular en caracteres animables, sin romper el <em>
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
    if (!title) return;
    if (quieto) return;

    var chars = splitChars(title);
    chars.forEach(function (ch, i) {
      ch.animate(
        [
          { opacity: 0, transform: 'translateY(0.7em) rotate(2deg)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 620, delay: i * 16, easing: EASE, fill: 'backwards' }
      );
    });
  }

  /* Revela un elemento cuando entra en pantalla. Una sola vez. */
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
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    }

    el.dataset.revealDelay = delay || 0;
    revelador.observe(el);
  }

  /* Parallax de las fotos: la imagen mide 112% de alto y se desplaza dentro de ese sobrante. */
  var parallaxEls = [];
  var ticking = false;

  function medirParallax() {
    if (quieto) return;
    var vh = window.innerHeight;

    parallaxEls.forEach(function (img) {
      var box = img.parentElement.getBoundingClientRect();
      if (box.bottom < -50 || box.top > vh + 50) return;
      var progreso = (vh - box.top) / (vh + box.height);   // 0 entrando, 1 saliendo
      progreso = Math.min(1, Math.max(0, progreso));
      img.style.setProperty('--par', (-12 * progreso).toFixed(2) + '%');
    });
    ticking = false;
  }

  function alScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(medirParallax); }
  }

  /* Barra de progreso de lectura. */
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

  /* Los números de la portada suben desde cero cuando aparecen. */
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
          var suave = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(fin * suave);
          if (p < 1) requestAnimationFrame(paso);
        })(t0);
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* FLIP: al cambiar de filtro las fichas se deslizan a su nueva posición
     en vez de saltar. Medimos antes, aplicamos, medimos después, animamos la diferencia. */
  function flip(cambiar) {
    var cards = [].slice.call(document.querySelectorAll('.card'));

    if (quieto || !document.body.animate) return cambiar();

    var antes = new Map();
    cards.forEach(function (c) {
      if (c.style.display !== 'none') antes.set(c, c.getBoundingClientRect());
    });

    cambiar();

    cards.forEach(function (c) {
      if (c.style.display === 'none') return;
      var previo = antes.get(c);
      var ahora = c.getBoundingClientRect();
      if (!previo) {
        c.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, easing: EASE });
        return;
      }
      var dx = previo.left - ahora.left;
      var dy = previo.top - ahora.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: 520, easing: EASE });
    });
  }

  /* ================================================================ fichas */

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
    /* reservationType "unknown": no mostramos nada antes que mostrar un botón falso. */

    if (r.instagram) act('instagram', r.instagram, 'Instagram', ' target="_blank" rel="noopener"');
    if (r.phone) act('phone', 'tel:' + r.phone, 'Tel.');
    if (r.maps) act('maps', r.maps, 'Mapa', ' target="_blank" rel="noopener"');

    return out.join('');
  }

  function scoreHtml(r) {
    if (r.googleRating == null) {
      return '<a class="score" href="' + esc(r.maps) + '" target="_blank" rel="noopener">' +
        '<span class="score-src">Google</span>' +
        '<span class="score-pending">Ver en Google Maps →</span></a>';
    }
    var when = r.updatedAt
      ? '<p class="score-when">Actualizado ' + new Date(r.updatedAt).toLocaleDateString('es-CL') + '</p>'
      : '';
    return '<a class="score" href="' + esc(r.maps) + '" target="_blank" rel="noopener" ' +
      'aria-label="Ver ' + esc(r.name) + ' en Google Maps">' +
      '<span class="score-src">Google</span>' +
      '<span class="score-v"><span class="star" aria-hidden="true">★</span>' + rating(r.googleRating) +
      '<span class="score-n">' + reviews(r.googleReviewCount) + ' reseñas</span></span></a>' + when;
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

  function cardHtml(r, i) {
    return '<li class="card" id="card-' + esc(r.id) + '" data-id="' + esc(r.id) + '" ' +
      'data-comuna="' + esc(r.comuna) + '">' +
        '<figure class="shot" data-photo></figure>' +
        '<div class="card-body">' +
          '<div class="folio">' +
            '<span class="n">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<span class="where">' + esc(r.comuna) + '</span>' +
          '</div>' +
          '<h3>' + esc(r.name) + '</h3>' +
          '<p class="kind">' + esc(r.category) + '</p>' +
          '<p class="blurb">' + esc(r.description) + '</p>' +
          (r.badge ? '<span class="stamp">' + esc(r.badge) + '</span>' : '') +
          factsHtml(r) +
          scoreHtml(r) +
          '<div class="acts">' + accionesHtml(r) + '</div>' +
        '</div>' +
      '</li>';
  }

  function renderCards() {
    document.getElementById('grid').innerHTML = state.list.map(cardHtml).join('');
    document.querySelectorAll('.card').forEach(function (card, i) {
      observarReveal(card, Math.min(i, 5) * 70);
    });
  }

  /* =============================================================== filtros */

  function visibles() {
    if (state.filter === 'all') return state.list;
    return state.list.filter(function (r) { return r.comuna === state.filter; });
  }

  /* Ritmo de revista: la primera ficha abre a lo ancho y dos del medio se
     ensanchan para romper la retícula. Se recalcula con cada filtro. */
  function ritmoEditorial() {
    var todas = [].slice.call(document.querySelectorAll('.card'));
    /* Limpiamos también las ocultas: si no, conservan el ritmo del filtro anterior
       y reaparecen con el ancho equivocado. */
    todas.forEach(function (c) { c.classList.remove('card--lead', 'card--wide'); });

    var vivos = todas.filter(function (c) { return c.style.display !== 'none'; });
    vivos.forEach(function (c, i) {
      /* La primera abre a lo ancho; después una cada siete, para que la
         retícula de dos columnas no se vuelva monótona. */
      if (i === 0) c.classList.add('card--lead');
      else if (vivos.length > 6 && (i + 1) % 7 === 0) c.classList.add('card--wide');
    });
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
      document.querySelectorAll('.card').forEach(function (card) {
        var on = value === 'all' || card.dataset.comuna === value;
        card.style.display = on ? '' : 'none';
        card.hidden = !on;
        /* No forzamos .is-in: el observer sigue activo y la revela cuando entra
           en pantalla, así el reveal escalonado se mantiene al filtrar. */
      });
      ritmoEditorial();
    });

    var n = visibles().length;
    document.getElementById('empty').style.display = n ? 'none' : 'block';
    document.getElementById('tally').innerHTML =
      '<b>' + n + '</b> ' + (n === 1 ? 'local' : 'locales') +
      (value === 'all' ? ' en la guía' : ' en ' + esc(value));

    sincronizarMapa();
    medirParallax();
  }

  /* ================================================================== mapa */

  function cuandoMaps() {
    return new Promise(function (resolve, reject) {
      if (window.__mapsReady) return resolve();
      window.__onMapsReady = resolve;
      setTimeout(function () {
        if (!window.__mapsReady) reject(new Error('Google Maps no cargó'));
      }, 12000);
    });
  }

  function icono() {
    return {
      path: 'M0-17C-9.4-17-17-9.4-17 0c0 12.2 17 28 17 28S17 12.2 17 0C17-9.4 9.4-17 0-17z',
      fillColor: '#C9A227',
      fillOpacity: 1,
      strokeColor: '#0B0A09',
      strokeWeight: 3,
      scale: 0.82,
      anchor: new google.maps.Point(0, 28)
    };
  }

  function ponerMarcador(r) {
    if (state.markers[r.id] || r.lat == null || r.lng == null) return;

    var marker = new google.maps.Marker({
      position: { lat: r.lat, lng: r.lng }, map: state.map, title: r.name,
      icon: icono(), animation: quieto ? null : google.maps.Animation.DROP
    });

    marker.addListener('click', function () {
      state.info.setContent(
        '<div class="gm-popup"><strong>' + esc(r.name) + '</strong>' +
        '<small>' + esc(r.category) + ' · ' + esc(r.comuna) + '</small>' +
        (r.googleRating != null
          ? '<small>★ ' + rating(r.googleRating) + ' · ' + reviews(r.googleReviewCount) + ' reseñas</small>'
          : '') + '</div>');
      state.info.open({ map: state.map, anchor: marker });
    });

    state.markers[r.id] = marker;
    sincronizarMapa();
  }

  /* Solo los marcadores del filtro activo, y el mapa encuadrado en ellos. */
  function sincronizarMapa() {
    if (!state.map) return;

    var ids = {};
    visibles().forEach(function (r) { ids[r.id] = true; });

    var bounds = new google.maps.LatLngBounds();
    var n = 0;

    Object.keys(state.markers).forEach(function (id) {
      var on = !!ids[id];
      state.markers[id].setMap(on ? state.map : null);
      if (on) { bounds.extend(state.markers[id].getPosition()); n++; }
    });

    if (n === 0) { state.map.setCenter(SANTIAGO); state.map.setZoom(12); }
    else if (n === 1) { state.map.panTo(bounds.getCenter()); state.map.setZoom(16); }
    else state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }

  async function iniciarMapa() {
    try {
      await cuandoMaps();
    } catch (error) {
      document.getElementById('mapShell').dataset.state = 'error';
      console.warn(error.message);
      return;
    }

    var core = await google.maps.importLibrary('core');
    var maps = await google.maps.importLibrary('maps');

    state.map = new maps.Map(document.getElementById('map'), {
      center: SANTIAGO, zoom: 12,
      colorScheme: core.ColorScheme.DARK,
      streetViewControl: false, mapTypeControl: false,
      fullscreenControl: true, gestureHandling: 'greedy'
    });
    state.info = new google.maps.InfoWindow();
    document.getElementById('mapShell').dataset.state = 'ready';

    /* Coordenadas ya guardadas en restaurants.json (las escribe el job semanal). */
    state.list.forEach(ponerMarcador);

    /* Para el resto, una sola consulta a Places trae foto, coordenadas y place_id. */
    for (var i = 0; i < state.list.length; i++) await traerDePlaces(state.list[i]);
  }

  /* ==================================================== fotos + place_id */

  function clave(r) { return 'guia:place:' + r.id; }

  function leerCache(r) {
    try { return JSON.parse(sessionStorage.getItem(clave(r))); } catch (e) { return null; }
  }
  function guardarCache(r, v) {
    try { sessionStorage.setItem(clave(r), JSON.stringify(v)); } catch (e) { /* sin storage */ }
  }

  /* Si Google no entrega foto, la ficha muestra la inicial en Playfair
     en vez de un hueco: la retícula no se rompe y no inventamos una imagen. */
  function pintarSinFoto(r) {
    var card = document.getElementById('card-' + r.id);
    var hueco = card && card.querySelector('[data-photo]');
    if (!hueco || hueco.dataset.done) return;
    hueco.dataset.done = '1';
    hueco.classList.add('shot--none');
    var ini = document.createElement('span');
    ini.className = 'initial';
    ini.setAttribute('aria-hidden', 'true');
    ini.textContent = r.name.trim().charAt(0).toUpperCase();
    hueco.appendChild(ini);
  }

  function pintarFoto(r, url, autor, autorUrl) {
    var card = document.getElementById('card-' + r.id);
    var hueco = card && card.querySelector('[data-photo]');
    if (!hueco || hueco.dataset.done) return;
    if (!url) return pintarSinFoto(r);
    hueco.dataset.done = '1';

    var img = new Image();
    img.alt = 'Foto de ' + r.name;
    img.loading = 'lazy';
    img.src = url;
    hueco.appendChild(img);
    parallaxEls.push(img);
    img.addEventListener('load', medirParallax, { once: true });

    var cap = document.createElement('figcaption');
    if (autorUrl) {
      var a = document.createElement('a');
      a.href = autorUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = autor || 'Google Maps';
      cap.appendChild(a);
    } else cap.textContent = autor || 'Google Maps';
    hueco.appendChild(cap);
  }

  async function traerDePlaces(r) {
    var cached = leerCache(r);
    if (cached) {
      if (r.lat == null && cached.lat != null) { r.lat = cached.lat; r.lng = cached.lng; }
      ponerMarcador(r);
      pintarFoto(r, cached.photoUrl, cached.creditName, cached.creditUrl);
      return;
    }

    try {
      var lib = await google.maps.importLibrary('places');
      var res = await lib.Place.searchByText({
        textQuery: r.name + ', ' + (r.addressFull || r.address),
        fields: ['id', 'location', 'photos'],
        includedType: 'restaurant', maxResultCount: 1,
        language: 'es-419', region: 'CL'
      });

      var place = res.places && res.places[0];
      if (!place) return pintarSinFoto(r);

      var photo = place.photos && place.photos[0];
      var attr = photo && photo.authorAttributions && photo.authorAttributions[0];
      var payload = {
        lat: place.location ? place.location.lat() : null,
        lng: place.location ? place.location.lng() : null,
        photoUrl: photo ? photo.getURI({ maxWidth: 1400, maxHeight: 1050 }) : null,
        creditName: attr ? attr.displayName : null,
        creditUrl: attr ? attr.uri : null
      };

      guardarCache(r, payload);
      if (r.lat == null && payload.lat != null) { r.lat = payload.lat; r.lng = payload.lng; }
      ponerMarcador(r);
      pintarFoto(r, payload.photoUrl, payload.creditName, payload.creditUrl);
    } catch (error) {
      console.warn('Places no respondió para ' + r.name + ':', error.message);
      pintarSinFoto(r);
    }
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

    renderCards();
    renderFilters();
    aplicarFiltro('all');

    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', medirParallax);

    iniciarMapa();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
