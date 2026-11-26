(() => {
  const themeKey = 'happy-everyday-reset-theme';
  const homeTitle = document.title;
  const home = document.querySelector('#home-view');
  const page = document.querySelector('#ai-reset');
  const historySection = document.querySelector('#ai-reset-history');
  const themeButton = document.querySelector('#reset-theme');

  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.dataset.resetTheme = dark ? 'dark' : 'light';
    themeButton.textContent = dark ? '浅色模式' : '深色模式';
  }

  themeButton.addEventListener('click', () => {
    const theme = document.body.dataset.resetTheme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(themeKey, theme); } catch { /* Keep the theme for this visit. */ }
  });

  function showRoute({ type } = {}) {
    const hash = location.hash;
    const inHistory = hash === '#ai-reset-history';
    const isReset = hash === '#ai-reset' || inHistory;
    const entering = page.hidden && isReset;
    const returning = !page.hidden && !isReset;
    page.hidden = !isReset;
    home.hidden = isReset;
    document.title = isReset ? 'AI模型重置 · Happy everyday' : homeTitle;
    if (entering) page.dispatchEvent(new Event('reset:enter'));
    if (inHistory) {
      historySection.scrollIntoView({ behavior: 'instant' });
      historySection.querySelector('h2').focus({ preventScroll: true });
    } else if (isReset || returning) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (type === 'hashchange') {
        document.querySelector(isReset ? '#reset-title' : '.reset-entry').focus({ preventScroll: true });
      }
    }
  }

  try { applyTheme(localStorage.getItem(themeKey)); } catch { applyTheme('light'); }
  window.addEventListener('hashchange', showRoute);
  window.addEventListener('storage', event => {
    if (event.key === themeKey || event.key === null) applyTheme(event.newValue);
  });
  showRoute();
})();
