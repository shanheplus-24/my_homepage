// Runs in the head before styles are painted; no framework runtime is needed.
(() => {
  const key = 'shanhe-appearance';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = (value) => ['light', 'dark', 'system'].includes(value);
  let preference = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* Appearance still works when storage is unavailable. */ }

  const syncControls = () => {
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference));
    });
    document.querySelectorAll('[data-theme-trigger]').forEach((trigger) => {
      const label = preference === 'system' ? `System (${root.dataset.theme})` : preference;
      trigger.setAttribute('aria-label', `Appearance: ${label}. Choose color theme`);
    });
  };
  const apply = () => {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#030305' : '#f7f8fc');
    syncControls();
  };
  apply();
  document.addEventListener('DOMContentLoaded', syncControls, { once: true });
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : 'system';
    apply();
  });
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const choice = event.target.closest('[data-theme-choice]');
    if (choice && valid(choice.dataset.themeChoice)) {
      preference = choice.dataset.themeChoice;
      try { localStorage.setItem(key, preference); } catch { /* Keep this page's choice. */ }
      apply();
      const picker = choice.closest('details');
      if (picker) {
        picker.open = false;
        picker.querySelector('summary')?.focus();
      }
    }
    document.querySelectorAll('details[data-theme-picker][open]').forEach((picker) => {
      if (!picker.contains(event.target)) picker.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('details[data-theme-picker][open]').forEach((picker) => {
      picker.removeAttribute('open');
      picker.querySelector('summary')?.focus();
    });
  });
})();
