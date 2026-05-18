(function () {
    document.querySelectorAll('.gl-law-card.is-active').forEach((card) => {
        const href = card.getAttribute('data-href');
        if (!href) return;
        card.addEventListener('click', () => {
            window.location.href = href;
        });
    });
})();
