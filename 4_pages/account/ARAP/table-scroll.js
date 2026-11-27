(() => {
    'use strict';
    const viewport = document.getElementById('table-content');
    const table = document.getElementById('main-table');
    const result = document.getElementById('result-area');
    const bar = document.getElementById('table-floating-scroll');
    const track = document.getElementById('table-scroll-track');
    let scheduled = false;
    function update() {
        scheduled = false;
        const rect = viewport.getBoundingClientRect();
        const left = Math.max(0, rect.left);
        const right = Math.min(window.innerWidth, rect.right);
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        bar.hidden = !result.getClientRects().length || max < 2 || right <= left;
        if (bar.hidden) return;
        bar.style.left = `${left}px`;
        bar.style.width = `${right - left}px`;
        track.style.width = `${bar.clientWidth + max}px`;
        bar.scrollLeft = viewport.scrollLeft;
    }
    function schedule() {
        if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }
    bar.addEventListener('scroll', () => { viewport.scrollLeft = bar.scrollLeft; }, { passive: true });
    viewport.addEventListener('scroll', () => { bar.scrollLeft = viewport.scrollLeft; }, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    if (window.ResizeObserver) {
        const observer = new ResizeObserver(schedule);
        observer.observe(viewport);
        observer.observe(table);
    }
    new MutationObserver(schedule).observe(result, {
        attributes: true, childList: true, subtree: true, attributeFilter: ['style', 'class']
    });
    schedule();
})();
