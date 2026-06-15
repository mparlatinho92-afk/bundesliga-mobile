// app/pulltorefresh.js – Pull-to-Refresh
// Touchscreen-Geste: am Seitenanfang mit dem Finger nach unten ziehen -> Seite neu laden.
// Body ist overflow:hidden, daher greift die native Browser-Geste nicht – wir bauen sie selbst.
Object.assign(App, {
    _initPullToRefresh: function () {
        if (!('ontouchstart' in window)) return;           // nur echte Touch-Geräte
        const TRIGGER = 95;     // sichtbarer Ziehweg (px) bis zur Auslöse-Schwelle (bewusst hoch → weniger versehentlich)
        const MAX = 130;        // max. sichtbarer Weg (Gummiband-Begrenzung)
        const RESIST = 0.45;    // Widerstand: realer Finger-Weg * RESIST = sichtbarer Weg
        const HOLD = 450;       // ms über der Schwelle HALTEN bevor ausgelöst wird ("länger gedrückt halten")

        let startY = 0, dist = 0, pulling = false, armed = false, armTimer = null;

        const ind = document.createElement('div');
        ind.id = 'ptr-indicator';
        ind.innerHTML = '<div id="ptr-spinner">&#8635;</div>';   // Kreis-Pfeil (Neu-Laden-Symbol)
        document.body.appendChild(ind);

        function disarm() { armed = false; if (armTimer) { clearTimeout(armTimer); armTimer = null; } ind.classList.remove('armed'); }

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
            const ready = d >= TRIGGER;
            ind.classList.toggle('ready', ready);
            // Über der Schwelle: erst nach HOLD ms "scharf" → versehentliche Wischer lösen nicht aus
            if (ready) { if (!armed && !armTimer) armTimer = setTimeout(function () { armed = true; armTimer = null; ind.classList.add('armed'); }, HOLD); }
            else disarm();
        }

        document.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1 || ind.classList.contains('spinning')) { pulling = false; return; }
            const sc = scrollableAt(e.target);
            const top = sc ? sc.scrollTop : (window.scrollY || 0);
            if (top <= 0) { startY = e.touches[0].clientY; dist = 0; pulling = true; disarm(); }
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
            if (armed) {                       // nur auslösen wenn lang genug über der Schwelle gehalten
                ind.classList.add('spinning');
                ind.style.transform = 'translateX(-50%) translateY(' + TRIGGER + 'px)';
                location.reload();
            } else {
                disarm();
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
