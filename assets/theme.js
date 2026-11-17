(() => {
  const root = document.documentElement;
  const storageKey = 'solopreneurs-theme';
  try {
    const theme = localStorage.getItem(storageKey);
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  } catch {}
  const button = document.querySelector('.theme');
  button?.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem(storageKey, root.dataset.theme); } catch {}
  });
})();
