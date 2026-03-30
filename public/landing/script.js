/* ==============================================
  KI-Manager LMS Landing Page : Immersive Interactions
  Vanilla JS, no dependencies
  ============================================== */

(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (v, min, max) { return Math.min(Math.max(v, min), max); };

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getCurrentLanguage() {
    var stored = localStorage.getItem('wmc_ap_lang');
    if (stored === 'en' || stored === 'de') return stored;
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'de';
  }

  function applyLanguage(lang) {
    var nextLang = lang === 'en' ? 'en' : 'de';
    document.documentElement.setAttribute('lang', nextLang);
    localStorage.setItem('wmc_ap_lang', nextLang);

    $$('[data-i18n]').forEach(function (el) {
      var text = el.getAttribute('data-' + nextLang);
      if (typeof text === 'string') {
        el.innerHTML = text;
      }
    });

    $$('[data-lang-switch]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang-switch') === nextLang);
    });
  }

  function initLanguageToggle() {
    var buttons = $$('[data-lang-switch]');
    if (!buttons.length) return;

    applyLanguage(getCurrentLanguage());

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLanguage(btn.getAttribute('data-lang-switch'));
      });
    });
  }

  /* ==============================================
     1. REVEAL ON SCROLL (re-triggering)
     ============================================== */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;

    /* Assign staggered delays to direct sibling reveal children only */
    els.forEach(function (el) {
      var parent = el.parentElement;
      if (!parent) return;
      /* Only count direct children that are .reveal : prevents deep nesting from inflating delays */
      var siblings = Array.prototype.slice.call(parent.children).filter(function (c) { return c.classList.contains('reveal'); });
      if (siblings.length > 1) {
        var idx = siblings.indexOf(el);
        if (idx > 0) {
          el.style.transitionDelay = Math.min(idx * 0.08, 0.4) + 's';
        }
      }
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
        } else {
          /* Only reset if element is above viewport (scrolled past and back up) */
          var rect = entry.boundingClientRect;
          if (rect.top > 0) {
            entry.target.classList.remove('reveal--visible');
          }
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function (el) { observer.observe(el); });
  }

  /* ==============================================
     2. COUNT-UP COUNTER (re-triggering)
     ============================================== */
  function formatNumber(num, separator) {
    if (!separator) return String(num);
    var str = String(num);
    var result = '';
    for (var i = str.length - 1, c = 0; i >= 0; i--, c++) {
      if (c > 0 && c % 3 === 0) result = separator + result;
      result = str[i] + result;
    }
    return result;
  }

  function animateCounter(el) {
    var target = parseInt(el.dataset.target, 10);
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';
    var separator = el.dataset.separator || '';
    var duration = 1600;
    var start = null;

    if (el._raf) cancelAnimationFrame(el._raf);

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      /* ease-out curve */
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(ease * target);
      el.textContent = prefix + formatNumber(current, separator) + suffix;
      if (progress < 1) {
        el._raf = requestAnimationFrame(step);
      }
    }
    el._raf = requestAnimationFrame(step);
  }

  function resetCounter(el) {
    if (el._raf) cancelAnimationFrame(el._raf);
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    el.textContent = prefix + '0' + suffix;
    el.style.minHeight = '';
  }

  function initCounters() {
    var counters = $$('[data-target]');
    if (!counters.length) return;

    /* Pre-lock dimensions via invisible clone to prevent layout shift during count-up */
    counters.forEach(function (el) {
      var suffix = el.dataset.suffix || '';
      var prefix = el.dataset.prefix || '';
      var separator = el.dataset.separator || '';
      var target = parseInt(el.dataset.target, 10);
      var finalText = prefix + formatNumber(target, separator) + suffix;
      var clone = el.cloneNode(false);
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.whiteSpace = 'nowrap';
      clone.textContent = finalText;
      el.parentNode.insertBefore(clone, el);
      el.style.minHeight = clone.scrollHeight + 'px';
      el.style.minWidth = clone.scrollWidth + 'px';
      el.style.display = 'inline-block';
      clone.remove();
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
        } else {
          resetCounter(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ==============================================
     3. NAVBAR
     ============================================== */
  function initNavbar() {
    var nav = $('#nav');
    if (!nav) return;
    var navLinks = $$('.nav-link[data-nav-section]');
    var ticking = false;

    function setActive(sectionId) {
      navLinks.forEach(function (l) {
        l.classList.toggle('nav-link--active', l.dataset.navSection === sectionId);
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        nav.classList.toggle('nav-scrolled', window.scrollY > 60);

        /* Find topmost visible section */
        var active = null;
        navLinks.forEach(function (l) {
          var sec = document.getElementById(l.dataset.navSection);
          if (!sec) return;
          var rect = sec.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.45 && rect.bottom > 0) {
            active = l.dataset.navSection;
          }
        });
        if (active) setActive(active);

        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ==============================================
     4. SMOOTH SCROLL
     ============================================== */
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 118;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  /* ==============================================
     5. FAQ ACCORDION
     ============================================== */
  function initFAQ() {
    var faqList = $('#faqList');
    if (!faqList) return;

    /* Accordion */
    faqList.addEventListener('click', function (e) {
      var button = e.target.closest('.faq-question');
      if (!button) return;

      var item = button.parentElement;
      var isOpen = item.classList.contains('faq-item--open');

      /* Close all in current panel */
      var panel = button.closest('.faq-tab-panel') || faqList;
      $$('.faq-item--open', panel).forEach(function (openItem) {
        openItem.classList.remove('faq-item--open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      /* Toggle clicked */
      if (!isOpen) {
        item.classList.add('faq-item--open');
        button.setAttribute('aria-expanded', 'true');
      }
    });

    /* Tab switching */
    $$('.faq-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-faq-tab');

        /* Update tab buttons */
        $$('.faq-tab').forEach(function (t) {
          t.classList.remove('faq-tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('faq-tab--active');
        tab.setAttribute('aria-selected', 'true');

        /* Close all open items */
        $$('.faq-item--open', faqList).forEach(function (openItem) {
          openItem.classList.remove('faq-item--open');
          openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });

        /* Switch panels */
        $$('.faq-tab-panel', faqList).forEach(function (p) {
          p.style.display = p.getAttribute('data-faq-panel') === target ? '' : 'none';
        });
      });
    });
  }

  /* ==============================================
     6. SUBTLE PARALLAX ON SCROLL
     ============================================== */

  /* ==============================================
     7. IMMERSIVE ROADMAP
     ============================================== */
  function initRoadmap() {
    var timeline = document.getElementById('roadmapTimeline');
    var svg = document.getElementById('rmSvg');
    var pathBg = document.getElementById('rmPathBg');
    var pathFill = document.getElementById('rmPathFill');
    var glow = document.getElementById('rmGlow');
    if (!timeline || !svg || !pathBg || !pathFill) return;

    var rows = $$('.rm__row', timeline);
    var ticking = false;
    var totalLen = 0;

    /* Build snake SVG path through the timeline : big smooth curves on desktop, straight on mobile */
    function buildSnakePath() {
      var lineEl = document.getElementById('rmLine');
      if (!lineEl) return;
      var h = timeline.offsetHeight;
      var isMobile = window.innerWidth < 768;
      var d, w, cx;

      if (isMobile) {
        /* Straight vertical line aligned with the 40px dot column */
        w = 40; cx = 20;
        lineEl.style.left = '0';
        lineEl.style.transform = 'none';
      } else {
        /* S-curve snake for desktop */
        w = 120; cx = w / 2;
        lineEl.style.left = '';
        lineEl.style.transform = '';
      }

      lineEl.style.width = w + 'px';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);

      if (isMobile) {
        d = 'M ' + cx + ' 0 L ' + cx + ' ' + h;
      } else {
        /* Big smooth S-curves */
        var amp = 40;
        var segH = 260;
        var segments = Math.ceil(h / segH);
        d = 'M ' + cx + ' 0';
        for (var i = 0; i < segments; i++) {
          var y0 = i * segH;
          var yEnd = Math.min(y0 + segH, h);
          var dir = (i % 2 === 0) ? 1 : -1;
          d += ' C ' + (cx + amp * dir) + ' ' + (y0 + segH * 0.25) + ', ' + (cx + amp * dir) + ' ' + (y0 + segH * 0.75) + ', ' + cx + ' ' + yEnd;
        }
      }

      pathBg.setAttribute('d', d);
      pathFill.setAttribute('d', d);

      totalLen = pathFill.getTotalLength();
      pathFill.style.strokeDasharray = totalLen;
      pathFill.style.strokeDashoffset = totalLen;

      /* Sync dot thresholds to actual path positions */
      if (totalLen > 0) {
        var timelineRect = timeline.getBoundingClientRect();
        rows.forEach(function (row) {
          var dot = row.querySelector('.rm__dot');
          if (!dot) return;
          var dotRect = dot.getBoundingClientRect();
          var dotY = dotRect.top + dotRect.height / 2 - timelineRect.top;

          /* Binary search along path for the length where path Y == dot Y */
          var lo = 0, hi = totalLen;
          for (var iter = 0; iter < 50; iter++) {
            var mid = (lo + hi) / 2;
            var pt = pathFill.getPointAtLength(mid);
            if (pt.y < dotY) lo = mid;
            else hi = mid;
          }
          row.dataset.rmProgress = ((lo + hi) / 2 / totalLen).toFixed(4);
        });
      }
    }

    buildSnakePath();
    window.addEventListener('resize', buildSnakePath);

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var rect = timeline.getBoundingClientRect();
        var vh = window.innerHeight;
        var start = rect.top - vh * 0.65;
        var end = rect.bottom - vh * 0.25;
        var range = end - start;
        var progress = range > 0 ? clamp(-start / range, 0, 1) : 0;

        /* Animate snake path fill */
        if (totalLen) {
          pathFill.style.strokeDashoffset = totalLen * (1 - progress);
        }

        /* Glow follows progress along the path */
        if (glow && totalLen) {
          var pt = pathFill.getPointAtLength(progress * totalLen);
          glow.style.top = pt.y + 'px';
          glow.style.left = pt.x + 'px';
          glow.style.opacity = (progress > 0.01 && progress < 0.92) ? '1' : '0';
        }

        rows.forEach(function (row) {
          var dot = row.querySelector('.rm__dot');
          var card = row.querySelector('.rm__card');
          var branch = row.querySelector('.rm__branch');

          /* Sync card activation with path progress */
          var rowProgress = parseFloat(row.dataset.rmProgress) || 0;
          var isActive = progress >= rowProgress;

          if (dot) dot.classList.toggle('rm__dot--active', isActive);
          if (card) card.classList.toggle('rm__card--active', isActive);
          if (branch) branch.classList.toggle('rm__branch--active', isActive);
        });

        var endDot = document.getElementById('rmEndDot');
        if (endDot) {
          endDot.classList.toggle('rm__end-marker--active', progress >= 0.92);
        }

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

    /* ==============================================
      8. HERO PARTICLES : ambient network field
      ============================================== */
  function initParticles() {
    if (prefersReduced) return;

    var canvas = document.getElementById('heroParticles');
    var hero = document.getElementById('hero');
    if (!canvas || !hero) return;

    var ctx = canvas.getContext('2d');
    var particles = [];
    var mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    var isMobile = window.innerWidth < 768;
    var count = isMobile ? 85 : 150;
    var connectDist = isMobile ? 65 : 125;
    var maxLineWidth = isMobile ? 0.12 : 0.8;
    var mouseRadius = isMobile ? 200 : 320;
    var running = true;
    var time = 0;

     /* Legacy text-formation variables remain but are neutralized so the
       background stays abstract rather than spelling template initials. */
    var apPhase = 'chaos';
    var apTimer = 0;
    var apChaosDuration = 3.0;
    var apFormDuration = 1.8;
    var apHoldDuration = 2.5;
    var apPauseDuration = 5.0;
    var apScatterDuration = 2.0;
    var apFreeDuration = 5.0;
    var textPositions = [];
    var textCenterX = 0;
    var textCenterY = 0;
    var scatterApplied = false;

    /* Particle pools for burst effect */
    var burstParticles = [];

    function resize() {
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
      /* Re-centre AP text targets whenever canvas dimensions change */
      if (particles.length > 0) assignTargets();
    }

    /* Return no text targets so particles stay abstract and never form initials. */
    function sampleTextPositions() {
      textCenterX = window.innerWidth / 2;
      textCenterY = canvas.height * 0.42;
      return [];
    }

    function create(x, y, isBurst) {
      var angle = Math.random() * Math.PI * 2;
      var speed = isBurst ? (Math.random() * 4 + 2) : (Math.random() * 0.6 + 0.1);
      var tier = Math.random();
      var size, opacity;
      if (tier < 0.15) {
        size = Math.random() * 5 + 3;
        opacity = Math.random() * 0.3 + 0.15;
      } else if (tier < 0.45) {
        size = Math.random() * 3 + 1.5;
        opacity = Math.random() * 0.5 + 0.15;
      } else {
        size = Math.random() * 1.5 + 0.5;
        opacity = Math.random() * 0.6 + 0.1;
      }
      return {
        x: x !== undefined ? x : Math.random() * canvas.width,
        y: y !== undefined ? y : Math.random() * canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        baseSize: size,
        opacity: opacity,
        baseOpacity: opacity,
        hu: Math.random() < 0.7 ? 0 : (Math.random() * 30 - 10),
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        life: isBurst ? 1 : -1,
        isBurst: !!isBurst,
        targetX: 0,
        targetY: 0,
        originX: 0,
        originY: 0,
        hasTarget: false
      };
    }

    function assignTargets() {
      textPositions = sampleTextPositions();
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (i < textPositions.length) {
          p.targetX = textPositions[i].x;
          p.targetY = textPositions[i].y;
          p.hasTarget = true;
        } else {
          p.hasTarget = false;
        }
      }
    }

    function seed() {
      resize();
      particles = [];
      textPositions = sampleTextPositions();

      for (var i = 0; i < count; i++) {
        var p = create();
        if (i < textPositions.length) {
          p.targetX = textPositions[i].x;
          p.targetY = textPositions[i].y;
          p.originX = p.x;
          p.originY = p.y;
          p.hasTarget = true;
        }
        particles.push(p);
      }

      apPhase = 'chaos';
      apTimer = 0;
      scatterApplied = false;
    }

    function spawnBurst(x, y, amount) {
      for (var i = 0; i < amount; i++) {
        burstParticles.push(create(x, y, true));
      }
    }

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function animate() {
      if (!running) return;
      time += 0.016;
      apTimer += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* â”€â”€ Phase state machine â”€â”€ */
      var apInfluence = 0;
      var isScattering = false;
      var scatterProgress = 0;

      if (apPhase === 'chaos') {
        /* 3s free chaotic floating at start */
        apInfluence = 0;
        if (apTimer >= apChaosDuration) { apPhase = 'forming'; apTimer = 0; }

      } else if (apPhase === 'forming') {
        var t = Math.min(apTimer / apFormDuration, 1);
        apInfluence = easeInOutCubic(t);
        if (t >= 1) { apPhase = 'holding'; apTimer = 0; }

      } else if (apPhase === 'holding') {
        apInfluence = 1;
        if (apTimer >= apHoldDuration) { apPhase = 'pause'; apTimer = 0; }

      } else if (apPhase === 'pause') {
        /* 5s stillness â€“ text stays fully formed */
        apInfluence = 1;
        if (apTimer >= apPauseDuration) {
          apPhase = 'scattering';
          apTimer = 0;
          scatterApplied = false;
        }

      } else if (apPhase === 'scattering') {
        /* 2s explosive outward scatter */
        isScattering = true;
        scatterProgress = Math.min(apTimer / apScatterDuration, 1);
        apInfluence = Math.max(0, 1 - easeOutQuart(scatterProgress));

        /* Apply one-time outward impulse at scatter start */
        if (!scatterApplied) {
          scatterApplied = true;
          for (var si = 0; si < particles.length; si++) {
            var sp = particles[si];
            if (!sp.hasTarget) continue;
            var sdx = sp.x - textCenterX;
            var sdy = sp.y - textCenterY;
            var sDist = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
            var scatterForce = 6 + Math.random() * 4;
            sp.vx = (sdx / sDist) * scatterForce;
            sp.vy = (sdy / sDist) * scatterForce;
          }
        }

        if (scatterProgress >= 1) { apPhase = 'free'; apTimer = 0; }

      } else if (apPhase === 'free') {
        /* 5s free floating, then restart cycle */
        apInfluence = 0;
        if (apTimer >= apFreeDuration) {
          /* Re-sample targets (in case of resize) and restart */
          assignTargets();
          apPhase = 'forming';
          apTimer = 0;
          scatterApplied = false;
        }
      }

      /* Calculate mouse speed */
      if (mouse.x > 0 && mouse.prevX > 0) {
        var mdx = mouse.x - mouse.prevX;
        var mdy = mouse.y - mouse.prevY;
        mouse.speed = Math.sqrt(mdx * mdx + mdy * mdy);
      }
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      var dynRadius = mouseRadius + Math.min(mouse.speed * 3, 200);

      /* â”€â”€ Update & draw main particles â”€â”€ */
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        /* AP text formation force */
        if (p.hasTarget && apInfluence > 0 && !isScattering) {
          var tdx = p.targetX - p.x;
          var tdy = p.targetY - p.y;
          var pullStrength = apPhase === 'forming' ? 0.10 : 0.15;
          p.vx += tdx * pullStrength * apInfluence;
          p.vy += tdy * pullStrength * apInfluence;
          var dampFactor = 0.78 + (1 - apInfluence) * 0.205;
          p.vx *= dampFactor;
          p.vy *= dampFactor;
          p.opacity = p.baseOpacity + apInfluence * 0.4;
        }

        /* Scattering: decelerate outgoing particles */
        if (isScattering) {
          p.vx *= 0.975;
          p.vy *= 0.975;
          /* Fade opacity during scatter */
          p.opacity += (p.baseOpacity - p.opacity) * 0.03;
        }

        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        p.pulse += p.pulseSpeed;
        p.size = p.baseSize * (1 + Math.sin(p.pulse) * 0.3);

        /* Mouse interaction: suppress during formation/hold/pause */
        var mouseInfluence = (apPhase === 'free' || apPhase === 'scattering' || apPhase === 'chaos') ? 1 : (1 - apInfluence * 0.95);

        if (dist < dynRadius && dist > 0) {
          var force = (dynRadius - dist) / dynRadius;
          var attract = force * 0.06 * mouseInfluence;
          var swirl = force * 0.03 * mouseInfluence;
          p.vx += dx / dist * attract - dy / dist * swirl;
          p.vy += dy / dist * attract + dx / dist * swirl;
          p.size *= (1 + force * 0.8 * mouseInfluence);
          p.opacity = Math.max(p.opacity, p.baseOpacity + force * 0.4 * mouseInfluence);
        } else if (apInfluence <= 0 && !isScattering) {
          p.opacity += (p.baseOpacity - p.opacity) * 0.05;
        }

        /* Drift: suppress during formation */
        var driftScale = 1 - apInfluence * 0.95;
        p.vx += Math.sin(time + p.pulse * 3) * 0.003 * driftScale;
        p.vy += Math.cos(time + p.pulse * 2) * 0.003 * driftScale;

        if ((!p.hasTarget || apInfluence <= 0) && !isScattering) {
          p.vx *= 0.985;
          p.vy *= 0.985;
        }
        p.x += p.vx;
        p.y += p.vy;

        /* Wrap around (only during free/scattering) */
        if (apPhase === 'free' || apPhase === 'scattering' || !p.hasTarget) {
          if (p.x < -40) p.x = canvas.width + 40;
          if (p.x > canvas.width + 40) p.x = -40;
          if (p.y < -40) p.y = canvas.height + 40;
          if (p.y > canvas.height + 40) p.y = -40;
        }

        /* Draw particle with glow */
        var r = p.hu >= 0 ? Math.min(224 + p.hu, 255) : 224;
        var g = Math.max(21 + p.hu, 0);
        var b = 21;

        if (p.size > 3) {
          var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          glow.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + (p.opacity * 0.3) + ')');
          glow.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + p.opacity + ')';
        ctx.fill();
      }

      /* Update & draw burst particles */
      for (var i = burstParticles.length - 1; i >= 0; i--) {
        var bp = burstParticles[i];
        bp.life -= 0.02;
        if (bp.life <= 0) {
          burstParticles.splice(i, 1);
          continue;
        }
        bp.vx *= 0.96;
        bp.vy *= 0.96;
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.size = bp.baseSize * bp.life;

        var alpha = bp.life * bp.baseOpacity;
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,80,80,' + alpha + ')';
        ctx.fill();
      }

      /* â”€â”€ Draw connections â”€â”€ */
      var apConnectBoost = apInfluence * 40;
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);

          var effectiveDist = connectDist;
          if (apInfluence > 0 && particles[i].hasTarget && particles[j].hasTarget) {
            effectiveDist += apConnectBoost;
          }
          var midX = (particles[i].x + particles[j].x) / 2;
          var midY = (particles[i].y + particles[j].y) / 2;
          var dmx = mouse.x - midX;
          var dmy = mouse.y - midY;
          var dMouse = Math.sqrt(dmx * dmx + dmy * dmy);
          if (dMouse < dynRadius) {
            effectiveDist = connectDist + (dynRadius - dMouse) / dynRadius * 100;
          }

          if (dist < effectiveDist) {
            var opacity = (1 - dist / effectiveDist) * 0.25;
            if (dMouse < dynRadius) {
              opacity *= (1 + (1 - dMouse / dynRadius) * 2);
            }
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(224,21,21,' + Math.min(opacity, 0.18) + ')';
            ctx.lineWidth = Math.max(0.3, (1 - dist / effectiveDist) * maxLineWidth);
            ctx.stroke();
          }
        }
      }

      /* Mouse glow */
      if (mouse.x > 0 && mouse.y > 0) {
        var glowSize = 250 + mouse.speed * 2;
        var grad1 = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, glowSize);
        grad1.addColorStop(0, 'rgba(224,21,21,.12)');
        grad1.addColorStop(0.4, 'rgba(224,21,21,.05)');
        grad1.addColorStop(1, 'rgba(224,21,21,0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(mouse.x - glowSize, mouse.y - glowSize, glowSize * 2, glowSize * 2);

        var grad2 = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 40);
        grad2.addColorStop(0, 'rgba(255,100,100,.15)');
        grad2.addColorStop(1, 'rgba(224,21,21,0)');
        ctx.fillStyle = grad2;
        ctx.fillRect(mouse.x - 40, mouse.y - 40, 80, 80);
      }

      requestAnimationFrame(animate);
    }

    var lastBurstTime = 0;
    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;

      var now = performance.now();
      if (mouse.speed > 8 && now - lastBurstTime > 80) {
        spawnBurst(mouse.x, mouse.y, Math.min(Math.floor(mouse.speed / 4), 6));
        lastBurstTime = now;
      }
    });

    hero.addEventListener('mouseleave', function () {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.speed = 0;
    });

    hero.addEventListener('click', function (e) {
      var rect = hero.getBoundingClientRect();
      spawnBurst(e.clientX - rect.left, e.clientY - rect.top, 20);
    });

    window.addEventListener('resize', resize);

    /* Defer one frame so layout is fully settled before measuring hero.offsetWidth */
    requestAnimationFrame(function () { seed(); animate(); });
  }

  /* ==============================================
     9. MAGNETIC HOVER ON BUTTONS
     ============================================== */
  function initMagneticButtons() {
    var btns = $$('.magnetic-btn');
    if (!btns.length || prefersReduced) return;

    btns.forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = 'translate(' + (x * 0.2) + 'px, ' + (y * 0.2) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate(0, 0)';
      });
    });
  }

  /* ==============================================
     10. TYPING ANIMATION IN HERO
     ============================================== */
  function initTyping() {
    var el = document.getElementById('heroTyping');
    if (!el || prefersReduced) return;

    var wordsByLang = {
      de: ['KI-Compliance', 'AI Literacy', 'Zertifizierung'],
      en: ['AI compliance', 'AI literacy', 'certification']
    };
    var wordIdx = 0;
    var charIdx = 0;
    var isDeleting = false;
    var delay = 100;

    /* Place cursor inside the typing span so it stays right next to text */
    var textNode = document.createTextNode(el.textContent);
    el.textContent = '';
    el.appendChild(textNode);
    var cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    el.appendChild(cursor);

    function tick() {
      var words = wordsByLang[getCurrentLanguage()] || wordsByLang.de;
      var current = words[wordIdx];
      if (isDeleting) {
        charIdx--;
        textNode.textContent = current.substring(0, charIdx);
        delay = 50;
      } else {
        charIdx++;
        textNode.textContent = current.substring(0, charIdx);
        delay = 80 + Math.random() * 60;
      }

      if (!isDeleting && charIdx === current.length) {
        delay = 2500;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        wordIdx = (wordIdx + 1) % words.length;
        delay = 400;
      }

      setTimeout(tick, delay);
    }

    /* Start after reveal animation completes */
    setTimeout(tick, 2000);
  }

  /* ==============================================
     11. 3D TILT ON CARDS
     ============================================== */
  function initTiltCards() {
    var cards = $$('.tilt-card');
    if (!cards.length || prefersReduced) return;

    cards.forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        /* Remove transform transition during tilt for instant response */
        card.style.transition = 'border-color .7s cubic-bezier(.16,1,.3,1), box-shadow .7s cubic-bezier(.16,1,.3,1)';
      });
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        var tiltX = (0.5 - y) * 14;
        var tiltY = (x - 0.5) * 14;
        card.style.transform = 'perspective(800px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) scale3d(1.02,1.02,1.02)';
      });
      card.addEventListener('mouseleave', function () {
        /* Restore transition for smooth spring-back */
        card.style.transition = 'border-color .7s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1), box-shadow .7s cubic-bezier(.16,1,.3,1)';
        card.style.transform = '';
      });
    });
  }

  /* ==============================================
     12. BENTO CARD MOUSE GLOW
     ============================================== */
  function initBentoGlow() {
    var cards = $$('.bento-featured');
    if (!cards.length || prefersReduced) return;

    cards.forEach(function (card) {
      var glow = document.createElement('div');
      glow.style.cssText = 'position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(255,26,26,.07),transparent 70%);pointer-events:none;opacity:0;transition:opacity .3s ease;transform:translate(-50%,-50%);z-index:0;';
      card.appendChild(glow);

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        glow.style.left = (e.clientX - rect.left) + 'px';
        glow.style.top = (e.clientY - rect.top) + 'px';
        glow.style.opacity = '1';
      });
      card.addEventListener('mouseleave', function () {
        glow.style.opacity = '0';
      });
    });
  }

  /* ==============================================
     13. SOLAR SYSTEM : Lernuniversum
     ============================================== */
  function initSolarSystem() {
    var canvas = document.getElementById('solarCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, cx, cy, sc;
    var raf = null;
    var stars = [];
    var PLANETS = [
      { abbr: 'Arch', orbitR0: 100, r0: 30, speed: 0.00035, angle: Math.PI * 0.25, active: true, _sx: 0, _sy: 0 },
      { abbr: 'Plan', orbitR0: 175, r0: 30, speed: 0.00022, angle: Math.PI * 1.6, active: false, _sx: 0, _sy: 0 },
      { abbr: 'Score', orbitR0: 250, r0: 30, speed: 0.00016, angle: Math.PI * 0.9, active: false, _sx: 0, _sy: 0 },
      { abbr: 'KI', orbitR0: 318, r0: 30, speed: 0.00011, angle: Math.PI * 2.4, active: false, _sx: 0, _sy: 0 }
    ];

    function genStars() {
      stars = [];
      var starColors = ['#ffffff', '#ffffff', '#ffffff', '#ddeeff', '#ffeedd', '#eeeeff', '#ffddee'];
      for (var i = 0; i < 260; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.1 + 0.15,
          ph: Math.random() * 6.28, sp: Math.random() * 0.5 + 0.15,
          col: starColors[Math.floor(Math.random() * starColors.length)]
        });
      }
    }

    function resize() {
      W = canvas.width = canvas.parentElement.offsetWidth;
      H = canvas.height = canvas.parentElement.offsetHeight;
      cx = W / 2; cy = H / 2;
      sc = Math.min(1, Math.min(W, H * 1.5) / 1000);
      genStars();
    }

    function frame(ts) {
      ctx.clearRect(0, 0, W, H);

      /* Stars : subtle color variation */
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var a = 0.10 + 0.50 * (0.5 + 0.5 * Math.sin(ts * 0.001 * s.sp + s.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.col;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* Sun : dramatic, large, dangerous-looking */
      var sunPulse = 0.5 + 0.5 * Math.sin(ts * 0.0012);   /* slow corona breathe */

      /* Far outer haze */
      var sh = ctx.createRadialGradient(cx, cy, 0, cx, cy, 210 * sc);
      sh.addColorStop(0, 'rgba(255,80,0,.18)'); sh.addColorStop(0.5, 'rgba(220,40,0,.07)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, cy, 210 * sc, 0, 6.2832); ctx.fill();

      /* Main corona glow */
      var sunGlowR = (120 + sunPulse * 16) * sc;
      var sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunGlowR);
      sg.addColorStop(0, 'rgba(255,180,30,.90)');
      sg.addColorStop(0.25, 'rgba(255,100,10,.55)');
      sg.addColorStop(0.6, 'rgba(200,30,0,.18)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, sunGlowR, 0, 6.2832); ctx.fill();

      /* Hot inner corona : tighter ring */
      var sc1 = ctx.createRadialGradient(cx, cy, 38 * sc, cx, cy, 80 * sc);
      sc1.addColorStop(0, 'rgba(255,220,100,.0)');
      sc1.addColorStop(0.4, 'rgba(255,200,60,.35)');
      sc1.addColorStop(0.75, 'rgba(255,140,20,.18)');
      sc1.addColorStop(1, 'rgba(255,80,0,.0)');
      ctx.fillStyle = sc1; ctx.beginPath(); ctx.arc(cx, cy, 80 * sc, 0, 6.2832); ctx.fill();

      /* Sun core : matte, no gloss */
      var coreR = 54 * sc;
      var sc2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      sc2.addColorStop(0, '#ffeeaa');      /* bright centre */
      sc2.addColorStop(0.3, '#ffb830');    /* warm yellow */
      sc2.addColorStop(0.65, '#e05500');   /* deep orange */
      sc2.addColorStop(0.88, '#a01800');   /* burnt dark */
      sc2.addColorStop(1, '#3a0500');      /* rim : near black */
      ctx.fillStyle = sc2; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, 6.2832); ctx.fill();

      /* AP label */
      var fnt = Math.max(11, Math.round(15 * sc));
      ctx.font = 'bold ' + fnt + 'px Inter,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      /* Shadow for contrast */
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6;
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.fillText('AP', cx, cy);
      ctx.shadowBlur = 0;

      /* Planets */
      for (var pi = 0; pi < PLANETS.length; pi++) {
        var p = PLANETS[pi];
        if (!p._hovered) p.angle += p.speed * 16;   /* freeze when hovered */
        var pr = p.r0 * sc;
        var maxR = Math.min(cx, cy) - pr - 6;    /* clamp so planet stays inside canvas */
        var r = Math.min(p.orbitR0 * sc, maxR);
        var px = cx + Math.cos(p.angle) * r;
        var py = cy + Math.sin(p.angle) * r;
        p._sx = px; p._sy = py;

        /* Orbit ring */
        ctx.strokeStyle = p.active ? 'rgba(255,80,80,.2)' : 'rgba(255,255,255,.07)';
        ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();
        ctx.setLineDash([]);

        if (p.active) {
          var pulse = 0.5 + 0.5 * Math.sin(ts * 0.0028);
          var gh = ctx.createRadialGradient(px, py, 0, px, py, pr * 3.2);
          gh.addColorStop(0, 'rgba(255,60,60,' + (0.4 + pulse * 0.3) + ')');
          gh.addColorStop(1, 'rgba(255,0,0,0)');
          ctx.fillStyle = gh; ctx.beginPath(); ctx.arc(px, py, pr * 3.2, 0, 6.2832); ctx.fill();
          ctx.strokeStyle = 'rgba(255,80,80,' + (0.25 + pulse * 0.55) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(px, py, pr + (3 + pulse * 5) * sc, 0, 6.2832); ctx.stroke();
        }

        /* Planet body */
        if (p.active) {
          /* Active: atmospheric red gradient + sun-direction rim-light */
          var pg = ctx.createRadialGradient(px, py, pr * 0.05, px, py, pr);
          pg.addColorStop(0, '#c01818');
          pg.addColorStop(0.55, '#7a0505');
          pg.addColorStop(1, '#180000');
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.2832); ctx.fill();

          var rimAngle = Math.atan2(py - cy, px - cx);
          var rlx = px - Math.cos(rimAngle) * pr * 0.72;
          var rly = py - Math.sin(rimAngle) * pr * 0.72;
          var rl = ctx.createRadialGradient(rlx, rly, pr * 0.05, rlx, rly, pr * 1.35);
          rl.addColorStop(0, 'rgba(255,100,60,0)');
          rl.addColorStop(0.55, 'rgba(255,100,60,0)');
          rl.addColorStop(0.78, 'rgba(255,120,60,.30)');
          rl.addColorStop(1, 'rgba(255,100,60,0)');
          ctx.save();
          ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.2832); ctx.clip();
          ctx.fillStyle = rl; ctx.fillRect(px - pr * 2, py - pr * 2, pr * 4, pr * 4);
          ctx.restore();
        } else {
          /* Inactive: clean flat outlined circle : modern minimal */
          ctx.fillStyle = 'rgba(255,255,255,.04)';
          ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.2832); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.22)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.2832); ctx.stroke();
        }

        /* Label : bold, large, clear */
        var fSize = Math.max(10, Math.round(12 * sc));
        ctx.shadowColor = 'rgba(0,0,0,.85)';
        ctx.shadowBlur = 5;
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.font = 'bold ' + fSize + 'px Inter,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.abbr, px, py);
        ctx.shadowBlur = 0;

        /* Hint */
        ctx.textBaseline = 'alphabetic';
        if (p.active) {
          ctx.fillStyle = 'rgba(255,130,130,.80)';
          ctx.font = Math.max(8, Math.round(9.5 * sc)) + 'px Inter,sans-serif';
          ctx.fillText('â†— Erkunden', px, py + pr + 16 * sc);
        } else {
          ctx.fillStyle = 'rgba(165,168,210,.88)';
          ctx.font = Math.max(8, Math.round(9.5 * sc)) + 'px Inter,sans-serif';
          ctx.fillText('bald verfÃ¼gbar', px, py + pr + 16 * sc);
        }
      }

      raf = requestAnimationFrame(frame);
    }

    canvas.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (W / rect.width);
      var my = (e.clientY - rect.top) * (H / rect.height);
      for (var pi = 0; pi < PLANETS.length; pi++) {
        var p = PLANETS[pi];
        if (!p.active) continue;
        var dx = mx - p._sx, dy = my - p._sy, hit = (p.r0 * sc + 18);
        if (dx * dx + dy * dy < hit * hit) {
          var sx = p._sx * (rect.width / W) + rect.left;
          var sy = p._sy * (rect.height / H) + rect.top;
          openGalaxy(sx, sy); break;
        }
      }
    });

    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (W / rect.width);
      var my = (e.clientY - rect.top) * (H / rect.height);
      var hover = false;
      for (var pi = 0; pi < PLANETS.length; pi++) {
        var p = PLANETS[pi];
        var dx = mx - p._sx, dy = my - p._sy, hit = (p.r0 * sc + 20);
        var isOver = dx * dx + dy * dy < hit * hit;
        p._hovered = isOver;          /* track hover per planet */
        if (p.active && isOver) hover = true;
      }
      canvas.style.cursor = hover ? 'pointer' : 'default';
    });

    resize();
    window.addEventListener('resize', function () { cancelAnimationFrame(raf); resize(); raf = requestAnimationFrame(frame); });
    raf = requestAnimationFrame(frame);
  }

  /* â”€â”€ Galaxy helpers (global scope via window) â”€â”€ */
  var _galaxyInited = false;

  window.loadD3 = function (cb) {
    if (window.d3) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
    s.onload = cb; document.head.appendChild(s);
  };

  window.openGalaxy = function (originX, originY) {
    var ov = document.getElementById('galaxyOverlay');
    function reveal() {
      ov.style.opacity = '0'; ov.classList.add('go--open');
      window.loadD3(function () {
        requestAnimationFrame(function () {
          ov.style.transition = 'opacity .4s ease'; ov.style.opacity = '1';
          if (!_galaxyInited) { window.initGalaxy(); _galaxyInited = true; }
        });
      });
    }
    /* Mobile: skip circle animation : avoids black-screen pause */
    if (window.innerWidth < 768) { reveal(); return; }
    /* Desktop: circle zoom animation */
    var zl = document.getElementById('zoomLayer');
    var circ = document.getElementById('zoomCircle');
    var diag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) * 2.4;
    circ.style.cssText = 'position:absolute;border-radius:50%;background:#040810;width:' + diag + 'px;height:' + diag + 'px;left:' + originX + 'px;top:' + originY + 'px;transform:translate(-50%,-50%) scale(0);transition:none;';
    zl.style.display = 'block';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        circ.style.transition = 'transform .72s cubic-bezier(.4,0,.2,1)';
        circ.style.transform = 'translate(-50%,-50%) scale(1)';
      });
    });
    setTimeout(function () { reveal(); zl.style.display = 'none'; }, 700);
  };

  window.closeGalaxy = function () {
    var ov = document.getElementById('galaxyOverlay');
    ov.style.opacity = '0';
    setTimeout(function () { ov.classList.remove('go--open'); ov.style.opacity = ''; }, 420);
  };

  window.galaxySearch = function (val) {
    if (!window._galaxyNode) return;
    var v = val.toLowerCase().trim();
    window._galaxyNode.style('opacity', function (d) {
      if (!v) return 1;
      return (d.label.toLowerCase().includes(v) || (d.fullLabel && d.fullLabel.toLowerCase().includes(v))) ? 1 : 0.06;
    });
  };

  window.initGalaxy = function () {
    var container = document.getElementById('galaxySvgContainer');
    var tooltip = document.getElementById('galaxyTooltip');
    if (!container || !window.GALAXY_DATA) return;
    container.innerHTML = '';
    var GW = window.innerWidth, GH = window.innerHeight;
    var data = JSON.parse(JSON.stringify(window.GALAXY_DATA));
    var nodes = data.nodes, links = data.links;

    var svg = d3.select(container).append('svg').attr('width', GW).attr('height', GH);

    /* Stars background */
    var sg = svg.append('g');
    for (var i = 0; i < 300; i++)
      sg.append('circle').attr('cx', Math.random() * GW).attr('cy', Math.random() * GH)
        .attr('r', Math.random() * 1.2 + 0.2).attr('fill', '#fff').attr('opacity', Math.random() * 0.45 + 0.08);

    /* Defs */
    var defs = svg.append('defs');
    /* LF sphere gradient : 3D look with specular highlight */
    nodes.filter(function (d) { return d.group === 'LF'; }).forEach(function (d) {
      var g = defs.append('radialGradient').attr('id', 'grd-' + d.id)
        .attr('cx', '38%').attr('cy', '30%').attr('r', '68%')
        .attr('fx', '38%').attr('fy', '26%');
      g.append('stop').attr('offset', '0%').attr('stop-color', '#ffaaaa');   /* specular */
      g.append('stop').attr('offset', '18%').attr('stop-color', '#FE0404');  /* bright */
      g.append('stop').attr('offset', '65%').attr('stop-color', '#b80303');  /* mid */
      g.append('stop').attr('offset', '100%').attr('stop-color', '#4a0000'); /* rim */
    });
    /* Comp sphere gradient */
    var cg = defs.append('radialGradient').attr('id', 'comp-grd')
      .attr('cx', '38%').attr('cy', '30%').attr('r', '65%');
    cg.append('stop').attr('offset', '0%').attr('stop-color', '#f0f0f8');
    cg.append('stop').attr('offset', '100%').attr('stop-color', '#7a7a90');
    /* UC sphere gradient */
    var ug = defs.append('radialGradient').attr('id', 'uc-grd')
      .attr('cx', '38%').attr('cy', '30%').attr('r', '65%');
    ug.append('stop').attr('offset', '0%').attr('stop-color', '#93e8ff');
    ug.append('stop').attr('offset', '100%').attr('stop-color', '#0369a1');
    /* LF glow filter */
    var filt = defs.append('filter').attr('id', 'lfglow').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    filt.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
    var feMerge = filt.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    /* Zoom */
    var zb = d3.zoom().scaleExtent([0.08, 10]).on('zoom', function (ev) { grp.attr('transform', ev.transform); });
    svg.call(zb);
    var grp = svg.append('g');

    /* Simulation : cluster=LF->UC (official), parent=Comp->UC (organizational) */
    var sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (d) { return d.id; })
        .distance(function (d) { return d.type === 'cluster' ? 95 : 38; })
        .strength(function (d) { return d.type === 'cluster' ? 0.5 : 0.65; }))
      .force('charge', d3.forceManyBody().strength(function (d) {
        return d.group === 'LF' ? -560 : d.group === 'Comp' ? -80 : -18;
      }))
      .force('center', d3.forceCenter(GW / 2, GH / 2))
      .force('collide', d3.forceCollide().radius(function (d) { return d.radius + 5; }).iterations(2))
      .alphaDecay(0.012);

    /* Links : cluster (LF->UC) in red, parent (Comp->UC) in blue-white */
    var link = grp.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', function (d) { return d.type === 'cluster' ? 'rgba(255,90,70,.32)' : 'rgba(180,210,255,.28)'; })
      .attr('stroke-width', function (d) { return d.type === 'cluster' ? 1.6 : 1.4; })
      .attr('stroke-opacity', function (d) { return d.type === 'cluster' ? .32 : .28; });

    /* Nodes : glow layer for LF */
    var nodeGlow = grp.append('g').selectAll('circle')
      .data(nodes.filter(function (d) { return d.group === 'LF'; })).join('circle')
      .attr('r', function (d) { return d.radius + 8; })
      .attr('fill', 'rgba(255,40,40,.12)')
      .attr('filter', 'url(#lfglow)')
      .attr('pointer-events', 'none');

    /* Nodes */
    var node = grp.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', function (d) { return d.radius; })
      .attr('fill', function (d) {
        if (d.group === 'LF') return 'url(#grd-' + d.id + ')';
        if (d.group === 'Comp') return 'url(#comp-grd)';
        return 'url(#uc-grd)';
      })
      .attr('stroke', function (d) {
        if (d.group === 'LF') return 'rgba(255,100,80,.45)';
        if (d.group === 'Comp') return 'rgba(255,255,255,.18)';
        return 'rgba(56,189,248,.35)';
      })
      .attr('stroke-width', function (d) { return d.group === 'LF' ? 2 : 1; })
      .style('cursor', 'pointer');

    /* Labels */
    var label = grp.append('g').selectAll('text')
      .data(nodes.filter(function (d) { return d.group !== 'UC'; })).join('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', function (d) { return d.group === 'LF' ? '15px' : '7.5px'; })
      .attr('font-weight', function (d) { return d.group === 'LF' ? '700' : '500'; })
      .attr('fill', function (d) { return d.group === 'LF' ? '#fff' : '#ff6060'; })
      .attr('pointer-events', 'none')
      .text(function (d) { return d.label; });

    /* Drag */
    var dragBeh = d3.drag()
      .on('start', function (ev, d) { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', function (ev, d) { d.fx = ev.x; d.fy = ev.y; })
      .on('end', function (ev, d) { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
    node.call(dragBeh);

    /* Full-path highlight: 2-level traversal so Compâ†’UCâ†’LF and LFâ†’UCâ†’Comp are all shown */
    function getConn(d) {
      var s = new Set([d.id]);
      /* Level 1: direct neighbors */
      links.forEach(function (l) {
        var si = typeof l.source === 'object' ? l.source.id : l.source;
        var ti = typeof l.target === 'object' ? l.target.id : l.target;
        if (si === d.id) s.add(ti);
        if (ti === d.id) s.add(si);
      });
      /* Level 2: neighbors-of-neighbors (completes the path) */
      var lvl1 = Array.from(s).filter(function (id) { return id !== d.id; });
      lvl1.forEach(function (nid) {
        links.forEach(function (l) {
          var si = typeof l.source === 'object' ? l.source.id : l.source;
          var ti = typeof l.target === 'object' ? l.target.id : l.target;
          if (si === nid) s.add(ti);
          if (ti === nid) s.add(si);
        });
      });
      return s;
    }

    /* Name dictionaries for tooltip */
    var LF_LABELS = {
      'LF1': 'Das Unternehmen und die eigene Rolle im Betrieb',
      'LF2': 'ArbeitsplÃ¤tze nach Kundenwunsch ausstatten',
      'LF3': 'Clients in Netzwerke einbinden',
      'LF4': 'Schutzbedarfsanalyse im eigenen Arbeitsbereich',
      'LF5': 'Software zur Verwaltung von Daten anpassen',
      'LF6': 'Serviceanfragen bearbeiten',
      'LF7': 'Cyber-physische Systeme ergÃ¤nzen',
      'LF8': 'Daten systemÃ¼bergreifend bereitstellen',
      'LF9': 'Netzwerke und Dienste bereitstellen',
      'LF10': 'Benutzerschnittstellen gestalten und entwickeln',
      'LF11': 'FunktionalitÃ¤t in Anwendungen realisieren',
      'LF12': 'Kundenspezifische Anwendungsentwicklung durchfÃ¼hren'
    };
    var COMP_LABELS = {
      '01': 'Planen, Vorbereiten und DurchfÃ¼hren von Arbeitsaufgaben',
      '02': 'Informieren und Beraten von Kunden',
      '03': 'Beurteilen marktgÃ¤ngiger IT-Systeme und LÃ¶sungen',
      '04': 'Entwickeln, Erstellen und Betreuen von IT-LÃ¶sungen',
      '05': 'QualitÃ¤tssichernde MaÃŸnahmen durchfÃ¼hren',
      '06': 'IT-Sicherheit und Datenschutz umsetzen',
      '07': 'Leistungen erbringen und Auftrag abschlieÃŸen',
      '08': 'IT-Systeme betreiben',
      '09': 'SoftwarelÃ¶sungen programmieren',
      '10': 'Softwareanwendungen konzipieren und umsetzen',
      '11': 'QualitÃ¤t von Softwareanwendungen sichern',
      '12': 'Vernetzt zusammenarbeiten mit digitalen Medien',
      '13': 'Kunden informieren und beraten (J2)',
      '14': 'IT-Systeme beurteilen (J2)',
      '15': 'IT-LÃ¶sungen entwickeln und betreuen (J2)',
      '16': 'QualitÃ¤tssicherung durchfÃ¼hren (J2)',
      '17': 'IT-Sicherheit und Datenschutz (J2)',
      '18': 'IT-Systeme betreiben (J2)',
      '19': 'SpeicherlÃ¶sungen in Betrieb nehmen',
      '20': 'SoftwarelÃ¶sungen programmieren (J2)',
      '21': 'Softwareanwendungen konzipieren (J2)',
      '22': 'SoftwarequalitÃ¤t sichern (J2)',
      '23': 'Berufsausbildung, Arbeits- und Tarifrecht',
      '24': 'Aufbau und Organisation des Ausbildungsbetriebes',
      '25': 'Sicherheit und Gesundheitsschutz bei der Arbeit',
      '26': 'Umweltschutz'
    };

    function doHighlight(d) {
      var conn = getConn(d);
      node.style('opacity', function (n) { return conn.has(n.id) ? 1 : 0.05; });
      nodeGlow.style('opacity', function (n) { return conn.has(n.id) ? 1 : 0.05; });
      link.attr('stroke-opacity', function (l) {
        var si = typeof l.source === 'object' ? l.source.id : l.source;
        var ti = typeof l.target === 'object' ? l.target.id : l.target;
        return (conn.has(si) && conn.has(ti)) ? 0.85 : 0.02;
      });
      label.style('opacity', function (n) { return conn.has(n.id) ? 1 : 0.08; });
    }

    function resetHighlight() {
      node.style('opacity', 1); nodeGlow.style('opacity', 1); label.style('opacity', 1);
      link.attr('stroke-opacity', function (l) { return l.type === 'cluster' ? .35 : .22; });
    }

    /* Hover + rich tooltip */
    node.on('mouseover', function (ev, d) {
      if (!compFocus) doHighlight(d);
      var color = d.group === 'LF' ? '#ff7777' : d.group === 'Comp' ? '#e2e8f0' : '#38bdf8';
      var grpName = d.group === 'LF' ? 'Ebene' : d.group === 'Comp' ? 'Komponente' : 'Use Case';
      var grpDesc = d.group === 'LF' ? 'Architekturebene: konzeptionelle Grundlage'
        : d.group === 'Comp' ? 'DomÃ¤ne: bewertet technische QualitÃ¤t'
          : 'Einzelanforderung: konkrete Umsetzungsaufgabe';
      var name = d.group === 'LF' ? (LF_LABELS[d.label] || d.label)
        : d.group === 'Comp' ? (COMP_LABELS[d.label] || d.label)
          : (d.fullLabel || d.label);
      tooltip.innerHTML =
        '<div style="color:' + color + ';font-size:.6rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px;">' + grpName + '</div>' +
        '<div style="font-weight:600;font-size:.8rem;line-height:1.35;margin-bottom:4px;">' + name + '</div>' +
        '<div style="color:#6e6e76;font-size:.7rem;">' + grpDesc + '</div>';
      tooltip.style.display = 'block';
      tooltip.style.left = (ev.clientX + 18) + 'px'; tooltip.style.top = (ev.clientY - 12) + 'px';
    })
      .on('mousemove', function (ev) {
        tooltip.style.left = (ev.clientX + 18) + 'px'; tooltip.style.top = (ev.clientY - 12) + 'px';
      })
      .on('mouseout', function () { if (!compFocus) resetHighlight(); tooltip.style.display = 'none'; });

    /* Comp-focus state : tracks which Comp is currently in focus mode */
    var compFocus = null;

    /* Build compâ†’parent-LF map via shared UC connections */
    function getCompLF(compNode) {
      /* Find UCs connected to this Comp via parent links */
      var compUCs = new Set();
      links.forEach(function (l) {
        var si = typeof l.source === 'object' ? l.source.id : l.source;
        var ti = typeof l.target === 'object' ? l.target.id : l.target;
        if ((si === compNode.id || ti === compNode.id) && l.type === 'parent') {
          if (si === compNode.id) compUCs.add(ti); else compUCs.add(si);
        }
      });
      /* Find which LF those UCs connect to via cluster links */
      var lfCounts = {};
      links.forEach(function (l) {
        var si = typeof l.source === 'object' ? l.source.id : l.source;
        var ti = typeof l.target === 'object' ? l.target.id : l.target;
        if (l.type === 'cluster') {
          if (compUCs.has(si) || compUCs.has(ti)) {
            var lfId = compUCs.has(si) ? ti : si;
            lfCounts[lfId] = (lfCounts[lfId] || 0) + 1;
          }
        }
      });
      /* Return the LF node with most shared UCs */
      var bestId = null, best = 0;
      Object.keys(lfCounts).forEach(function (id) { if (lfCounts[id] > best) { best = lfCounts[id]; bestId = id; } });
      if (!bestId) return null;
      return nodes.find(function (n) { return n.id === bestId; });
    }

    /* Get UC nodes connected to a Comp via parent links */
    function getCompUCs(compNode) {
      var ids = new Set([compNode.id]);
      links.forEach(function (l) {
        var si = typeof l.source === 'object' ? l.source.id : l.source;
        var ti = typeof l.target === 'object' ? l.target.id : l.target;
        if ((si === compNode.id || ti === compNode.id) && l.type === 'parent') {
          ids.add(si); ids.add(ti);
        }
      });
      return ids;
    }

    function enterCompFocus(d) {
      compFocus = d;
      doHighlight(d); /* same visual as hover : full 2-level path highlight */

      /* Fix comp at the LF's current position : it "takes over" the centre */
      var lf = getCompLF(d);
      if (lf) {
        d.fx = lf.x; d.fy = lf.y;
        lf.fx = null; lf.fy = null; /* release LF so it drifts away */
      } else {
        d.fx = GW / 2; d.fy = GH / 2;
      }
      sim.alpha(0.45).restart();

      /* Zoom to where the comp now sits */
      setTimeout(function () {
        var t = d3.zoomIdentity.translate(GW / 2, GH / 2).scale(3.8).translate(-d.fx, -d.fy);
        svg.transition().duration(700).call(zb.transform, t);
      }, 80);

      /* Show description panel */
      var panel = document.getElementById('compInfoPanel');
      if (panel) {
        var name = COMP_LABELS[d.label] || d.label;
        panel.innerHTML =
          '<div style="color:#a0a0b0;font-size:.58rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;margin-bottom:5px;">Komponente ' + d.label + '</div>' +
          '<div style="font-weight:700;font-size:.88rem;color:#f0f0f2;line-height:1.45;">' + name + '</div>';
        panel.classList.add('visible');
      }
    }

    function exitCompFocus() {
      if (compFocus) { compFocus.fx = null; compFocus.fy = null; }
      compFocus = null;
      resetHighlight();
      sim.alpha(0.3).restart();
      svg.transition().duration(500).call(zb.transform, d3.zoomIdentity);
      var panel = document.getElementById('compInfoPanel');
      if (panel) panel.classList.remove('visible');
    }

    window.resetGalaxy = function () {
      if (compFocus) { compFocus.fx = null; compFocus.fy = null; compFocus = null; }
      nodes.forEach(function (n) { n.fx = null; n.fy = null; });
      resetHighlight();
      tooltip.style.display = 'none';
      var panel = document.getElementById('compInfoPanel');
      if (panel) panel.classList.remove('visible');
      /* Zoom out to show all groups : fit bounding box of current node positions */
      var xs = nodes.map(function (n) { return n.x; }), ys = nodes.map(function (n) { return n.y; });
      var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
      var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
      var pad = 80;
      var s = Math.min(0.9, GW / (maxX - minX + pad * 2), GH / (maxY - minY + pad * 2));
      var tx = GW / 2 - s * (minX + maxX) / 2, ty = GH / 2 - s * (minY + maxY) / 2;
      svg.transition().duration(600).call(zb.transform, d3.zoomIdentity.translate(tx, ty).scale(s));
      sim.alpha(0.85).restart();
    };

    /* Click handler */
    function showPanel(tag, name) {
      var panel = document.getElementById('compInfoPanel');
      if (!panel) return;
      panel.innerHTML =
        '<div style="color:#a0a0b0;font-size:.58rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;margin-bottom:5px;">' + tag + '</div>' +
        '<div style="font-weight:700;font-size:.88rem;color:#f0f0f2;line-height:1.45;">' + name + '</div>';
      panel.classList.add('visible');
    }
    function hidePanel() {
      var panel = document.getElementById('compInfoPanel');
      if (panel) panel.classList.remove('visible');
    }

    node.on('click', function (ev, d) {
      ev.stopPropagation();
      tooltip.style.display = 'none';

      if (d.group === 'UC') {
        doHighlight(d);
        showPanel('Use Case', d.fullLabel || d.label);
        return;
      }

      if (d.group === 'LF') {
        if (compFocus) {
          /* LF click while Comp is focused â†’ exit focus mode */
          exitCompFocus();
        } else {
          /* Normal LF zoom */
          doHighlight(d);
          var t = d3.zoomIdentity.translate(GW / 2, GH / 2).scale(2.8).translate(-d.x, -d.y);
          svg.transition().duration(650).call(zb.transform, t);
          showPanel('Ebene ' + d.label, LF_LABELS[d.label] || d.label);
        }
      } else {
        /* Comp click */
        if (compFocus && compFocus.id === d.id) {
          exitCompFocus(); /* second click on same comp â†’ reset */
        } else {
          if (compFocus) exitCompFocus(); /* switch from another comp */
          enterCompFocus(d);
        }
      }
    });

    /* Click background â†’ reset */
    svg.on('click', function () {
      if (compFocus) exitCompFocus();
      else { resetHighlight(); tooltip.style.display = 'none'; hidePanel(); }
      svg.transition().duration(500).call(zb.transform, d3.zoomIdentity);
    });

    window._galaxyNode = node;

    /* Tick */
    sim.on('tick', function () {
      link.attr('x1', function (d) { return d.source.x; }).attr('y1', function (d) { return d.source.y; })
        .attr('x2', function (d) { return d.target.x; }).attr('y2', function (d) { return d.target.y; });
      node.attr('cx', function (d) { return d.x; }).attr('cy', function (d) { return d.y; });
      nodeGlow.attr('cx', function (d) { return d.x; }).attr('cy', function (d) { return d.y; });
      label.attr('x', function (d) { return d.x; }).attr('y', function (d) { return d.y; });
    });

    /* Gentle drift */
    setInterval(function () { sim.alpha(0.006).restart(); }, 4000);
  };

  /* ==============================================
     MOBILE MENU
     ============================================== */
  function initMobileMenu() {
    var btn = document.getElementById('navHamburger');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    function open() {
      menu.classList.add('is-open');
      btn.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      menu.classList.remove('is-open');
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function () {
      menu.classList.contains('is-open') ? close() : open();
    });

    /* Close on ESC */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    window.closeMobileMenu = close;
  }

  /* ==============================================
     INIT
     ============================================== */
  function initRagPipeline() {
    var pipeline = document.querySelector('.rag-pipeline');
    if (!pipeline) return;
    var steps = Array.prototype.slice.call(pipeline.querySelectorAll('.rag-step'));
    var stepTimers = [];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        stepTimers.forEach(function (t) { clearTimeout(t); });
        stepTimers = [];
        if (entry.isIntersecting) {
          steps.forEach(function (step, i) {
            stepTimers.push(setTimeout(function () {
              step.classList.add('rag-step--in');
            }, i * 130));
          });
        } else {
          steps.forEach(function (step) {
            step.classList.remove('rag-step--in');
          });
        }
      });
    }, { threshold: 0.25 });
    observer.observe(pipeline);
  }

  function initQuizBars() {
    var fills = document.querySelectorAll('.quiz-bar__fill[data-quiz-target]');
    if (!fills.length) return;
    var timers = [];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        /* clear any pending timers first */
        timers.forEach(function (t) { clearTimeout(t); });
        timers = [];
        if (entry.isIntersecting) {
          /* animate in with stagger */
          fills.forEach(function (fill, i) {
            timers.push(setTimeout(function () {
              fill.classList.add('animated');
            }, i * 300));
          });
        } else {
          /* reset bars so animation replays on next scroll-in */
          fills.forEach(function (fill) {
            fill.classList.remove('animated');
          });
        }
      });
    }, { threshold: 0.35 });
    var card = fills[0].closest('.hai2-card');
    if (card) observer.observe(card);
  }

  function init() {
    initLanguageToggle();
    initReveal();
    initCounters();
    initNavbar();
    initSmoothScroll();
    initFAQ();
    initRoadmap();
    initSolarSystem();
    initParticles();

    initMagneticButtons();
    initTyping();
    initTiltCards();
    initBentoGlow();
    initMobileMenu();
    initQuizBars();
    initRagPipeline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* â”€â”€ Skill Tree: View Switching â”€â”€ */
var _stCurrentView = 'st-view-overview';
var _stChainMap = { 'st-view-manual': 'chain-manual', 'st-view-ap': 'chain-ap' };

function showSkillView(viewId) {
  if (viewId === _stCurrentView) return;
  var current = document.getElementById(_stCurrentView);
  var target  = document.getElementById(viewId);
  if (!current || !target) return;

  var toDetail = (viewId !== 'st-view-overview');
  var exitX    = toDetail ? '-28px' : '28px';
  var enterX   = toDetail ?  '36px' : '-36px';

  // Exit current view
  current.style.transition = 'opacity .24s ease, transform .24s ease';
  current.style.opacity    = '0';
  current.style.transform  = 'translateX(' + exitX + ') scale(.98)';

  setTimeout(function() {
    current.style.display    = 'none';
    current.style.transform  = '';
    current.style.transition = '';

    // Prepare target
    target.style.display    = 'block';
    target.style.opacity    = '0';
    target.style.transform  = 'translateX(' + enterX + ') scale(.98)';
    target.style.transition = 'opacity .42s cubic-bezier(.22,1,.36,1), transform .42s cubic-bezier(.22,1,.36,1)';

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        target.style.opacity   = '1';
        target.style.transform = 'translateX(0) scale(1)';
      });
    });

    // Clean up after transition
    setTimeout(function() {
      target.style.transition = '';
      target.style.transform  = '';
    }, 460);

    _stCurrentView = viewId;

    if (_stChainMap[viewId]) animateChain(_stChainMap[viewId]);

    var section = document.getElementById('vergleich');
    if (section) {
      setTimeout(function() {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }, 260);
}

function animateChain(chainId) {
  var chain = document.getElementById(chainId);
  if (!chain) return;
  var items = chain.querySelectorAll('.st-chain-node, .st-arrow');
  items.forEach(function(el, i) {
    el.classList.remove('chain-node-enter');
    el.style.opacity   = '0';
    el.style.animation = 'none';
    var delay = i * 70; // tighter, snappier stagger
    setTimeout(function() {
      el.style.animation = '';
      el.style.opacity   = '';
      el.classList.add('chain-node-enter');
    }, delay);
  });
}

/* â”€â”€ TÃ¤tigkeitsnachweis: Card Entrance + Timebar + Impact Pop â”€â”€ */
(function() {
  var viewport = document.getElementById('st-viewport');
  if (!viewport) return;

  var cardsDone = false;
  var cardObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting || cardsDone) return;
      cardsDone = true;

      var manual = document.querySelector('.ov-manual');
      var apCard     = document.querySelector('.ov-ap');

      // Slide manual in from left
      if (manual) {
        manual.style.opacity    = '0';
        manual.style.transform  = 'translateX(-52px) scale(.95)';
        setTimeout(function() {
          manual.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1)';
          manual.style.opacity    = '1';
          manual.style.transform  = 'translateX(0) scale(1)';
          setTimeout(function() { manual.style.transition = manual.style.transform = ''; }, 750);
        }, 80);
      }

      // Slide AP card in from right (slight delay)
      if (apCard) {
        apCard.style.opacity    = '0';
        apCard.style.transform  = 'translateX(52px) scale(.95)';
        setTimeout(function() {
          apCard.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1)';
          apCard.style.opacity    = '1';
          apCard.style.transform  = 'translateX(0) scale(1)';
          setTimeout(function() { apCard.style.transition = apCard.style.transform = ''; }, 750);
        }, 200);
      }

      // Animate time bars
      var bars = document.querySelectorAll('.ov-timebar-fill');
      bars.forEach(function(bar) {
        var targetW = bar.dataset.barWidth || '100%';
        bar.style.width = '0';
        setTimeout(function() {
          bar.style.transition = 'width 1s cubic-bezier(.22,1,.36,1)';
          bar.style.width = targetW;
          setTimeout(function() { bar.style.transition = ''; }, 1100);
        }, 450);
      });
    });
  }, { threshold: 0.25 });

  cardObs.observe(viewport);

  // Impact bar pop-in
  var impacts = document.querySelectorAll('.st-impact');
  if (impacts.length) {
    var impactObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var nums = entry.target.querySelectorAll('.st-impact-num');
        nums.forEach(function(num, i) {
          num.style.opacity   = '0';
          num.style.animation = 'none';
          setTimeout(function() {
            num.style.animation = '';
            num.style.opacity   = '';
            num.classList.remove('impact-pop');
            void num.offsetWidth; // reflow
            num.classList.add('impact-pop');
          }, i * 130);
        });
      });
    }, { threshold: 0.5 });
    impacts.forEach(function(el) { impactObs.observe(el); });
  }

  /* ==============================================
     TEAM SECTION â€” Scroll-triggered reveal
     ============================================== */
  var teamNodes = document.querySelectorAll('.team-node');
  if (teamNodes.length) {
    var teamObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    teamNodes.forEach(function(node, i) {
      node.style.transitionDelay = (i * 0.18) + 's';
      teamObs.observe(node);
    });
  }
})();

/* â”€â”€ Ticker: rAF-basiert, kein CSS-Animation â”€â”€ */
(function () {
  var track = document.querySelector('.ticker-track');
  if (!track) return;

  var speed = 0.35;
  var pos = 0;
  var half = 0;

  function measure() {
    half = track.scrollWidth / 2;
  }

  measure();
  window.addEventListener('resize', measure);

  function step() {
    pos -= speed;
    if (pos <= -half) pos += half;
    track.style.transform = 'translate3d(' + pos + 'px,0,0)';
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
})();


