/*
 * Guía definitiva de restaurantes · Santiago
 * Fuente única de datos: restaurants.json (inyectado en el build como window.GUIA_DATA).
 * Este archivo hace todo: fichas, filtros, mapa y fotos. No hay otra capa de render.
 */
(function () {
  'use strict';

  var COMUNAS = ['Providencia', 'Vitacura', 'Las Condes', 'Santiago Centro'];
  var SANTIAGO = { lat: -33.4189, lng: -70.5945 };

  var state = { list: [], filter: 'all', map: null, markers: {}, info: null };

  /* ---------------------------------------------------------------- utils */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rating(value) {
    return Number(value).toFixed(1).replace('.', ',');
  }

  function reviews(value) {
    return Number(value).toLocaleString('es-CL');
  }

  /* Orden: mejor puntuación de Google primero; sin dato, al final. */
  function byGoogle(a, b) {
    var ar = a.googleRating == null ? -1 : a.googleRating;
    var br = b.googleRating == null ? -1 : b.googleRating;
    if (br !== ar) return br - ar;
    return (b.googleReviewCount || 0) - (a.googleReviewCount || 0);
  }

  /* ---------------------------------------------------------------- fichas */

  /* Jerarquía del botón dorado: reservar > web > mapa. Solo uno por ficha. */
  function primaryAction(r) {
    if (r.reservationType === 'online' && r.reservation) return 'reservation';
    if (r.website) return 'website';
    return 'maps';
  }

  function actionsHtml(r) {
    var primary = primaryAction(r);
    var out = [];

    function btn(kind, href, label, extra) {
      var cls = 'btn' + (primary === kind ? ' btn--primary' : '');
      out.push(
        '<a class="' + cls + '" href="' + esc(href) + '"' + (extra || '') + '>' + label + '</a>'
      );
    }

    if (r.website) btn('website', r.website, 'Web', ' target="_blank" rel="noopener"');

    if (r.reservationType === 'online' && r.reservation) {
      btn('reservation', r.reservation, 'Reservar', ' target="_blank" rel="noopener"');
    } else if (r.reservationType === 'walk-in') {
      out.push('<span class="walkin">Por orden de llegada</span>');
    }
    /* reservationType "unknown": no mostramos nada antes que mostrar un botón falso. */

    if (r.instagram) btn('instagram', r.instagram, 'Instagram', ' target="_blank" rel="noopener"');
    if (r.phone) btn('phone', 'tel:' + r.phone, 'Tel.');
    if (r.maps) btn('maps', r.maps, 'Mapa', ' target="_blank" rel="noopener"');

    return out.join('');
  }

  function googleHtml(r) {
    if (r.googleRating == null) {
      return (
        '<a class="google" href="' + esc(r.maps) + '" target="_blank" rel="noopener">' +
        '<span class="google-label">Google</span>' +
        '<span class="google-pending">Ver en Google Maps →</span></a>'
      );
    }
    var updated = r.updatedAt
      ? '<p class="google-updated">Actualizado ' +
        new Date(r.updatedAt).toLocaleDateString('es-CL') + '</p>'
      : '';
    return (
      '<a class="google" href="' + esc(r.maps) + '" target="_blank" rel="noopener" ' +
      'aria-label="Ver ' + esc(r.name) + ' en Google Maps">' +
      '<span class="google-label">Google</span>' +
      '<span class="google-score"><span class="star" aria-hidden="true">★</span>' +
      rating(r.googleRating) +
      '<span class="google-count">' + reviews(r.googleReviewCount) + ' reseñas</span>' +
      '</span></a>' + updated
    );
  }

  function factsHtml(r) {
    var rows = [];
    if (r.address) rows.push(['Dirección', esc(r.address)]);
    if (r.price) rows.push(['Precio', '<span class="price">' + esc(r.price) + '</span>']);
    if (r.idealFor && r.idealFor.length) {
      rows.push(['Ideal para', esc(r.idealFor.join(' · '))]);
    }
    if (!rows.length) return '';
    return (
      '<dl class="facts">' +
      rows.map(function (row) {
        return '<dt>' + row[0] + '</dt><dd>' + row[1] + '</dd>';
      }).join('') +
      '</dl>'
    );
  }

  function cardHtml(r, index) {
    return (
      '<li class="card" id="card-' + esc(r.id) + '" data-id="' + esc(r.id) + '" ' +
      'data-comuna="' + esc(r.comuna) + '">' +
        '<div class="photo" data-photo></div>' +
        '<div class="body">' +
          '<div class="card-top">' +
            '<span class="num">' + String(index + 1).padStart(2, '0') + '</span>' +
            '<span class="comuna">' + esc(r.comuna) + '</span>' +
          '</div>' +
          '<h2>' + esc(r.name) + '</h2>' +
          '<p class="category">' + esc(r.category) + '</p>' +
          '<p class="description">' + esc(r.description) + '</p>' +
          (r.badge ? '<span class="badge">' + esc(r.badge) + '</span>' : '') +
          factsHtml(r) +
          googleHtml(r) +
          '<div class="actions">' + actionsHtml(r) + '</div>' +
        '</div>' +
      '</li>'
    );
  }

  function renderCards() {
    document.getElementById('grid').innerHTML = state.list.map(cardHtml).join('');
  }

  /* --------------------------------------------------------------- filtros */

  function visible() {
    if (state.filter === 'all') return state.list;
    return state.list.filter(function (r) { return r.comuna === state.filter; });
  }

  function renderFilters() {
    var present = COMUNAS.filter(function (c) {
      return state.list.some(function (r) { return r.comuna === c; });
    });
    var nav = document.getElementById('filters');
    nav.innerHTML = [{ id: 'all', label: 'Todas' }]
      .concat(present.map(function (c) { return { id: c, label: c }; }))
      .map(function (f) {
        return (
          '<button type="button" class="filter" data-filter="' + esc(f.id) + '" ' +
          'aria-pressed="' + (state.filter === f.id) + '">' + esc(f.label) + '</button>'
        );
      })
      .join('');

    nav.addEventListener('click', function (event) {
      var btn = event.target.closest('.filter');
      if (btn) applyFilter(btn.dataset.filter);
    });
  }

  function applyFilter(value) {
    state.filter = value;

    document.querySelectorAll('.filter').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === value));
    });

    document.querySelectorAll('.card').forEach(function (card) {
      var show = value === 'all' || card.dataset.comuna === value;
      card.hidden = !show;
      card.style.display = show ? '' : 'none';
    });

    var shown = visible();
    document.getElementById('empty').style.display = shown.length ? 'none' : 'block';
    document.getElementById('countLine').textContent =
      shown.length + (shown.length === 1 ? ' local' : ' locales') +
      (value === 'all' ? ' en la guía' : ' en ' + value);

    syncMap();
  }

  /* ----------------------------------------------------------------- mapa */

  function whenMaps() {
    return new Promise(function (resolve, reject) {
      if (window.__mapsReady) return resolve();
      window.__onMapsReady = resolve;
      setTimeout(function () {
        if (!window.__mapsReady) reject(new Error('Google Maps no cargó'));
      }, 12000);
    });
  }

  function markerIcon() {
    return {
      path: 'M0-17C-9.4-17-17-9.4-17 0c0 12.2 17 28 17 28S17 12.2 17 0C17-9.4 9.4-17 0-17z',
      fillColor: '#E3B341',
      fillOpacity: 1,
      strokeColor: '#0A0A0A',
      strokeWeight: 3,
      scale: 0.85,
      anchor: new google.maps.Point(0, 28)
    };
  }

  function addMarker(r) {
    if (state.markers[r.id] || r.lat == null || r.lng == null) return;

    var marker = new google.maps.Marker({
      position: { lat: r.lat, lng: r.lng },
      map: state.map,
      title: r.name,
      icon: markerIcon()
    });

    marker.addListener('click', function () {
      state.info.setContent(
        '<div class="gm-popup"><strong>' + esc(r.name) + '</strong>' +
        '<small>' + esc(r.category) + ' · ' + esc(r.comuna) + '</small>' +
        (r.googleRating != null
          ? '<small>★ ' + rating(r.googleRating) + ' · ' + reviews(r.googleReviewCount) + ' reseñas</small>'
          : '') +
        '</div>'
      );
      state.info.open({ map: state.map, anchor: marker });
    });

    state.markers[r.id] = marker;
    syncMap();
  }

  /* Muestra solo los marcadores del filtro activo y encuadra el mapa en ellos. */
  function syncMap() {
    if (!state.map) return;

    var shownIds = {};
    visible().forEach(function (r) { shownIds[r.id] = true; });

    var bounds = new google.maps.LatLngBounds();
    var count = 0;

    Object.keys(state.markers).forEach(function (id) {
      var on = !!shownIds[id];
      state.markers[id].setMap(on ? state.map : null);
      if (on) { bounds.extend(state.markers[id].getPosition()); count++; }
    });

    if (count === 0) {
      state.map.setCenter(SANTIAGO);
      state.map.setZoom(12);
    } else if (count === 1) {
      state.map.setCenter(bounds.getCenter());
      state.map.setZoom(16);
    } else {
      state.map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }

  async function initMapAndPlaces() {
    try {
      await whenMaps();
    } catch (error) {
      document.getElementById('mapWrap').dataset.state = 'error';
      console.warn(error.message);
      return;
    }

    var core = await google.maps.importLibrary('core');
    var maps = await google.maps.importLibrary('maps');

    state.map = new maps.Map(document.getElementById('map'), {
      center: SANTIAGO,
      zoom: 12,
      colorScheme: core.ColorScheme.DARK,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy'
    });
    state.info = new google.maps.InfoWindow();
    document.getElementById('mapWrap').dataset.state = 'ready';

    /* Coordenadas ya guardadas en restaurants.json (las escribe el job semanal). */
    state.list.forEach(addMarker);

    /* Para el resto, una sola consulta a Places trae foto, coordenadas y place_id. */
    for (var i = 0; i < state.list.length; i++) {
      await hydrateFromPlaces(state.list[i]);
    }
  }

  /* ---------------------------------------------------- fotos + place_id */

  function cacheKey(r) { return 'guia:place:' + r.id; }

  function readCache(r) {
    try { return JSON.parse(sessionStorage.getItem(cacheKey(r))); } catch (e) { return null; }
  }

  function writeCache(r, value) {
    try { sessionStorage.setItem(cacheKey(r), JSON.stringify(value)); } catch (e) { /* sin storage */ }
  }

  function paintPhoto(r, photoUrl, creditName, creditUrl) {
    var card = document.getElementById('card-' + r.id);
    var slot = card && card.querySelector('[data-photo]');
    if (!slot || !photoUrl || slot.dataset.done) return;
    slot.dataset.done = '1';

    var img = new Image();
    img.alt = 'Foto de ' + r.name;
    img.loading = 'lazy';
    img.src = photoUrl;
    slot.appendChild(img);

    var credit = document.createElement('p');
    credit.className = 'photo-credit';
    if (creditUrl) {
      var link = document.createElement('a');
      link.href = creditUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = creditName || 'Google Maps';
      credit.appendChild(link);
    } else {
      credit.textContent = creditName || 'Google Maps';
    }
    slot.appendChild(credit);
  }

  async function hydrateFromPlaces(r) {
    var cached = readCache(r);
    if (cached) {
      if (r.lat == null && cached.lat != null) { r.lat = cached.lat; r.lng = cached.lng; }
      addMarker(r);
      paintPhoto(r, cached.photoUrl, cached.creditName, cached.creditUrl);
      return;
    }

    try {
      var placesLib = await google.maps.importLibrary('places');
      var result = await placesLib.Place.searchByText({
        textQuery: r.name + ', ' + (r.addressFull || r.address),
        fields: ['id', 'location', 'photos'],
        includedType: 'restaurant',
        maxResultCount: 1,
        language: 'es-419',
        region: 'CL'
      });

      var place = result.places && result.places[0];
      if (!place) return;

      var photo = place.photos && place.photos[0];
      var attribution = photo && photo.authorAttributions && photo.authorAttributions[0];
      var payload = {
        lat: place.location ? place.location.lat() : null,
        lng: place.location ? place.location.lng() : null,
        photoUrl: photo ? photo.getURI({ maxWidth: 1200, maxHeight: 700 }) : null,
        creditName: attribution ? attribution.displayName : null,
        creditUrl: attribution ? attribution.uri : null
      };

      writeCache(r, payload);
      if (r.lat == null && payload.lat != null) { r.lat = payload.lat; r.lng = payload.lng; }
      addMarker(r);
      paintPhoto(r, payload.photoUrl, payload.creditName, payload.creditUrl);
    } catch (error) {
      console.warn('Places no respondió para ' + r.name + ':', error.message);
    }
  }

  /* ----------------------------------------------------------------- boot */

  async function loadData() {
    /* En el build, __RESTAURANTS_JSON__ se reemplaza por el JSON real.
       Si se abre el HTML sin build, caemos al archivo suelto. */
    if (Array.isArray(window.GUIA_DATA)) return window.GUIA_DATA;
    var response = await fetch('restaurants.json');
    return response.json();
  }

  async function start() {
    try {
      state.list = (await loadData()).slice().sort(byGoogle);
    } catch (error) {
      console.error('No se pudieron cargar los restaurantes:', error);
      return;
    }

    renderCards();
    renderFilters();
    applyFilter('all');
    initMapAndPlaces();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
