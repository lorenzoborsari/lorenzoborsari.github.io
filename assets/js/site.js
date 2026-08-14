/*
 * site.js — behaviour for the static build.
 *
 * Replaces React + ReactDOM + the component runtime (~350 KB) that previously
 * rendered this page at load time. The markup is now pre-rendered per language,
 * so this file only wires up behaviour. Responsive layout lives in site.css,
 * which is why there is no resize handler here at all.
 */
(function () {
  'use strict';

  var doc = document;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -----------------------------------------------------------------------------------------------------------------
  //  t h e m e
  // -----------------------------------------------------------------------------------------------------------------

  function _applyTheme(theme) {
    var dark = theme === 'scuro';
    doc.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var sun = doc.querySelector('[data-icon-sun]');
    var moon = doc.querySelector('[data-icon-moon]');
    if (sun) sun.style.display = dark ? 'none' : '';
    if (moon) moon.style.display = dark ? '' : 'none';
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0C0F17' : '#FFFFFF');
  }

  function _currentTheme() {
    return doc.documentElement.getAttribute('data-theme') === 'dark' ? 'scuro' : 'chiaro';
  }

  function _wireTheme() {
    var btn = doc.querySelector('[data-theme-btn]');
    if (!btn) return;
    _applyTheme(_currentTheme());
    btn.addEventListener('click', function () {
      var next = _currentTheme() === 'scuro' ? 'chiaro' : 'scuro';
      _applyTheme(next);
      try { localStorage.setItem('lb-theme', next); } catch (e) {}
    });
  }

  // -----------------------------------------------------------------------------------------------------------------
  //  s t a r f i e l d
  // -----------------------------------------------------------------------------------------------------------------

  // Deterministic PRNG: the same layout every visit, and no gradient list has to
  // be shipped in the HTML.
  function _seeded(seed) {
    var s = seed;
    return function () {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }

  function _layer(n, size, alpha, seed) {
    var rand = _seeded(seed);
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push('radial-gradient(' + size + 'px ' + size + 'px at ' +
        (rand() * 100).toFixed(2) + '% ' + (rand() * 100).toFixed(2) + '%, rgba(255,255,255,' +
        (alpha * (0.5 + rand() * 0.5)).toFixed(2) + ') 0%, rgba(255,255,255,0) 100%)');
    }
    return out.join(',');
  }

  function _starfield() {
    var conf = { '1': [60, 1.6, 0.9, 7], '2': [34, 2.4, 0.75, 991],
                 '3': [16, 3.4, 0.6, 4242], '4': [40, 1.8, 0.7, 555] };
    Array.prototype.forEach.call(doc.querySelectorAll('[data-stars]'), function (el) {
      var c = conf[el.getAttribute('data-stars')];
      if (c) el.style.backgroundImage = _layer(c[0], c[1], c[2], c[3]);
    });
  }

  // -----------------------------------------------------------------------------------------------------------------
  //  s c r o l l
  // -----------------------------------------------------------------------------------------------------------------

  function _wireScroll() {
    var topbar = doc.querySelector('[data-topbar]');
    var bar = doc.querySelector('[data-progress]');
    var tl = doc.querySelector('[data-tl-fill]');
    var tlWrap = doc.querySelector('[data-tl]');
    if (!topbar && !bar && !tl) return;

    var queued = false;
    var compact = null;

    // Read-then-write inside one frame. Interleaving a style write with the next
    // getBoundingClientRect() would force a synchronous layout on every event.
    function paint() {
      queued = false;
      var root = doc.documentElement;

      // reads
      var y = window.scrollY;
      var maxScroll = Math.max(1, root.scrollHeight - root.clientHeight);
      var vh = window.innerHeight;
      var tlTop = 0, tlHeight = 1;
      if (tl && tlWrap) {
        var r = tlWrap.getBoundingClientRect();
        tlTop = r.top;
        tlHeight = r.height || 1;
      }
      var small = y > 40;

      // writes
      if (topbar && small !== compact) {
        compact = small;
        topbar.style.paddingTop = small ? '10px' : '14px';
        topbar.style.paddingBottom = small ? '10px' : '14px';
        topbar.parentElement.style.boxShadow = small ? '0 6px 24px var(--shadow)' : 'none';
      }
      if (bar) bar.style.transform = 'scaleX(' + (y / maxScroll) + ')';
      if (tl && tlWrap) {
        tl.style.transform =
          'scaleY(' + Math.min(1, Math.max(0, (vh * 0.82 - tlTop) / tlHeight)) + ')';
      }
    }

    // Scroll events outpace the display refresh; collapse a burst into one frame.
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    }, { passive: true });

    paint();
  }

  // -----------------------------------------------------------------------------------------------------------------
  //  r e v e a l   a n d   c o u n t e r s
  // -----------------------------------------------------------------------------------------------------------------

  function _wireReveals() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var d = parseFloat(el.getAttribute('data-reveal')) || 0;
        el.style.transition = 'opacity .7s ease ' + d + 's, transform .7s cubic-bezier(.22,1,.36,1) ' + d + 's';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        io.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    // Read every rect first, then write: interleaving them forced one synchronous
    // layout per element.
    var all = Array.prototype.slice.call(doc.querySelectorAll('[data-reveal]'));
    var fold = window.innerHeight * 0.9;
    var hidden = all.filter(function (el) { return el.getBoundingClientRect().top > fold; });
    hidden.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(18px)';
      io.observe(el);
    });
  }

  function _wireGantt() {
    var gantt = doc.querySelector('[data-gantt]');
    if (!gantt) return;
    var bars = Array.prototype.slice.call(gantt.querySelectorAll('[data-bar]'));
    bars.forEach(function (b) {
      b.style.transformBox = 'fill-box';
      b.style.transformOrigin = 'left center';
      b.style.transform = 'scaleX(0)';
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        bars.forEach(function (b, i) {
          b.style.transition = 'transform .9s cubic-bezier(.22,1,.36,1) ' + (i * 0.11) + 's';
          b.style.transform = 'scaleX(1)';
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0.3 });
    io.observe(gantt);
  }

  function _wireCounters() {
    var els = Array.prototype.slice.call(doc.querySelectorAll('[data-count]'));
    if (!els.length) return;
    // One shared observer rather than one instance per element.
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        var t0 = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - t0) / 1100);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) {
      // The real figure is already in the HTML for crawlers; zero it only now,
      // once we know the animation will actually run.
      el.textContent = '0' + (el.getAttribute('data-suffix') || '');
      io.observe(el);
    });
  }

  function _wireMarkers() {
    var els = Array.prototype.slice.call(doc.querySelectorAll('[data-marker]'));
    if (!els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('marker-pop');
        io.unobserve(e.target);
      });
    }, { threshold: 1 });
    els.forEach(function (el) { io.observe(el); });
  }

  // -----------------------------------------------------------------------------------------------------------------
  //  a c t i v e   s e c t i o n
  // -----------------------------------------------------------------------------------------------------------------

  function _wireSections() {
    var secs = Array.prototype.slice.call(doc.querySelectorAll('[data-sec]'));
    if (!secs.length) return;
    var railItems = Array.prototype.slice.call(doc.querySelectorAll('[data-rail-item]'));
    var navLinks = Array.prototype.slice.call(doc.querySelectorAll('[data-nav]'));

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        railItems.forEach(function (it) {
          var on = it.getAttribute('data-rail-item') === id;
          var dash = it.children[0], num = it.children[1];
          if (!dash || !num) return;
          dash.style.width = on ? '34px' : '20px';
          dash.style.background = on ? 'var(--accent)' : 'var(--line-strong)';
          num.style.color = on ? 'var(--ink)' : 'var(--ink-faint)';
        });
        navLinks.forEach(function (a) {
          var on = a.getAttribute('data-nav') === id;
          a.style.background = on ? 'var(--ink)' : 'transparent';
          a.style.color = on ? 'var(--surface)' : 'var(--ink-soft)';
          if (on) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
        });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  // -----------------------------------------------------------------------------------------------------------------
  //  i d l e   c o s t
  // -----------------------------------------------------------------------------------------------------------------

  function _parkOffscreenAnimations() {
    // gridPan animates background-position, constellationDraw a stroke-dashoffset,
    // pulseDot a box-shadow. None of them composite, so each repaints every frame
    // for as long as it runs — including while scrolled far out of view.
    var looping = Array.prototype.slice.call(doc.querySelectorAll('[style*="infinite"]'));
    if (!looping.length) return;
    looping.forEach(function (el) { el.style.animationPlayState = 'paused'; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
      });
    }, { rootMargin: '400px' });
    looping.forEach(function (el) { io.observe(el); });
  }

  // -----------------------------------------------------------------------------------------------------------------
  //  i n i t
  // -----------------------------------------------------------------------------------------------------------------

  function _init() {
    _wireTheme();
    _starfield();
    _wireScroll();
    _wireSections();
    if (!reduceMotion) {
      _wireReveals();
      _wireGantt();
      _wireCounters();
      _wireMarkers();
      _parkOffscreenAnimations();
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
