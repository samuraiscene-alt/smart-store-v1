/* Smart Store - customer home layout v1: remove duplicate quick menu + feature recommended styles */
(() => {
  const STYLE_ID = 'customerHomeLayoutStyle';

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .quickGrid{
        display:none!important;
      }

      #gallery{
        margin-top:14px;
      }

      #gallery .sectionHead{
        margin-bottom:12px;
      }

      #galleryTrack{
        gap:12px!important;
        padding:4px 2px 12px!important;
        scroll-padding-left:2px;
      }

      #galleryTrack .dynamicRecommendedStyle,
      #galleryTrack .galleryCard{
        min-width:88%!important;
        width:88%!important;
        height:auto!important;
        aspect-ratio:4/3!important;
        border-radius:26px!important;
        scroll-snap-align:start!important;
      }

      #galleryTrack .recommendedStyleEmpty{
        min-width:88%!important;
      }

      #galleryTrack .dynamicRecommendedStyleContent{
        left:18px!important;
        right:18px!important;
        bottom:18px!important;
      }

      #galleryTrack .dynamicRecommendedStyleTitle{
        font-size:23px!important;
      }

      @media(max-width:380px){
        #galleryTrack .dynamicRecommendedStyle,
        #galleryTrack .galleryCard{
          min-width:90%!important;
          width:90%!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function reorder(){
    const gallery = document.getElementById('gallery');
    const services = document.getElementById('services');
    const main = services?.parentElement;

    if(gallery && services && main && gallery.nextElementSibling !== services){
      main.insertBefore(gallery, services);
    }
  }

  function init(){
    addStyles();
    reorder();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();
