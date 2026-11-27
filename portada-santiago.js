(() => {
  const hero = document.querySelector('.hero.santiago');
  const top = hero.querySelector('.cima');
  const monument = hero.querySelector('.monumento-tocar');
  let gesture;
  let dragged = false;
  hero.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.target.closest('.regalar')) return;
    gesture = {id:event.pointerId, x:event.clientX, y:event.clientY};
    dragged = false;
  });
  hero.addEventListener('pointermove', event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    if (Math.hypot(dx, event.clientY - gesture.y) > 8) dragged = true;
    hero.style.setProperty('--desplazamiento', Math.max(-8, Math.min(8, dx/8))+'px');
  });
  function reset(event) {
    if (gesture?.id !== event.pointerId) return;
    gesture = null;
    hero.style.removeProperty('--desplazamiento');
  }
  window.addEventListener('pointerup',reset);
  window.addEventListener('pointercancel',reset);
  monument.addEventListener('click',event=>{
    if (dragged && event.detail) return;
    top.classList.remove('ondeando');
    void top.offsetWidth;
    top.classList.add('ondeando');
  });
  top.addEventListener('animationend',event=>{
    if(event.animationName==='mostrar-rd') top.classList.remove('ondeando');
  });
  const card = document.querySelector('#tarjeta-muestra');
  hero.querySelector('.regalar').onclick = () => card.showModal();
  for (const btn of card.querySelectorAll('.montos button')) {
    btn.onclick = () => {
      card.querySelector('.tarjeta-visual strong').textContent = btn.textContent;
      for(const item of card.querySelectorAll('.montos button')) item.setAttribute('aria-pressed',item===btn);
    };
  }
})();
