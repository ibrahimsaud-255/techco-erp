/* التكامل المتحدة — site scripts */
(function () {
  'use strict';

  /* ---- Header state ---- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-solid', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Mobile nav ---- */
  var burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  document.querySelectorAll('.nav .has-sub > a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (window.innerWidth <= 960) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('nav-open')) return;
    if (e.target.closest('.nav') || e.target.closest('.burger')) return;
    document.body.classList.remove('nav-open');
  });

  /* ---- Hero slider ---- */
  var slides = document.querySelectorAll('.hero__slide');
  var dots = document.querySelectorAll('.hero__dots button');
  if (slides.length > 1) {
    var idx = 0, timer;
    function go(n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-on', i === idx); });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-on', i === idx);
        d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      });
    }
    function play() { timer = setInterval(function () { go(idx + 1); }, 6500); }
    function reset() { clearInterval(timer); play(); }
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); reset(); }); });
    go(0); play();
  }

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var d = parseInt(el.getAttribute('data-reveal') || '0', 10) || 0;
        setTimeout(function () { el.classList.add('in'); }, d);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Methodology steps: scroll-driven, one step at a time ---- */
  var stepsWrap = document.querySelector('.steps');
  if (stepsWrap) {
    var steps = stepsWrap.querySelectorAll('.step');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var fill = document.createElement('span');
    fill.className = 'steps__fill';
    stepsWrap.appendChild(fill);

    if (reduce) {
      steps.forEach(function (el) { el.classList.add('in'); });
      stepsWrap.style.setProperty('--fill', '100%');
    } else {
      var ticking = false;
      function onStepScroll() {
        var box = stepsWrap.getBoundingClientRect();
        var vh = window.innerHeight;
        // نقطة التفعيل: منتصف الشاشة تقريباً
        var marker = vh * 0.62;

        steps.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < marker) el.classList.add('in');
        });

        var travelled = marker - box.top;
        var pct = Math.max(0, Math.min(1, travelled / Math.max(1, box.height)));
        stepsWrap.style.setProperty('--fill', (pct * 100).toFixed(1) + '%');
        ticking = false;
      }
      function requestStepTick() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(onStepScroll);
      }
      window.addEventListener('scroll', requestStepTick, { passive: true });
      window.addEventListener('resize', requestStepTick);
      onStepScroll();
    }
  }

  /* ---- Chat-style FAQ (typing then bubble, on scroll) ---- */
  var chatRows = document.querySelectorAll('.chat__row');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (chatRows.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      chatRows.forEach(function (r) { r.classList.add('is-live', 'is-done'); });
    } else {
      var chatQueue = [], chatBusy = false;
      function runNext() {
        if (chatBusy || !chatQueue.length) return;
        chatBusy = true;
        var row = chatQueue.shift();
        var len = (row.querySelector('.bubble') || {}).textContent || '';
        var dur = Math.min(1500, Math.max(600, len.length * 7));
        row.classList.add('is-live', 'is-typing');
        setTimeout(function () {
          row.classList.remove('is-typing');
          row.classList.add('is-done');
          setTimeout(function () { chatBusy = false; runNext(); }, 260);
        }, dur);
      }
      var chatIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          chatQueue.push(en.target);
          chatIo.unobserve(en.target);
          runNext();
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.25 });
      chatRows.forEach(function (r) { chatIo.observe(r); });
    }
  }

  /* ---- Count-up ---- */
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var start = null, dur = 1600;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = target * eased;
          el.textContent = (target % 1 ? val.toFixed(1) : Math.round(val)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        co.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---- Lightbox ---- */
  var galLinks = Array.prototype.slice.call(document.querySelectorAll('[data-lb]'));
  if (galLinks.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'معرض الصور');
    lb.innerHTML =
      '<button class="lb__x" aria-label="إغلاق">&times;</button>' +
      '<button class="lb__nav prev" aria-label="السابق">&#8250;</button>' +
      '<button class="lb__nav next" aria-label="التالي">&#8249;</button>' +
      '<img alt="">';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img'), cur = 0;
    function open(i) {
      cur = (i + galLinks.length) % galLinks.length;
      lbImg.src = galLinks[cur].getAttribute('href');
      lbImg.alt = galLinks[cur].getAttribute('data-alt') || '';
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function close() { lb.classList.remove('is-open'); document.body.style.overflow = ''; }
    galLinks.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    lb.querySelector('.lb__x').addEventListener('click', close);
    lb.querySelector('.prev').addEventListener('click', function () { open(cur - 1); });
    lb.querySelector('.next').addEventListener('click', function () { open(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') open(cur - 1);
      if (e.key === 'ArrowLeft') open(cur + 1);
    });
  }

  /* ---- Contact / support form → WhatsApp ---- */
  document.querySelectorAll('form[data-wa]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lines = [];
      d.forEach(function (v, k) {
        var f = form.querySelector('[name="' + k + '"]');
        var label = f && f.dataset.label ? f.dataset.label : k;
        if (String(v).trim()) lines.push(label + ': ' + v);
      });
      var msg = 'طلب جديد من موقع التكامل المتحدة%0A%0A' + encodeURIComponent(lines.join('\n'));
      window.open('https://api.whatsapp.com/send/?phone=966500010288&text=' + msg + '&type=phone_number&app_absent=0', '_blank', 'noopener');
      form.reset();
      var ok = form.querySelector('.form-ok');
      if (ok) { ok.hidden = false; setTimeout(function () { ok.hidden = true; }, 6000); }
    });
  });

  /* ---- Current year ---- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
