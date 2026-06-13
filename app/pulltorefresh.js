// app/pulltorefresh.js – Pull-to-Refresh
// Touchscreen-Geste: am Seitenanfang mit dem Finger nach unten ziehen -> Seite neu laden.
// Body ist overflow:hidden, daher greift die native Browser-Geste nicht – wir bauen sie selbst.
Object.assign(App, {
    _initPullToRefresh: function () {
        if (!('ontouchstart' in window)) return;           // nur echte Touch-Geräte
        const TRIGGER = 64;     // sichtbarer Ziehweg (px) bis zum Auslösen
        const MAX = 96;         // max. sichtbarer Weg (Gummiband-Begrenzung)
        const RESIST = 0.5;     // Widerstand: realer Finger-Weg * RESIST = sichtbarer Weg

        let startY = 0, dist = 0, pulling = false;

        const ind = document.createElement('div');
        ind.id = 'ptr-indicator';
        ind.innerHTML = '<div id="ptr-spinner">&#8595;</div>';   // Pfeil nach unten
        document.body.appendChild(ind);

        // nächsthöheren scrollbaren Vorfahren des Berührungsziels finden
        function scrollableAt(el) {
            while (el && el !== document.body && el.nodeType === 1) {
                const oy = getComputedStyle(el).overflowY;
                if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
                el = el.parentElement;
            }
            return null;
        }

        function setPos(d) {
            ind.style.transform = 'translateX(-50%) translateY(' + d + 'px)';
            ind.style.opacity = Math.min(1, d / TRIGGER);
            ind.classList.toggle('ready', d >= TRIGGER);
        }

        document.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1 || ind.classList.contains('spinning')) { pulling = false; return; }
            const sc = scrollableAt(e.target);
            const top = sc ? sc.scrollTop : (window.scrollY || 0);
            if (top <= 0) { startY = e.touches[0].clientY; dist = 0; pulling = true; }
            else { pulling = false; }
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            if (!pulling) return;
            const dy = e.touches[0].clientY - startY;
            if (dy <= 0) { dist = 0; setPos(0); return; }
            dist = Math.min(MAX, dy * RESIST);
            e.preventDefault();         // unterdrückt natives Scroll-Wackeln während des Ziehens
            setPos(dist);
        }, { passive: false });

        function end() {
            if (!pulling) return;
            pulling = false;
            if (dist >= TRIGGER) {
                ind.classList.add('spinning');
                ind.style.transform = 'translateX(-50%) translateY(' + TRIGGER + 'px)';
                location.reload();
            } else {
                ind.classList.add('snap');
                setPos(0);
                setTimeout(function () { ind.classList.remove('snap'); }, 200);
            }
        }
        document.addEventListener('touchend', end, { passive: true });
        document.addEventListener('touchcancel', end, { passive: true });
    }
});

document.addEventListener('DOMContentLoaded', function () { App._initPullToRefresh(); });
