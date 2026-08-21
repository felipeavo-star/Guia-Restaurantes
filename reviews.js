(function(){
  const reviews={
    'Le Bistrot de Gaetan':{rating:'4,7',count:'5.655',quote:'“The best French bistro in Santiago, without a doubt!”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Le+Bistrot+de+Gaetan+Santa+Magdalena+80+Providencia'},
    'Baco':{rating:'4,5',count:'6.861',quote:'“This bustling cosmopolitan restaurant provided excellent food, service and atmosphere.”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Baco+Nueva+de+Lyon+113+Providencia'},
    'Parigó':{rating:null,count:null,quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Parigo+Reyes+Lavalle+3310+Las+Condes'},
    'Franklin Klunssen':{rating:null,count:null,quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Franklin+Klunssen+Fernando+de+Arguello+7430+Vitacura'},
    'Piso Uno':{rating:'4,4',count:'2.269',quote:'“Delicious! Highly recommend. We went for an early dinner and it was delicious and quiet for our family.”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Piso+Uno+Santa+Magdalena+116+Providencia'},
    'Benito Vicente':{rating:'5,0',count:'87',quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Benito+Vicente+Francisco+Bilbao+707+Providencia'},
    'Maillard':{rating:'4,7',count:'575',quote:'“Maillard was one of the highlights of our time in Santiago.”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Maillard+Nueva+Costanera+3802+Vitacura'},
    'Caoba':{rating:'4,6',count:'790',quote:'“Realmente espectacular la comida, no esperábamos tanto. Posiblemente el mejor crudo que hemos comido.”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Caoba+Alonso+de+Cordova+4156+Vitacura'},
    'Fuente Alemana':{rating:'4,5',count:'7.769',quote:'“El mejor chacarero que he comido en el último tiempo.”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Fuente+Alemana+Pedro+de+Valdivia+210+Providencia'},
    'Mestizo':{rating:'4,4',count:'6.115',quote:'“Lugar perfecto para ir a cerrar la semana luego de un paseo por el parque Bicentenario.”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Mestizo+Av+Bicentenario+4050+Vitacura'},
    'Huggo Comedor':{rating:'4,7',count:'209',quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Huggo+Comedor+Dr+Luis+Middleton+1698+Providencia'},
    'TAKEYA':{rating:'4,9',count:'128',quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=TAKEYA+Holanda+067+Local+109A+Providencia'},
    'Guksi':{rating:'4,3',count:'358',quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Guksi+Nueva+Los+Leones+140+Providencia'},
    'Nusantara':{rating:'4,9',count:'8',quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Nusantara+Marcel+Duhaut+2995+Providencia'},
    'Caos Comedor Café':{rating:'4,8',count:'143',quote:null,source:'Google',maps:'https://maps.app.goo.gl/Wp5pNuWNsEUj1ZT26?g_st=ic'},
    'Da Dino':{rating:'4,5',count:'52',quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Da+Dino+Alameda+737+Santiago'},
    'Haowacl':{rating:null,count:null,quote:null,source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Haowacl+Santiago+Chile'}
  };

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
    if(!grid) return;
    newRestaurants.forEach(r=>{
      if([...grid.querySelectorAll('h2')].some(h=>h.textContent.trim()===r.name)) return;
      const card=document.createElement('article');
      card.className='card'; card.dataset.comuna=r.comuna;
      card.innerHTML=`<div class="top"><span class="num">--</span><span class="commune">${r.comuna}</span></div><h2>${r.name}</h2><span class="tag">${r.tag}</span><p class="tip">${r.tip}</p><div class="meta-row"><span>${r.price}</span><span>${r.ideal}</span></div><div class="badge-line">${r.badge}</div><div class="address">${r.address}</div><div class="actions"><a class="btn alt" href="${reviews[r.name].maps}" target="_blank" rel="noopener">MAPA</a></div></article>`;
      grid.appendChild(card);
    });
  }

  function render(){
    injectRestaurants();
    const style=document.createElement('style');
    style.textContent=`
      .google-box{margin-top:18px;padding-top:16px;border-top:1px solid #292929}.google-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.google-label{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--accent,#9F1239)}.google-score{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:950}.google-star{color:var(--accent,#9F1239);font-size:16px}.google-count{font-size:10px;color:#71717a;font-weight:700}.google-link{color:inherit;text-decoration:none;display:inline-flex;align-items:center;border-radius:8px;transition:background .18s,transform .18s}.google-link:hover{background:#1d1d1d;transform:translateY(-1px)}.google-review-link{display:block;border-radius:10px;padding:7px 8px;margin:-7px -8px 0;color:inherit;text-decoration:none;transition:background .18s,transform .18s}.google-review-link:hover{background:#171717;transform:translateX(2px)}.google-review{margin:0;color:#d4d4d8;font-size:12px;line-height:1.55;font-style:italic}.google-review-note{margin:0;color:#71717a;font-size:11px;line-height:1.45}.google-source{margin-top:8px;font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:.1em}.meta-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;font-size:10px;color:#a1a1aa;font-weight:800}.meta-row span:first-child{color:var(--accent,#9F1239);font-weight:950}.badge-line{margin-top:10px;font-size:10px;font-weight:900;letter-spacing:.08em;color:var(--accent-soft,#D4A373);text-transform:uppercase}
    `;
    document.head.appendChild(style);

    const cards=[...document.querySelectorAll('.card')];
    cards.forEach(card=>{
      const title=card.querySelector('h2'); if(!title) return; const key=title.textContent.trim(); const data=reviews[key]; if(!data) return;
      const box=document.createElement('div'); box.className='google-box';
      const score=data.rating?`<a class="google-link" href="${data.maps}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${key} en Google Maps"><span class="google-score"><span class="google-star">★</span>${data.rating}<span class="google-count">(${data.count} reseñas)</span></span></a>`:`<a class="google-link" href="${data.maps}" target="_blank" rel="noopener noreferrer"><div class="google-score"><span class="google-count">Ver en Google</span></div></a>`;
      const review=data.quote?`<a class="google-review-link" href="${data.maps}" target="_blank" rel="noopener noreferrer"><p class="google-review">${data.quote}</p></a>`:`<a class="google-review-link" href="${data.maps}" target="_blank" rel="noopener noreferrer"><p class="google-review-note">Ver reseñas en Google →</p></a>`;
      box.innerHTML=`<div class="google-head"><span class="google-label">Google Business</span>${score}</div>${review}<div class="google-source">Fuente: Google · tocar para abrir Google Maps</div>`;
      const address=card.querySelector('.address'); if(address) card.insertBefore(box,address); else card.appendChild(box);
    });

    const grid=document.querySelector('.grid');
    if(grid){
      const sorted=[...grid.querySelectorAll('.card')];
      sorted.sort((a,b)=>{const an=a.querySelector('h2')?.textContent.trim()||'',bn=b.querySelector('h2')?.textContent.trim()||'',ad=reviews[an]||{},bd=reviews[bn]||{};const ar=ad.rating?parseFloat(ad.rating.replace(',','.')):-1,br=bd.rating?parseFloat(bd.rating.replace(',','.')):-1;if(br!==ar)return br-ar;const ac=ad.count?parseInt(ad.count.replace(/\./g,''),10):0,bc=bd.count?parseInt(bd.count.replace(/\./g,''),10):0;if(bc!==ac)return bc-ac;return an.localeCompare(bn,'es')});
      sorted.forEach((card,index)=>{const number=card.querySelector('.num');if(number)number.textContent=String(index+1).padStart(2,'0');grid.appendChild(card)});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render); else render();
})();