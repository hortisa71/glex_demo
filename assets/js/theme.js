(function () {
    const STORAGE_KEY = 'glex-theme';
    const root = document.documentElement;

    function applyTheme(theme) {
        root.setAttribute('data-bs-theme', theme);
        document.querySelectorAll('[data-theme-icon]').forEach((el) => {
            el.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
        });
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }

    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-theme-toggle]');
        if (!toggle) return;
        const current = root.getAttribute('data-bs-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
    });
})();
