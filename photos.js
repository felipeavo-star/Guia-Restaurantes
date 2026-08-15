(function(){
  const waitForMaps=async()=>{
    for(let i=0;i<40;i++){
      if(window.google?.maps?.importLibrary) return true;
      await new Promise(r=>setTimeout(r,250));
    }
    return false;
  };

  async function loadPhotos(){
    if(!(await waitForMaps())) return;
    try{
      const {Place}=await google.maps.importLibrary('places');
      const cards=[...document.querySelectorAll('.card')];
      for(const card of cards){
        if(card.querySelector('.restaurant-photo')) continue;
        const title=card.querySelector('h2');
        const address=card.querySelector('.address');
        if(!title) continue;
        const name=title.textContent.trim();
        const addressText=address?.textContent.trim()||'';
        try{
          const request={
            textQuery:`${name}, ${addressText}, Santiago, Chile`,
            fields:['displayName','photos'],
            includedType:'restaurant',
            maxResultCount:1,
            language:'es-419',
            region:'CL'
          };
          const {places}=await Place.searchByText(request);
          const place=places?.[0];
          const photo=place?.photos?.[0];
          if(!photo) continue;

          const wrap=document.createElement('div');
          wrap.className='restaurant-photo';
          const img=document.createElement('img');
          img.alt=`Foto de ${name}`;
          img.loading='lazy';
          img.src=photo.getURI({maxWidth:1200,maxHeight:700});
          wrap.appendChild(img);

          const attribution=photo.authorAttributions?.[0];
          const credit=document.createElement('div');
          credit.className='restaurant-photo-credit';
          if(attribution?.uri){
            const link=document.createElement('a');
            link.href=attribution.uri;
            link.target='_blank';
            link.rel='noopener noreferrer';
            link.textContent=attribution.displayName||'Google Maps';
            credit.appendChild(link);
          }else{
            credit.textContent='Google Maps';
          }
          wrap.appendChild(credit);
          card.insertBefore(wrap,card.firstElementChild);
        }catch(err){
          console.warn('No se pudo cargar la foto de',name,err);
        }
      }
    }catch(err){
      console.warn('Places API no disponible para fotografías',err);
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .restaurant-photo{position:relative;margin:-22px -22px 20px;height:210px;overflow:hidden;background:#0b0b0b;border-bottom:1px solid #252525}
    .restaurant-photo img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .45s ease,filter .45s ease}
    .card:hover .restaurant-photo img{transform:scale(1.035);filter:saturate(1.05)}
    .restaurant-photo:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.58));pointer-events:none}
    .restaurant-photo-credit{position:absolute;right:9px;bottom:7px;z-index:2;font-size:8px;color:rgba(255,255,255,.78);text-shadow:0 1px 3px #000;letter-spacing:.02em}
    .restaurant-photo-credit a{color:inherit;text-decoration:none}
    .restaurant-photo-credit a:hover{text-decoration:underline}
    @media(max-width:700px){.restaurant-photo{height:200px}}
  `;
  document.head.appendChild(style);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadPhotos); else loadPhotos();
})();