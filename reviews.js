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
    'Mestizo':{rating:'4,4',count:'6.115',quote:'“Lugar perfecto para ir a cerrar la semana luego de un paseo por el parque Bicentenario.”',source:'Google',maps:'https://www.google.com/maps/search/?api=1&query=Mestizo+Av+Bicentenario+4050+Vitacura'}
  };

  function render(){
    const style=document.createElement('style');
    style.textContent=`
      .google-box{margin-top:18px;padding-top:16px;border-top:1px solid #292929}
      .google-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
      .google-label{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#facc15}
      .google-score{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:950}
      .google-star{color:#facc15;font-size:16px}
      .google-count{font-size:10px;color:#71717a;font-weight:700}
      .google-link{color:inherit;text-decoration:none;display:inline-flex;align-items:center;border-radius:8px;transition:background .18s,transform .18s}
      .google-link:hover{background:#1d1d1d;transform:translateY(-1px)}
      .google-review-link{display:block;border-radius:10px;padding:7px 8px;margin:-7px -8px 0;color:inherit;text-decoration:none;transition:background .18s,transform .18s}
      .google-review-link:hover{background:#171717;transform:translateX(2px)}
      .google-review{margin:0;color:#d4d4d8;font-size:12px;line-height:1.55;font-style:italic}
      .google-review-note{margin:0;color:#71717a;font-size:11px;line-height:1.45}
      .google-source{margin-top:8px;font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:.1em}
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.card').forEach(card=>{
      const title=card.querySelector('h2');
      if(!title) return;
      const key=title.textContent.trim();
      const data=reviews[key];
      if(!data) return;
      const box=document.createElement('div');
      box.className='google-box';
      let score='';
      if(data.rating){
        score=`<a class="google-link" href="${data.maps}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${key} en Google Maps"><span class="google-score"><span class="google-star">★</span>${data.rating}<span class="google-count">(${data.count} reseñas)</span></span></a>`;
      }else{
        score=`<a class="google-link" href="${data.maps}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${key} en Google Maps"><div class="google-score"><span class="google-count">Ver en Google</span></div></a>`;
      }
      const review=data.quote
        ? `<a class="google-review-link" href="${data.maps}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${key} en Google Maps"><p class="google-review">${data.quote}</p></a>`
        : `<a class="google-review-link" href="${data.maps}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${key} en Google Maps"><p class="google-review-note">Ver reseñas en Google →</p></a>`;
      box.innerHTML=`<div class="google-head"><span class="google-label">Google Business</span>${score}</div>${review}<div class="google-source">Fuente: Google · tocar para abrir Google Maps</div>`;
      card.insertBefore(box,card.querySelector('.address'));
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render); else render();
})();
