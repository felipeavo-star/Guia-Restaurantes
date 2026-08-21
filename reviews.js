(function(){
  const reviews=window.GUIDE_REVIEWS||{};
  const newRestaurants=[
    {name:'Huggo Comedor',comuna:'Providencia',tag:'Cocina de autor · Chilena moderna',tip:'Cocina de autor con producto estacional y sabores chilenos, en un pequeño comedor de barrio.',address:'Dr. Luis Middleton 1698',price:'$$$',ideal:'🍻 Amigos · ☀️ Comidas diarias',badge:'🔥 VALE LA VISITA'},
    {name:'TAKEYA',comuna:'Providencia',tag:'Japonés · Soba',tip:'Pequeño restaurante japonés especializado en soba, con una propuesta sencilla y muy enfocada.',address:'Holanda 067, Local 109A',price:'$$',ideal:'🍜 Antojo · 👀 Descubrir',badge:'🍜 ESPECIALISTA'},
    {name:'Guksi',comuna:'Providencia',tag:'Coreano · Noodles',tip:'Restaurante coreano con noodles y preparaciones de cocina coreana.',address:'Av. Nueva Los Leones 0140',price:'$$',ideal:'🍜 Casual · 👀 Descubrir',badge:'🇰🇷 COCINA COREANA'},
    {name:'Nusantara',comuna:'Providencia',tag:'Indonesia · Asiática',tip:'Un pequeño local dedicado a la cocina tradicional de Indonesia, con platos poco habituales en Santiago.',address:'Marcel Duhaut 2995',price:'$',ideal:'👀 Descubrir · 🍽️ Comida diaria',badge:'🌏 IMPERDIBLE DE NICHO'},
    {name:'Caos Comedor Café',comuna:'Providencia',tag:'Cafetería · Comedor',tip:'Comedor y café de barrio con cocina, pastelería y café de especialidad.',address:'Santa Beatriz 223',price:'$$',ideal:'☕ Café · 🍽️ Almuerzo',badge:'🔥 VALE LA VISITA'},
    {name:'Da Dino',comuna:'Santiago Centro',tag:'Pizzería · Italiana',tip:'Pizzería histórica de Santiago, abierta desde 1956, conocida por sus pizzas y preparaciones italianas.',address:'Alameda 737',price:'$',ideal:'🍕 Amigos · 👨‍👩‍👧 Familia',badge:'🏛️ CLÁSICO DE SANTIAGO'},
    {name:'Haowacl',comuna:'Por confirmar',tag:'Datos por verificar',tip:'Restaurante solicitado para la guía. No encontramos una coincidencia verificable con este nombre en Google Business.',address:'Dirección por confirmar',price:'—',ideal:'👀 Por verificar',badge:'⏳ POR VERIFICAR'}
  ];

  function injectRestaurants(){
    const grid=document.querySelector('.grid');
    if(!grid)return;
    newRestaurants.forEach(r=>{
      if([...grid.querySelectorAll('h2')].some(h=>h.textContent.trim()===r.name))return;
      const data=reviews[r.name]||{};
      const card=document.createElement('article');
      card.className='card';card.dataset.comuna=r.comuna;
      card.innerHTML=`<div class="top"><span class="num">--</span><span class="commune">${r.comuna}</span></div><h2>${r.name}</h2><span class="tag">${r.tag}</span><p class="tip">${r.tip}</p><div class="meta-row"><span>${r.price}</span><span>${r.ideal}</span></div><div class="badge-line">${r.badge}</div><div class="address">${r.address}</div><div class="actions"><a class="btn alt" href="${data.maps||'#'}" target="_blank" rel="noopener">MAPA</a></div></article>`;
      grid.appendChild(card);
    });
  }

  function render(){
    injectRestaurants();
    const style=document.createElement('style');
    style.textContent=`
      .google-box{margin-top:18px;padding-top:16px;border-top:1px solid #292929}.google-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.google-label{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#facc15}.google-score{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:950}.google-star{color:#facc15;font-size:16px}.google-count{font-size:10px;color:#71717a;font-weight:700}.google-link,.google-review-link{color:inherit;text-decoration:none}.google-link{display:inline-flex;align-items:center;border-radius:8px;transition:background .18s,transform .18s}.google-link:hover,.google-review-link:hover{background:#171717;transform:translateX(2px)}.google-review-link{display:block;border-radius:10px;padding:7px 8px;margin:-7px -8px 0}.google-review-note{margin:0;color:#a1a1aa;font-size:11px;line-height:1.45}.google-source{margin-top:8px;font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:.1em}.google-updated{margin-top:4px;font-size:9px;color:#52525b}.meta-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:10px;color:#a1a1aa;font-weight:800}.meta-row span:first-child{color:#facc15;font-weight:950}.badge-line{margin-top:10px;font-size:10px;font-weight:900;letter-spacing:.08em;color:#D4A373;text-transform:uppercase}
    `;
    document.head.appendChild(style);

    [...document.querySelectorAll('.card')].forEach(card=>{
      if(card.querySelector('.google-box'))return;
      const title=card.querySelector('h2');if(!title)return;
      const key=title.textContent.trim(),data=reviews[key];if(!data)return;
      const box=document.createElement('div');box.className='google-box';
      const score=data.rating!=null?`<a class="google-link" href="${data.maps}" target="_blank" rel="noopener noreferrer"><span class="google-score"><span class="google-star">★</span>${Number(data.rating).toFixed(1).replace('.',',')}<span class="google-count">(${Number(data.count||0).toLocaleString('es-CL')} reseñas)</span></span></a>`:`<a class="google-link" href="${data.maps}" target="_blank" rel="noopener noreferrer"><span class="google-count">Ver en Google</span></a>`;
      const updated=data.updatedAt?`<div class="google-updated">Actualizado automáticamente · ${new Date(data.updatedAt).toLocaleDateString('es-CL')}</div>`:'';
      box.innerHTML=`<div class="google-head"><span class="google-label">Google Business</span>${score}</div><a class="google-review-link" href="${data.maps}" target="_blank" rel="noopener noreferrer"><p class="google-review-note">Ver reseñas de Google →</p></a><div class="google-source">Fuente: Google · puntuación y cantidad de reseñas</div>${updated}`;
      const address=card.querySelector('.address');if(address)card.insertBefore(box,address);else card.appendChild(box);
    });

    const grid=document.querySelector('.grid');
    if(grid){
      const cards=[...grid.querySelectorAll('.card')];
      cards.sort((a,b)=>{const an=a.querySelector('h2')?.textContent.trim()||'',bn=b.querySelector('h2')?.textContent.trim()||'',ar=reviews[an]?.rating??-1,br=reviews[bn]?.rating??-1;if(br!==ar)return br-ar;return (reviews[bn]?.count??0)-(reviews[an]?.count??0)});
      cards.forEach((card,i)=>{const n=card.querySelector('.num');if(n)n.textContent=String(i+1).padStart(2,'0');grid.appendChild(card)});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
