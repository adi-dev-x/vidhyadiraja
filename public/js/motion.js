/* ==========================================================================
   motion.js — tiny, dependency-free scroll & interaction layer
   - Scroll reveals ([data-reveal], legacy .wow) with stagger ([data-stagger])
   - Sticky header state, scroll progress bar, back-to-top ring
   - Animated counters ([data-count]), light parallax ([data-parallax])
   - Button ripple, mobile-menu polish
   Uses only transform/opacity, rAF-throttled, honours prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  window.__motion = true;
  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduced = reduceMotion.matches;
  doc.classList.remove('no-js');
  doc.classList.add('js');

  /* ---------- Reveal on scroll ------------------------------------------ */
  var REVEAL_SELECTOR = '[data-reveal], .wow';

  function delayFor(el) {
    var d = el.getAttribute('data-reveal-delay') || el.getAttribute('data-wow-delay');
    if (!d) return 0;
    return d.indexOf('ms') > -1 ? parseFloat(d) : parseFloat(d) * (d.indexOf('s') > -1 ? 1000 : 1);
  }

  function applyStagger(root) {
    (root || document).querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
      var items = group.querySelectorAll(REVEAL_SELECTOR);
      items.forEach(function (item, i) {
        if (!item.hasAttribute('data-reveal-delay')) item.style.setProperty('--reveal-delay', (i % 6) * step + 'ms');
      });
    });
  }

  var pending = [];
  var io = null;
  if ('IntersectionObserver' in window && !prefersReduced) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  }

  function observe(el) {
    if (el.__revealBound) return;
    el.__revealBound = true;
    var delay = delayFor(el);
    if (delay && !el.style.getPropertyValue('--reveal-delay')) el.style.setProperty('--reveal-delay', Math.min(delay, 600) + 'ms');
    if (io) { io.observe(el); pending.push(el); } else el.classList.add('is-visible');
  }

  /* Elements skipped over by a fast scroll or an anchor jump never "intersect";
     reveal anything that is already above the bottom of the viewport. */
  function sweepPassed() {
    if (!pending.length) return;
    var vh = window.innerHeight;
    pending = pending.filter(function (el) {
      if (el.classList.contains('is-visible')) return false;
      if (!el.isConnected) return false;
      if (el.getBoundingClientRect().top < vh) { el.classList.add('is-visible'); io.unobserve(el); return false; }
      return true;
    });
  }

  function scan(root) {
    applyStagger(root);
    var scope = root || document;
    if (scope.matches && scope.matches(REVEAL_SELECTOR)) observe(scope);
    scope.querySelectorAll(REVEAL_SELECTOR).forEach(observe);
    scope.querySelectorAll('[data-count]').forEach(observeCounter);
  }

  /* Content injected later (Firebase lists) is picked up automatically */
  if ('MutationObserver' in window) {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.parentElement && node.parentElement.closest('[data-stagger]')) applyStagger(node.parentElement.closest('[data-stagger]').parentElement);
          scan(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- Counters --------------------------------------------------- */
  var counterIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      runCounter(entry.target);
      counterIO.unobserve(entry.target);
    });
  }, { threshold: 0.6 }) : null;

  function observeCounter(el) {
    if (el.__countBound) return;
    el.__countBound = true;
    if (prefersReduced || !counterIO) { el.textContent = format(el, parseFloat(el.getAttribute('data-count'))); return; }
    el.textContent = format(el, 0);
    counterIO.observe(el);
  }

  function format(el, value) {
    var suffix = el.getAttribute('data-count-suffix') || '';
    var grouped = el.hasAttribute('data-count-group');
    var n = Math.round(value);
    return (grouped ? n.toLocaleString('en-IN') : String(n)) + suffix;
  }

  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var from = parseFloat(el.getAttribute('data-count-from')) || 0;
    var duration = parseInt(el.getAttribute('data-count-duration'), 10) || 1600;
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(el, from + (target - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Scroll-linked UI (one rAF loop) ---------------------------- */
  var header = document.getElementById('siteHeader');
  var progress = document.querySelector('.scroll-progress span');
  var toTop = document.querySelector('.back-to-top');
  var toTopBar = toTop ? toTop.querySelector('.bar') : null;
  var parallaxEls = prefersReduced ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;
  var RING = 151; // 2πr for r=24

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var ratio = Math.min(1, y / max);

    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (progress) progress.style.transform = 'scaleX(' + ratio + ')';
    if (toTop) {
      toTop.classList.toggle('is-visible', y > 480);
      if (toTopBar) toTopBar.style.strokeDashoffset = String(RING - RING * ratio);
    }
    for (var i = 0; i < parallaxEls.length; i++) {
      var el = parallaxEls[i];
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      var rect = el.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      el.style.transform = 'translate3d(0,' + (-rect.top * speed).toFixed(1) + 'px,0)';
    }
    sweepPassed();
    ticking = false;
  }
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });

  if (toTop) {
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Mobile menu polish ---------------------------------------- */
  var collapse = document.getElementById('navbarCollapse');
  if (collapse && header) {
    collapse.addEventListener('show.bs.collapse', function () { header.classList.add('menu-open'); });
    collapse.addEventListener('hidden.bs.collapse', function () { header.classList.remove('menu-open'); });
    collapse.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link && window.innerWidth < 1200 && collapse.classList.contains('show') && window.bootstrap) {
        window.bootstrap.Collapse.getOrCreateInstance(collapse).hide();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && collapse.classList.contains('show') && window.bootstrap) {
        window.bootstrap.Collapse.getOrCreateInstance(collapse).hide();
      }
    });
  }

  /* ---------- Button ripple --------------------------------------------- */
  if (!prefersReduced) {
    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest('.btn, .search-button, .pay-btn');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.left = (e.clientX - rect.left) + 'px';
      dot.style.top = (e.clientY - rect.top) + 'px';
      btn.appendChild(dot);
      dot.addEventListener('animationend', function () { dot.remove(); });
    });
  }

  /* ---------- Init ------------------------------------------------------- */
  scan(document);
  onScroll();

  reduceMotion.addEventListener && reduceMotion.addEventListener('change', function (e) {
    if (e.matches) document.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) { el.classList.add('is-visible'); });
  });
})();
