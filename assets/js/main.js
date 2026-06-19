/* ============================================================
   LIAG — Main JS (main.js)
   Shared behaviour for all pages. Pure vanilla, no deps.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. MOBILE NAV DRAWER
     --------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var drawer = document.querySelector('[data-nav-drawer]');
    if (!toggle || !drawer) return;
    var closeBtn = drawer.querySelector('[data-nav-close]');

    function open() {
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      toggle.setAttribute('aria-expanded', 'true');
    }
    function close() {
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------------------------------------------------------
     2. SCROLL REVEAL
     --------------------------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---------------------------------------------------------
     3. GENERIC MODAL SYSTEM
     [data-open-modal="id"] opens .modal#id; [data-modal-close] closes
     --------------------------------------------------------- */
  function initModals() {
    var lastFocus = null;
    function open(id, presetType) {
      var modal = document.getElementById(id);
      if (!modal) return;
      lastFocus = document.activeElement;
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      var focusable = modal.querySelector('input, button, [tabindex]');
      if (focusable) setTimeout(function () { focusable.focus(); }, 50);
      document.dispatchEvent(new CustomEvent('modal:open', { detail: { id: id, presetType: presetType } }));
    }
    function close(modal) {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var presetType = btn.getAttribute('data-preset-type');
        open(btn.getAttribute('data-open-modal'), presetType);
      });
    });
    document.querySelectorAll('.modal').forEach(function (modal) {
      modal.querySelectorAll('[data-modal-close], .modal__overlay').forEach(function (el) {
        el.addEventListener('click', function () { close(modal); });
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var openModal = document.querySelector('.modal.is-open');
        if (openModal) close(openModal);
      }
    });
    // expose for programmatic use
    window.LiagModal = { open: open };
  }

  /* ---------------------------------------------------------
     4. LIGHTBOX (galleries)
     Any [data-lightbox] image joins a gallery by [data-lightbox-group]
     --------------------------------------------------------- */
  function initLightbox() {
    var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    if (!triggers.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML =
      '<button class="lightbox__close" aria-label="Close">&times;</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" aria-label="Previous">&#8249;</button>' +
      '<img class="lightbox__img" alt="">' +
      '<button class="lightbox__nav lightbox__nav--next" aria-label="Next">&#8250;</button>' +
      '<div class="lightbox__counter"></div>';
    document.body.appendChild(box);

    var imgEl = box.querySelector('.lightbox__img');
    var counter = box.querySelector('.lightbox__counter');
    var current = 0, gallery = [];

    function show(i) {
      current = (i + gallery.length) % gallery.length;
      var src = gallery[current].getAttribute('data-lightbox') || gallery[current].src;
      imgEl.src = src;
      imgEl.alt = gallery[current].alt || '';
      counter.textContent = (current + 1) + ' / ' + gallery.length;
    }
    function openAt(trigger) {
      var group = trigger.getAttribute('data-lightbox-group');
      gallery = group
        ? triggers.filter(function (t) { return t.getAttribute('data-lightbox-group') === group; })
        : triggers;
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      show(gallery.indexOf(trigger));
    }
    function close() { box.classList.remove('is-open'); document.body.style.overflow = ''; }

    triggers.forEach(function (t) {
      t.style.cursor = 'zoom-in';
      t.addEventListener('click', function () { openAt(t); });
    });
    box.querySelector('.lightbox__close').addEventListener('click', close);
    box.querySelector('.lightbox__nav--prev').addEventListener('click', function () { show(current - 1); });
    box.querySelector('.lightbox__nav--next').addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---------------------------------------------------------
     5. TOAST
     --------------------------------------------------------- */
  var toastEl = null, toastTimer = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.innerHTML = '<span class="toast__dot"></span><span class="toast__msg"></span>';
      document.body.appendChild(toastEl);
    }
    toastEl.querySelector('.toast__msg').textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 3600);
  }
  window.LiagToast = showToast;

  /* ---------------------------------------------------------
     6. FORM VALIDATION (lightweight)
     [data-validate] forms: required fields, email pattern.
     Shows success toast; no real backend.
     --------------------------------------------------------- */
  function initForms() {
    document.querySelectorAll('form[data-validate]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var valid = true;
        form.querySelectorAll('[required]').forEach(function (field) {
          var wrap = field.closest('.field') || field;
          var val = (field.value || '').trim();
          var ok = !!val;
          if (ok && field.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
          if (!ok) { valid = false; wrap.classList.add('has-error'); }
          else { wrap.classList.remove('has-error'); }
        });
        if (!valid) {
          var firstErr = form.querySelector('.has-error [required], [required].has-error');
          if (firstErr && firstErr.focus) firstErr.focus();
          return;
        }
        var msg = form.getAttribute('data-success') || 'Message sent — we will be in touch.';
        var endpoint = form.getAttribute('data-endpoint') || 'sendmail.php';
        // gather fields
        var payload = {};
        form.querySelectorAll('input, textarea, select').forEach(function (el) {
          if (el.id) payload[el.id.replace(/^c-/, '')] = el.value;
        });
        var submitBtn = form.querySelector('[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; }
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json(); })
          .then(function (res) {
            if (res && res.ok) { showToast(msg); form.reset(); }
            else { showToast((res && res.error) || 'Something went wrong.'); }
          })
          .catch(function () {
            // No PHP backend (e.g. static preview) — still confirm for demo
            showToast(msg); form.reset();
          })
          .finally(function () { if (submitBtn) submitBtn.disabled = false; });
      });
      // clear error on input
      form.querySelectorAll('[required]').forEach(function (field) {
        field.addEventListener('input', function () {
          var wrap = field.closest('.field') || field;
          wrap.classList.remove('has-error');
        });
      });
    });
  }

  /* ---------------------------------------------------------
     7. CUSTOM CHOICE (checkbox/radio) selected state for chips/opts
     --------------------------------------------------------- */
  function initChoiceState() {
    // option cards + chips reflect their input's checked state visually
    document.querySelectorAll('.opt input, .chip input').forEach(function (input) {
      function sync() {
        var holder = input.closest('.opt, .chip');
        if (!holder) return;
        if (input.type === 'radio') {
          var name = input.name;
          document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
            var h = r.closest('.opt, .chip'); if (h) h.classList.toggle('is-selected', r.checked);
          });
        } else {
          holder.classList.toggle('is-selected', input.checked);
        }
      }
      input.addEventListener('change', sync);
      sync();
    });
  }

  /* ---------------------------------------------------------
     8. ESTIMATOR WIZARD (flagship)
     Works on estimate.html (inline) AND inside the popup modal.
     Pricing is transparent & configurable via LIAG_PRICING.
     --------------------------------------------------------- */

  // Buyer edits these rates to match their real pricing.
  var LIAG_PRICING = {
    // base rate per sq ft by finish level
    finish: { essential: 12, premium: 22, luxury: 40 },
    // scope multiplier
    scope: { consultation: 0.25, partial: 0.65, full: 1.0 },
    // project-type modifier
    type: { residential: 1.0, commercial: 1.15, renovation: 1.1, newbuild: 1.25 },
    currency: '$',
    rangeSpread: 0.18 // +/- band around the central estimate
  };
  window.LIAG_PRICING = LIAG_PRICING;

  function initEstimator(root) {
    var steps = Array.prototype.slice.call(root.querySelectorAll('.estimator__step'));
    var pips = Array.prototype.slice.call(root.querySelectorAll('.estimator__pip'));
    var btnNext = root.querySelector('[data-est-next]');
    var btnPrev = root.querySelector('[data-est-prev]');
    var readout = root.querySelector('[data-est-readout]');
    var successEl = root.querySelector('.estimator__success');
    var stepsWrap = root.querySelector('[data-est-steps]');
    var navWrap = root.querySelector('.estimator__nav');
    if (!steps.length) return;

    var idx = 0;
    var state = {
      type: 'residential', area: 800, finish: 'premium',
      scope: 'full', rooms: [], style: '', timeline: '', name: '', email: ''
    };

    function calc() {
      var perSqft = LIAG_PRICING.finish[state.finish] || 0;
      var scopeMul = LIAG_PRICING.scope[state.scope] || 1;
      var typeMul = LIAG_PRICING.type[state.type] || 1;
      var central = state.area * perSqft * scopeMul * typeMul;
      var low = Math.round(central * (1 - LIAG_PRICING.rangeSpread) / 100) * 100;
      var high = Math.round(central * (1 + LIAG_PRICING.rangeSpread) / 100) * 100;
      return { low: low, high: high };
    }
    function fmt(n) { return LIAG_PRICING.currency + n.toLocaleString('en-US'); }

    function updateReadout() {
      if (!readout) return;
      var est = calc();
      readout.innerHTML = '<span class="accent">' + fmt(est.low) + '</span> &ndash; <span class="accent">' + fmt(est.high) + '</span>';
    }

    function showStep(n) {
      idx = Math.max(0, Math.min(n, steps.length - 1));
      steps.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      pips.forEach(function (p, i) {
        p.classList.toggle('is-done', i < idx);
        p.classList.toggle('is-active', i === idx);
      });
      if (btnPrev) btnPrev.style.visibility = idx === 0 ? 'hidden' : 'visible';
      if (btnNext) btnNext.textContent = idx === steps.length - 1 ? 'Submit request' : 'Continue';
      updateReadout();
    }

    // Capture inputs within this estimator
    root.querySelectorAll('input, select').forEach(function (input) {
      input.addEventListener('change', function () {
        var key = input.getAttribute('data-est');
        if (!key) return;
        if (key === 'rooms') {
          state.rooms = Array.prototype.slice.call(
            root.querySelectorAll('[data-est="rooms"]:checked')
          ).map(function (c) { return c.value; });
        } else {
          state[key] = input.value;
        }
        updateReadout();
      });
      if (input.getAttribute('data-est') === 'area') {
        input.addEventListener('input', function () {
          state.area = parseInt(input.value, 10) || 0;
          var label = root.querySelector('[data-est-area-label]');
          if (label) label.firstChild ? label.childNodes[0].nodeValue = state.area + ' ' : label.textContent = state.area;
          updateReadout();
        });
      }
    });

    function validateStep() {
      var step = steps[idx];
      var ok = true;
      step.querySelectorAll('[required]').forEach(function (field) {
        var wrap = field.closest('.field') || field;
        var val = (field.value || '').trim();
        var good = !!val;
        if (good && field.type === 'email') good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        if (!good) { ok = false; wrap.classList.add('has-error'); }
        else wrap.classList.remove('has-error');
      });
      return ok;
    }

    if (btnNext) btnNext.addEventListener('click', function () {
      if (!validateStep()) return;
      if (idx === steps.length - 1) { finish(); return; }
      showStep(idx + 1);
    });
    if (btnPrev) btnPrev.addEventListener('click', function () { showStep(idx - 1); });

    function finish() {
      var est = calc();
      if (stepsWrap) stepsWrap.style.display = 'none';
      if (navWrap) navWrap.style.display = 'none';
      var prog = root.querySelector('.estimator__progress');
      if (prog) prog.style.display = 'none';
      if (successEl) {
        successEl.classList.add('is-visible');
        var range = successEl.querySelector('[data-est-final]');
        if (range) range.innerHTML = fmt(est.low) + ' &ndash; ' + fmt(est.high);
      }
      // notify the studio by email (graceful fallback for static preview)
      try {
        fetch('sendmail.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Estimate request',
            type: state.type, area: state.area + ' sq ft',
            scope: state.scope, finish: state.finish,
            estimate: fmt(est.low) + ' - ' + fmt(est.high)
          })
        }).catch(function () { });
      } catch (e) { }
      // persist (demo)
      try { localStorage.setItem('liag-estimate', JSON.stringify({ state: state, est: est, at: Date.now() })); } catch (e) { }
    }

    showStep(0);
  }

  function initEstimators() {
    document.querySelectorAll('[data-estimator]').forEach(initEstimator);
  }

  /* ---------------------------------------------------------
     9. PROJECT FILTER (projects grid)
     --------------------------------------------------------- */
  function initFilter() {
    var filterBar = document.querySelector('[data-filter-bar]');
    if (!filterBar) return;
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-filter-item]'));
    var countEl = document.querySelector('[data-filter-count]');
    filterBar.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-filter');
        filterBar.querySelectorAll('[data-filter]').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var shown = 0;
        items.forEach(function (item) {
          var match = cat === 'all' || (item.getAttribute('data-cats') || '').indexOf(cat) > -1;
          item.style.display = match ? '' : 'none';
          if (match) shown++;
        });
        if (countEl) countEl.textContent = shown;
      });
    });
  }

  /* ---------------------------------------------------------
     10. READING PROGRESS (blog single)
     --------------------------------------------------------- */
  function initReadingProgress() {
    var bar = document.querySelector('[data-reading-progress]');
    if (!bar) return;
    var article = document.querySelector('[data-article]');
    if (!article) return;
    function update() {
      var rect = article.getBoundingClientRect();
      var total = article.offsetHeight - window.innerHeight;
      var scrolled = Math.min(Math.max(-rect.top, 0), total);
      var pct = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------------------------------------------------------
     11. CURSOR GLOW (ambient FX)
     --------------------------------------------------------- */
  function initCursorGlow() {
    if (document.body.classList.contains('no-fx')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return;
    var glow = document.querySelector('.fx-cursor');
    if (!glow) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, active = false, raf = null;
    function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      glow.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!active) { active = true; glow.classList.add('is-active'); if (!raf) loop(); }
    }, { passive: true });
    window.addEventListener('mouseleave', function () {
      active = false; glow.classList.remove('is-active');
    });
  }

  /* ---------------------------------------------------------
     12. FLOATING PARTICLES (ambient FX)
     Subtle drifting motes on a canvas. Light, capped count.
     --------------------------------------------------------- */
  function initParticles() {
    if (document.body.classList.contains('no-fx')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var canvas = document.querySelector('.fx-particles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w, h, dpr, particles = [], raf = null, running = true;

    // accent rgb (azure) — read from CSS var, fallback
    var accent = '47,111,176';
    var probe = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    // keep default; CSS var is hex so we just use a fixed cool-blue tint for canvas

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    }
    function makeParticles() {
      var count = Math.min(34, Math.floor(window.innerWidth / 42));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: (Math.random() * 1.8 + 0.7) * dpr,
          vx: (Math.random() - 0.5) * 0.1 * dpr,
          vy: (Math.random() - 0.5) * 0.1 * dpr - 0.04 * dpr,
          a: Math.random() * 0.35 + 0.18,
          tint: Math.random() > 0.5,
          tw: Math.random() * Math.PI * 2  // twinkle phase
        });
      }
    }
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        p.x += p.vx; p.y += p.vy;
        p.tw += 0.02;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        var ta = p.a * (0.6 + 0.4 * Math.sin(p.tw)); // gentle twinkle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.tint
          ? 'rgba(' + accent + ',' + ta + ')'
          : 'rgba(88,101,119,' + (ta * 0.8) + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (!raf) { running = true; tick(); } }
    function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } }

    size(); makeParticles(); start();
    window.addEventListener('resize', function () { size(); makeParticles(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  /* ---------------------------------------------------------
     13. SECTOR EXPLORER (architecture feature)
     Click a sector chip -> filter projects + swap capability line
     --------------------------------------------------------- */
  function initSectorExplorer() {
    var root = document.querySelector('[data-sector-explorer]');
    if (!root) return;
    var chips = root.querySelectorAll('[data-sector]');
    var items = root.querySelectorAll('[data-sector-item]');
    var blurb = root.querySelector('[data-sector-blurb]');
    var blurbs = {
      residential: 'Homes and housing — from single villas to multi-unit developments, designed around how people actually live.',
      commercial: 'Offices, retail, and mixed-use — buildings that work as hard as the businesses inside them.',
      civic: 'Libraries, schools, and public buildings — architecture in service of the community.',
      cultural: 'Museums, galleries, and performance spaces — where the building is part of the experience.'
    };
    function select(sector) {
      chips.forEach(function (c) {
        var on = c.getAttribute('data-sector') === sector;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      items.forEach(function (it) {
        var cats = it.getAttribute('data-sector-item');
        var show = sector === 'all' || cats.indexOf(sector) > -1;
        it.style.display = show ? '' : 'none';
      });
      if (blurb && blurbs[sector]) {
        blurb.style.opacity = '0';
        setTimeout(function () { blurb.textContent = blurbs[sector]; blurb.style.opacity = '1'; }, 200);
      }
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { select(c.getAttribute('data-sector')); });
    });
    // default to first sector
    var first = chips[0];
    if (first) select(first.getAttribute('data-sector'));
  }

  /* ---------------------------------------------------------
     14. PROCESS TIMELINE (architecture feature)
     Click a phase -> expand its detail, advance the progress line
     --------------------------------------------------------- */
  function initProcessTimeline() {
    var root = document.querySelector('[data-timeline]');
    if (!root) return;
    var nodes = root.querySelectorAll('[data-phase]');
    var panels = root.querySelectorAll('[data-phase-panel]');
    var fill = root.querySelector('[data-timeline-fill]');
    function activate(idx) {
      nodes.forEach(function (n, i) {
        n.classList.toggle('is-active', i === idx);
        n.classList.toggle('is-done', i < idx);
      });
      panels.forEach(function (p, i) { p.classList.toggle('is-active', i === idx); });
      if (fill) fill.style.width = (nodes.length > 1 ? (idx / (nodes.length - 1)) * 100 : 0) + '%';
    }
    nodes.forEach(function (n, i) {
      n.addEventListener('click', function () { activate(i); });
      n.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(i); }
      });
    });
    activate(0);
  }

  /* ---------------------------------------------------------
     15. FULLSCREEN HERO SLIDER (architecture feature)
     --------------------------------------------------------- */
  function initHeroSlider() {
    var slider = document.querySelector('[data-hero-slider]');
    if (!slider) return;
    var slides = slider.querySelectorAll('[data-slide]');
    var dots = slider.querySelectorAll('[data-slide-dot]');
    var prev = slider.querySelector('[data-slide-prev]');
    var next = slider.querySelector('[data-slide-next]');
    var idx = 0, timer = null;
    function go(n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
    }
    function auto() { timer = setInterval(function () { go(idx + 1); }, 5500); }
    function reset() { clearInterval(timer); auto(); }
    if (next) next.addEventListener('click', function () { go(idx + 1); reset(); });
    if (prev) prev.addEventListener('click', function () { go(idx - 1); reset(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); reset(); }); });
    go(0); auto();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer); else reset();
    });
  }

  /* ---------------------------------------------------------
     16. REVEAL SLIDER (studio — structure vs styling)
     --------------------------------------------------------- */
  function initRevealSlider() {
    var root = document.querySelector('[data-reveal]');
    if (!root) return;
    var top = root.querySelector('[data-reveal-top]');
    var handle = root.querySelector('[data-reveal-handle]');
    var pos = 50, dragging = false;

    function setPos(p) {
      pos = Math.max(0, Math.min(100, p));
      if (top) top.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      if (handle) handle.style.left = pos + '%';
      root.setAttribute('aria-valuenow', Math.round(pos));
    }
    function fromEvent(e) {
      var rect = root.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      setPos((x / rect.width) * 100);
    }
    function start(e) { dragging = true; fromEvent(e); e.preventDefault(); }
    function move(e) { if (dragging) fromEvent(e); }
    function end() { dragging = false; }

    root.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    root.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    root.setAttribute('tabindex', '0');
    root.setAttribute('role', 'slider');
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { setPos(pos - 4); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(pos + 4); e.preventDefault(); }
    });
    setPos(50);
  }

  /* ---------------------------------------------------------
     17. PROJECT INQUIRY FORM (multi-step) — "Start a project"
     --------------------------------------------------------- */
  function initInquiry() {
    var root = document.querySelector('[data-inquiry]');
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll('.estimator__step'));
    var pips = Array.prototype.slice.call(root.querySelectorAll('.estimator__pip'));
    var btnNext = root.querySelector('[data-inq-next]');
    var btnPrev = root.querySelector('[data-inq-prev]');
    var successEl = root.querySelector('.estimator__success');
    var stepsWrap = root.querySelector('[data-inq-steps]');
    var navWrap = root.querySelector('.estimator__nav');
    var summaryEl = root.querySelector('[data-inq-summary]');
    if (!steps.length) return;

    var idx = 0;
    var state = { type: '', budget: '', timeline: '', name: '', email: '', message: '' };

    function showStep(n) {
      idx = Math.max(0, Math.min(n, steps.length - 1));
      steps.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      pips.forEach(function (p, i) {
        p.classList.toggle('is-done', i < idx);
        p.classList.toggle('is-active', i === idx);
      });
      if (btnPrev) btnPrev.style.visibility = idx === 0 ? 'hidden' : 'visible';
      if (btnNext) btnNext.textContent = idx === steps.length - 1 ? 'Send request' : 'Continue';
      if (summaryEl && idx === steps.length - 1) {
        summaryEl.innerHTML =
          '<span>' + (labelFor('type', state.type) || '—') + '</span>' +
          '<span>' + (labelFor('budget', state.budget) || '—') + '</span>' +
          '<span>' + (labelFor('timeline', state.timeline) || '—') + '</span>';
      }
    }
    function labelFor(group, val) {
      var el = root.querySelector('[data-inq="' + group + '"][value="' + val + '"]');
      if (!el) return val;
      var lbl = el.closest('.opt');
      var t = lbl ? lbl.querySelector('.opt__title') : null;
      return t ? t.textContent : val;
    }

    root.querySelectorAll('input, select, textarea').forEach(function (input) {
      input.addEventListener('change', function () {
        var key = input.getAttribute('data-inq');
        if (key) state[key] = input.value;
      });
      input.addEventListener('input', function () {
        var key = input.getAttribute('data-inq');
        if (key) state[key] = input.value;
      });
    });

    function validateStep() {
      var current = steps[idx];
      var reqs = current.querySelectorAll('[required]');
      var ok = true;
      reqs.forEach(function (r) {
        var valid = r.value && r.value.trim() && (r.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.value));
        var field = r.closest('.field');
        if (!valid) { ok = false; if (field) field.classList.add('has-error'); }
        else if (field) field.classList.remove('has-error');
      });
      // radio groups: require a selection if step has radios with data-inq
      var radios = current.querySelectorAll('input[type="radio"][data-inq]');
      if (radios.length) {
        var anyChecked = Array.prototype.some.call(radios, function (r) { return r.checked; });
        if (!anyChecked) ok = false;
      }
      return ok;
    }

    if (btnNext) btnNext.addEventListener('click', function () {
      if (!validateStep()) return;
      if (idx === steps.length - 1) {
        // submit (to PHP, with graceful fallback for static preview)
        function finish() {
          if (stepsWrap) stepsWrap.style.display = 'none';
          if (navWrap) navWrap.style.display = 'none';
          if (successEl) successEl.classList.add('is-visible');
        }
        btnNext.disabled = true;
        fetch('sendmail.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.name, email: state.email, subject: 'Project inquiry',
            type: state.type, budget: state.budget, timeline: state.timeline,
            message: state.message
          })
        }).then(function (r) { return r.json(); })
          .then(function () { finish(); })
          .catch(function () { finish(); })
          .finally(function () { btnNext.disabled = false; });
        return;
      }
      showStep(idx + 1);
    });
    if (btnPrev) btnPrev.addEventListener('click', function () { showStep(idx - 1); });

    // reset on open
    document.addEventListener('modal:open', function (e) {
      if (e.detail.id === 'inquiry-modal') {
        idx = 0;
        if (stepsWrap) stepsWrap.style.display = '';
        if (navWrap) navWrap.style.display = '';
        if (successEl) successEl.classList.remove('is-visible');
        // honor a preset type if the trigger requested one
        if (e.detail.presetType) {
          var radio = root.querySelector('[data-inq="type"][value="' + e.detail.presetType + '"]');
          if (radio) { radio.checked = true; state.type = e.detail.presetType; }
        }
        showStep(0);
      }
    });
    showStep(0);
  }

  /* ---------------------------------------------------------
     18. ANIMATED COUNTERS — count up on scroll into view
     --------------------------------------------------------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        var raw = el.getAttribute('data-count');
        var target = parseFloat(raw);
        var suffix = el.getAttribute('data-count-suffix') || '';
        var decimals = (raw.split('.')[1] || '').length;
        var dur = 1400, start = null;
        function tick(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = (target * eased).toFixed(decimals);
          el.textContent = (decimals ? val : Math.round(val).toLocaleString('en-US')) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = (decimals ? target.toFixed(decimals) : Math.round(target).toLocaleString('en-US')) + suffix;
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     19. CUSTOMIZER PANEL — live accent + dark mode (demo feature)
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     Theme toggle — dark / light, top-right corner, persisted
     --------------------------------------------------------- */
  var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>';
  var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  function initThemeToggle() {
    var KEY = 'liag-theme';
    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';

    function apply(dark) {
      document.body.classList.toggle('theme-dark', dark);
      btn.innerHTML = dark ? SUN : MOON;
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
    }

    var saved;
    try { saved = localStorage.getItem(KEY); } catch (e) { }
    apply(saved === 'dark');

    btn.addEventListener('click', function () {
      var dark = !document.body.classList.contains('theme-dark');
      apply(dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { }
    });

    document.body.appendChild(btn);
  }

  function initCustomizer() {
    var panel = document.querySelector('[data-customizer]');
    if (!panel) return;
    var toggle = panel.querySelector('[data-cz-toggle]');
    var body = panel.querySelector('[data-cz-body]');
    var swatches = panel.querySelectorAll('[data-cz-accent]');
    var darkBtn = panel.querySelector('[data-cz-dark]');

    if (toggle) toggle.addEventListener('click', function () {
      panel.classList.toggle('is-open');
    });
    swatches.forEach(function (sw) {
      sw.addEventListener('click', function () {
        var c = sw.getAttribute('data-cz-accent');
        var deep = sw.getAttribute('data-cz-accent-deep') || c;
        document.body.style.setProperty('--accent', c);
        document.body.style.setProperty('--accent-deep', deep);
        swatches.forEach(function (s) { s.classList.remove('is-active'); });
        sw.classList.add('is-active');
      });
    });
    if (darkBtn) darkBtn.addEventListener('click', function () {
      document.body.classList.toggle('theme-dark');
      darkBtn.classList.toggle('is-active');
      var on = document.body.classList.contains('theme-dark');
      darkBtn.querySelector('[data-cz-dark-label]').textContent = on ? 'Light mode' : 'Dark mode';
    });
    var stickyBtn = panel.querySelector('[data-cz-sticky]');
    if (stickyBtn) {
      // Header is sticky by default — reflect that as the active state.
      stickyBtn.classList.add('is-active');
      stickyBtn.addEventListener('click', function () {
        var nowStatic = document.body.classList.toggle('nav-static');
        var sticky = !nowStatic;
        stickyBtn.classList.toggle('is-active', sticky);
        stickyBtn.querySelector('[data-cz-sticky-label]').textContent = sticky ? 'Sticky header' : 'Static header';
      });
    }
  }

  /* ---------------------------------------------------------
     20. FAQ ACCORDION
     --------------------------------------------------------- */
  function initAccordion() {
    var items = document.querySelectorAll('[data-acc-item]');
    if (!items.length) return;
    items.forEach(function (item) {
      var btn = item.querySelector('[data-acc-trigger]');
      var panel = item.querySelector('[data-acc-panel]');
      if (!btn || !panel) return;
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var open = item.classList.contains('is-open');
        // close siblings in same group
        var group = item.parentElement;
        group.querySelectorAll('[data-acc-item].is-open').forEach(function (other) {
          if (other !== item) {
            other.classList.remove('is-open');
            var p = other.querySelector('[data-acc-panel]');
            var b = other.querySelector('[data-acc-trigger]');
            if (p) p.style.maxHeight = null;
            if (b) b.setAttribute('aria-expanded', 'false');
          }
        });
        if (open) {
          item.classList.remove('is-open');
          panel.style.maxHeight = null;
          btn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('is-open');
          panel.style.maxHeight = panel.scrollHeight + 'px';
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ---------------------------------------------------------
     21. IMAGE SWAP (demo) — preview your own images per section
     Client-side only (FileReader). Resets on reload.
     --------------------------------------------------------- */
  function initImageSwap() {
    var imgs = document.querySelectorAll('img[data-swappable]');
    if (!imgs.length) return;
    var master = document.querySelector('[data-imgswap-toggle]');
    var on = false;

    imgs.forEach(function (img) {
      // wrap each swappable image's parent for the overlay
      var holder = img.parentElement;
      if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
      var btn = document.createElement('button');
      btn.className = 'imgswap-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Replace this image (preview)');
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Replace</span>';
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
      btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); input.click(); });
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          img.src = ev.target.result;
          img.removeAttribute('srcset');
        };
        reader.readAsDataURL(file);
      });
      holder.appendChild(btn);
      holder.appendChild(input);
      holder.classList.add('imgswap-holder');
    });

    function setOn(state) {
      on = state;
      document.body.classList.toggle('imgswap-active', on);
      if (master) {
        master.classList.toggle('is-active', on);
        var lbl = master.querySelector('[data-imgswap-label]');
        if (lbl) lbl.textContent = on ? 'Done replacing' : 'Try your images';
      }
    }
    if (master) master.addEventListener('click', function () { setOn(!on); });
  }

  /* ---------------------------------------------------------
     INIT ALL
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initReveal();
    initModals();
    initLightbox();
    initForms();
    initChoiceState();
    initEstimators();
    initFilter();
    initReadingProgress();
    initCursorGlow();
    initParticles();
    initSectorExplorer();
    initProcessTimeline();
    initHeroSlider();
    initRevealSlider();
    initInquiry();
    initCounters();
    initCustomizer();
    initThemeToggle();
    initAccordion();
    initImageSwap();
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
