(() => {
  createParticleStage(document.querySelector('#opening-stage'));

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('.opening-halo').animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 1450,
      easing: 'ease-out',
      fill: 'both',
    });
  }
})();
