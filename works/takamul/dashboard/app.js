/* =========================================================
   لوحة تحكم موقع التكامل المتحدة
   - وضع المعاينة (Demo): يحفظ في متصفحك ويصدّر content.json
   - الوضع المباشر (Live): يحفظ على الخادم ويعيد بناء الموقع
   ========================================================= */
(function () {
  'use strict';

  var LS = 'uil_dashboard_content';
  var D = null;          // البيانات الحالية
  var ORIGINAL = null;   // نسخة الملف الأصلي
  var LIVE = false;      // هل الـ API متاح؟
  var view = 'home';
  var dirty = false;

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ---------- toast ---------- */
  var tEl = $('#toast'), tTimer;
  function toast(msg, kind) {
    tEl.textContent = msg;
    tEl.className = 'toast on ' + (kind || '');
    clearTimeout(tTimer);
    tTimer = setTimeout(function () { tEl.className = 'toast ' + (kind || ''); }, 3200);
  }

  /* ---------- تحميل ---------- */
  function boot() {
    fetch('../content.json?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (json) {
        ORIGINAL = JSON.parse(JSON.stringify(json));
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
        D = saved || json;
        return fetch('api/ping').then(function (r) { return r.ok; }).catch(function () { return false; });
      })
      .then(function (live) {
        LIVE = live;
        $('#mode').textContent = live ? 'الوضع المباشر — الحفظ على الخادم' : 'وضع المعاينة — الحفظ في متصفحك';
        $('#mode').className = 'mode' + (live ? ' live' : '');
        $('#modeNote').textContent = live ? 'الوضع المباشر' : 'وضع المعاينة';
        render();
      })
      .catch(function (e) {
        $('#view').innerHTML = '<div class="empty">تعذّر تحميل ملف المحتوى <code>content.json</code>.<br>' + esc(e.message) + '</div>';
      });
  }

  /* ---------- تنقّل ---------- */
  var TITLES = {
    home: 'لوحة القيادة', settings: 'إعدادات الموقع', services: 'الخدمات',
    posts: 'المدونة', events: 'الأحداث والأنشطة', achievements: 'الإنجازات',
    clients: 'العملاء والشعارات', jobs: 'الوظائف', publish: 'النشر والتصدير'
  };
  $('#nav').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-v]');
    if (!b) return;
    view = b.dataset.v;
    document.querySelectorAll('#nav button').forEach(function (x) { x.classList.toggle('on', x === b); });
    document.body.classList.remove('nav');
    render();
  });
  $('#burger').addEventListener('click', function () { document.body.classList.toggle('nav'); });

  /* ---------- عدّادات ---------- */
  function counts() {
    ['services', 'posts', 'events', 'achievements', 'clients', 'jobs'].forEach(function (k) {
      var el = document.getElementById('c-' + k);
      if (el) el.textContent = (D[k] || []).length;
    });
  }

  /* ---------- عرض ---------- */
  function render() {
    $('#title').textContent = TITLES[view] || '';
    counts();
    var v = $('#view');
    if (view === 'home') v.innerHTML = viewHome();
    else if (view === 'settings') v.innerHTML = viewSettings();
    else if (view === 'clients') v.innerHTML = viewClients();
    else if (view === 'publish') v.innerHTML = viewPublish();
    else v.innerHTML = viewList(view);
    wire();
  }

  function viewHome() {
    var s = D.settings;
    return '' +
    '<div class="stats">' +
      stat((D.services || []).length, 'خدمة') +
      stat((D.posts || []).length, 'مقال') +
      stat((D.events || []).length, 'فعالية') +
      stat((D.achievements || []).length, 'مشروع') +
      stat((D.clients || []).length, 'عميل') +
      stat((D.jobs || []).length, 'وظيفة') +
    '</div>' +
    '<div class="panel"><h2>مرحباً بك</h2>' +
      '<p class="hint">من هنا تدير محتوى الموقع بالكامل دون الحاجة إلى مبرمج: أضف خبراً أو مشروعاً، ارفع شعار عميل جديد، انشر مقالاً، أو عدّل بيانات التواصل.</p>' +
      '<div class="bar" style="margin:0">' +
        qa('posts', 'مقال جديد') + qa('events', 'فعالية جديدة') +
        qa('achievements', 'مشروع جديد') + qa('clients', 'عميل جديد') +
      '</div>' +
    '</div>' +
    '<div class="panel"><h2>بيانات التواصل الحالية</h2>' +
      '<div class="list">' +
        row2('الهاتف الموحّد', s.phone_main) + row2('الجوال / واتساب', s.phone_mob) +
        row2('البريد الإلكتروني', s.email) + row2('العنوان', s.address) +
        row2('رابط الموقع', s.site_url) +
      '</div></div>';
  }
  function stat(n, l) { return '<div class="stat"><b>' + n + '</b><span>' + l + '</span></div>'; }
  function qa(v, l) { return '<button class="btn btn--o" data-go="' + v + '">' + l + ' +</button>'; }
  function row2(a, b) {
    return '<div class="row"><div class="row__t"><b dir="auto">' + esc(b) + '</b><span>' + a + '</span></div></div>';
  }

  /* ---------- إعدادات ---------- */
  var SET_FIELDS = [
    ['brand', 'اسم الشركة الكامل', 'text'],
    ['brand_short', 'الاسم المختصر', 'text'],
    ['site_url', 'رابط الموقع (يُستخدم في SEO وخريطة الموقع)', 'text'],
    ['phone_main', 'الهاتف الموحّد', 'text'],
    ['phone_mob', 'الجوال', 'text'],
    ['wa_number', 'رقم واتساب (بدون +)', 'text'],
    ['email', 'البريد الإلكتروني', 'text'],
    ['email_hr', 'بريد التوظيف', 'text'],
    ['address', 'العنوان', 'textarea']
  ];
  function viewSettings() {
    var s = D.settings, h = '<div class="panel"><h2>البيانات الأساسية</h2>' +
      '<p class="hint">تظهر هذه البيانات في رأس الموقع وتذييله وصفحة «اتصل بنا» وفي البيانات المنظّمة لمحركات البحث.</p><div class="grid2">';
    SET_FIELDS.forEach(function (f) {
      h += field('set_' + f[0], f[1], s[f[0]] || '', f[2], f[0] === 'address');
    });
    h += '</div></div>';
    return h;
  }

  function field(id, label, val, type, full) {
    var w = full ? ' style="grid-column:1/-1"' : '';
    if (type === 'textarea')
      return '<div class="f"' + w + '><label for="' + id + '">' + label + '</label><textarea id="' + id + '">' + esc(val) + '</textarea></div>';
    if (type === 'tall')
      return '<div class="f" style="grid-column:1/-1"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" class="tall">' + esc(val) + '</textarea></div>';
    if (type === 'rich') return richField(id, label, val);
    return '<div class="f"' + w + '><label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val) + '"></div>';
  }

  /* ---------- محرر نصوص مرئي (بدون HTML) ---------- */
  var RTE_BTNS = [
    { c: 'formatBlock', v: 'p', t: 'نص عادي', lbl: 'نص' },
    { c: 'formatBlock', v: 'h2', t: 'عنوان رئيسي', lbl: 'عنوان' },
    { c: 'formatBlock', v: 'h3', t: 'عنوان فرعي', lbl: 'فرعي' },
    { sep: 1 },
    { c: 'bold', t: 'عريض', ico: '<path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z"/>' },
    { c: 'italic', t: 'مائل', ico: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>' },
    { c: 'insertUnorderedList', t: 'قائمة نقطية', ico: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.4"/><circle cx="4.5" cy="12" r="1.4"/><circle cx="4.5" cy="18" r="1.4"/>' },
    { c: 'formatBlock', v: 'blockquote', t: 'اقتباس', ico: '<path d="M8 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3zM19 7h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3z"/><path d="M8 14c0 2-1 3-3 3M19 14c0 2-1 3-3 3"/>' },
    { sep: 1 },
    { c: 'createLink', t: 'إضافة رابط', ico: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>' },
    { c: 'unlink', t: 'إزالة الرابط', ico: '<path d="M18.8 13.6 21 11.4a5 5 0 0 0-7-7l-2.2 2.2M5.2 10.4 3 12.6a5 5 0 0 0 7 7l2.2-2.2"/><path d="m2 2 20 20"/>' },
    { sep: 1 },
    { c: 'removeFormat', t: 'إزالة التنسيق', lbl: 'تنظيف' },
    { c: 'undo', t: 'تراجع', ico: '<path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2.1-5.7L3 10"/>' }
  ];

  function richField(id, label, html) {
    var bar = RTE_BTNS.map(function (b) {
      if (b.sep) return '<span class="rte__sep"></span>';
      var inner = b.ico ? '<svg viewBox="0 0 24 24">' + b.ico + '</svg>' : b.lbl;
      return '<button type="button" title="' + b.t + '" data-cmd="' + b.c + '"' +
             (b.v ? ' data-val="' + b.v + '"' : '') + '>' + inner + '</button>';
    }).join('');
    return '<div class="f" style="grid-column:1/-1"><label>' + label + '</label>' +
      '<div class="rte" id="' + id + '_rte">' +
        '<div class="rte__bar">' + bar + '</div>' +
        '<div class="rte__area" id="' + id + '" contenteditable="true" dir="rtl" ' +
             'data-ph="اكتب المحتوى هنا… استخدم أزرار الأعلى للعناوين والقوائم">' + (html || '') + '</div>' +
        '<textarea class="rte__html" id="' + id + '_code"></textarea>' +
        '<div class="rte__foot"><span>اكتب بشكل طبيعي — التنسيق يُطبَّق تلقائياً على الموقع.</span>' +
        '<button type="button" data-toggle="' + id + '">عرض الكود (للمتقدمين)</button></div>' +
      '</div></div>';
  }

  function wireRTE(id) {
    var wrap = document.getElementById(id + '_rte');
    if (!wrap) return;
    var area = document.getElementById(id);
    var code = document.getElementById(id + '_code');

    wrap.querySelectorAll('.rte__bar button').forEach(function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () {
        area.focus();
        var cmd = b.dataset.cmd, val = b.dataset.val || null;
        if (cmd === 'createLink') {
          var url = prompt('أدخل الرابط:', 'https://');
          if (!url) return;
          val = url;
        }
        if (cmd === 'formatBlock') val = '<' + val + '>';
        try { document.execCommand(cmd, false, val); } catch (e) {}
      });
    });

    // لصق كنص عادي حتى لا يجلب تنسيقات وورد
    area.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });

    wrap.querySelector('[data-toggle]').addEventListener('click', function () {
      var isCode = wrap.classList.toggle('code');
      if (isCode) { code.value = area.innerHTML; this.textContent = 'العودة للمحرر'; }
      else { area.innerHTML = code.value; this.textContent = 'عرض الكود (للمتقدمين)'; }
    });
  }

  function readRTE(id) {
    var wrap = document.getElementById(id + '_rte');
    if (!wrap) return null;
    if (wrap.classList.contains('code')) return document.getElementById(id + '_code').value;
    return document.getElementById(id).innerHTML.trim();
  }

  /* ---------- قوائم ---------- */
  var META = {
    services: { key: 'services', label: 'خدمة', title: 'title', sub: 'nav', img: null },
    posts: { key: 'posts', label: 'مقال', title: 'title', sub: 'date', img: 'blog' },
    events: { key: 'events', label: 'فعالية', title: 'title', sub: 'meta', img: 'events' },
    achievements: { key: 'achievements', label: 'مشروع', title: 'title', sub: 'meta', img: 'achievements' },
    jobs: { key: 'jobs', label: 'وظيفة', title: 'title', sub: 'location', img: null }
  };

  function itemThumb(v, it) {
    if (v === 'posts') return '../assets/img/blog/' + it.image;
    if (v === 'events') return '../assets/img/events/' + it.slug + '/1.jpg';
    if (v === 'achievements') return '../assets/img/achievements/' + it.slug + '/1.jpg';
    return null;
  }

  function viewList(v) {
    var m = META[v], arr = D[m.key] || [];
    var h = '<div class="bar">' +
      '<input class="search" id="q" placeholder="بحث…">' +
      '<button class="btn btn--p" id="btnAdd">إضافة ' + m.label + ' +</button></div>';
    if (!arr.length) return h + '<div class="empty">لا يوجد محتوى بعد — ابدأ بإضافة ' + m.label + '.</div>';
    h += '<div class="list" id="list">';
    arr.forEach(function (it, i) {
      var th = itemThumb(v, it);
      h += '<div class="row" data-i="' + i + '">' +
        (th ? '<img class="row__thumb" src="' + th + '" alt="" onerror="this.style.visibility=\'hidden\'">' : '') +
        '<div class="row__t"><b>' + esc(it[m.title]) + '</b><span>' + esc(it[m.sub] || '') + '</span></div>' +
        '<div class="row__a">' +
          '<button class="btn btn--o btn--s" data-edit="' + i + '">تحرير</button>' +
          (i > 0 ? '<button class="btn btn--o btn--s" data-up="' + i + '">↑</button>' : '') +
        '</div></div>';
    });
    return h + '</div>';
  }

  /* ---------- العملاء ---------- */
  function viewClients() {
    var arr = D.clients || [];
    var h = '<div class="panel"><h2>شعارات العملاء</h2>' +
      '<p class="hint">تظهر في الشريط المتحرك بالصفحة الرئيسية وصفحة العملاء. يُفضّل أن يكون الشعار مربّعاً (1080×1080) وبخلفية شفافة أو بيضاء.</p>' +
      '<label class="drop" id="dropClient"><input type="file" accept="image/*" multiple>' +
        '<b>اسحب الشعارات هنا أو اضغط للاختيار</b><span>PNG أو JPG — يمكن اختيار أكثر من ملف</span></label></div>';
    h += '<div class="clients" id="clientsGrid">';
    arr.forEach(function (c, i) {
      var src = c.data || ('../assets/img/clients/' + c.file);
      h += '<div class="client"><button data-del="' + i + '" title="حذف">×</button>' +
           '<img src="' + src + '" alt="' + esc(c.name) + '" onerror="this.style.opacity=.2">' +
           '<span title="' + esc(c.name) + '">' + esc(c.name) + '</span></div>';
    });
    return h + '</div>';
  }

  /* ---------- النشر ---------- */
  function viewPublish() {
    var live = LIVE;
    return '<div class="panel"><h2>' + (live ? 'نشر التغييرات على الموقع' : 'تصدير التغييرات') + '</h2>' +
      (live
        ? '<p class="hint">اضغط «نشر» ليتم حفظ المحتوى وإعادة بناء صفحات الموقع كاملةً (‏HTML + خريطة الموقع + البيانات المنظّمة).</p>' +
          '<button class="btn btn--g" id="btnPublish">نشر وإعادة بناء الموقع</button>' +
          '<pre id="buildLog" style="margin-top:16px;background:#0d2440;color:#cfe0f2;padding:14px;border-radius:10px;font-size:12.5px;direction:ltr;text-align:left;overflow:auto;max-height:260px;display:none"></pre>'
        : '<div class="note"><b>أنت في وضع المعاينة.</b> التعديلات محفوظة في متصفحك فقط ولم تُطبَّق على ملفات الموقع بعد.<br>' +
          'لتطبيقها فعلياً: صدّر ملف <code>content.json</code> بالأسفل، ضعه في مجلد الموقع، ثم شغّل <code>python3 build.py</code>.</div>' +
          '<button class="btn btn--g" id="btnExport">تنزيل ملف content.json</button>') +
      '</div>' +
      '<div class="panel"><h2>نسخة احتياطية</h2>' +
        '<p class="hint">احتفظ بنسخة من المحتوى قبل أي تعديل كبير، ويمكنك استعادتها لاحقاً.</p>' +
        '<div class="bar" style="margin:0">' +
          '<button class="btn btn--o" id="btnExport2">تنزيل نسخة احتياطية</button>' +
          '<label class="btn btn--o" style="cursor:pointer">استيراد نسخة<input type="file" id="fileImport" accept=".json" hidden></label>' +
        '</div></div>';
  }

  /* ---------- ربط الأحداث ---------- */
  function wire() {
    // اختصارات لوحة القيادة
    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        view = b.dataset.go;
        document.querySelectorAll('#nav button').forEach(function (x) { x.classList.toggle('on', x.dataset.v === view); });
        render();
        setTimeout(function () { var a = $('#btnAdd'); if (a) a.click(); }, 60);
      });
    });

    // الإعدادات
    SET_FIELDS.forEach(function (f) {
      var el = document.getElementById('set_' + f[0]);
      if (el) el.addEventListener('input', function () { D.settings[f[0]] = el.value; markDirty(); });
    });

    // القوائم
    var add = $('#btnAdd');
    if (add) add.addEventListener('click', function () { openEditor(view, -1); });
    document.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { openEditor(view, +b.dataset.edit); });
    });
    document.querySelectorAll('[data-up]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.up, a = D[META[view].key];
        var t = a[i - 1]; a[i - 1] = a[i]; a[i] = t;
        markDirty(); render();
      });
    });
    var q = $('#q');
    if (q) q.addEventListener('input', function () {
      var t = q.value.trim();
      document.querySelectorAll('#list .row').forEach(function (r) {
        r.style.display = !t || r.textContent.indexOf(t) > -1 ? '' : 'none';
      });
    });

    // العملاء
    var drop = $('#dropClient');
    if (drop) {
      var inp = drop.querySelector('input');
      inp.addEventListener('change', function () { addClientFiles(inp.files); inp.value = ''; });
      ['dragover', 'dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.classList.toggle('over', ev === 'dragover');
          if (ev === 'drop') addClientFiles(e.dataTransfer.files);
        });
      });
    }
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('حذف هذا الشعار؟')) return;
        D.clients.splice(+b.dataset.del, 1); markDirty(); render();
      });
    });

    // النشر
    var ex = $('#btnExport'), ex2 = $('#btnExport2');
    if (ex) ex.addEventListener('click', exportJson);
    if (ex2) ex2.addEventListener('click', exportJson);
    var pub = $('#btnPublish');
    if (pub) pub.addEventListener('click', publish);
    var imp = $('#fileImport');
    if (imp) imp.addEventListener('change', function () {
      var f = imp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { D = JSON.parse(fr.result); markDirty(); render(); toast('تم استيراد النسخة', 'ok'); }
        catch (e) { toast('ملف غير صالح', 'err'); }
      };
      fr.readAsText(f);
    });
  }

  function addClientFiles(files) {
    var arr = Array.prototype.slice.call(files || []);
    if (!arr.length) return;
    var done = 0;
    arr.forEach(function (f) {
      var fr = new FileReader();
      fr.onload = function () {
        var name = f.name.replace(/\.[^.]+$/, '');
        var entry = { file: 'client-' + Date.now() + '-' + done + '.png', name: name, data: fr.result };
        if (LIVE) {
          uploadImage('clients', f).then(function (path) {
            entry.file = path.split('/').pop();
            delete entry.data;
            D.clients.push(entry); markDirty(); render();
          });
        } else {
          D.clients.push(entry); markDirty(); render();
        }
        done++;
      };
      fr.readAsDataURL(f);
    });
    toast('تمت إضافة ' + arr.length + ' شعار', 'ok');
  }

  function uploadImage(folder, file) {
    var fd = new FormData();
    fd.append('folder', folder);
    fd.append('file', file);
    return fetch('api/upload', { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) { return j.path; });
  }

  /* ---------- المحرّر ---------- */
  var EDITORS = {
    services: [
      ['title', 'عنوان الخدمة', 'text'], ['nav', 'الاسم في القائمة', 'text'],
      ['slug', 'رابط الصفحة (إنجليزي بدون مسافات)', 'text'],
      ['short', 'الوصف المختصر', 'textarea'],
      ['seo_title', 'عنوان الصفحة في جوجل', 'text'], ['seo_desc', 'الوصف الذي يظهر تحت العنوان في جوجل', 'textarea'],
      ['body_html', 'محتوى الصفحة', 'rich']
    ],
    posts: [
      ['title', 'عنوان المقال', 'text'], ['slug', 'رابط المقال (إنجليزي بدون مسافات)', 'text'],
      ['date', 'التاريخ (YYYY-MM-DD)', 'text'], ['author', 'الكاتب', 'text'],
      ['image', 'صورة الغلاف', 'image:blog'],
      ['tagsText', 'الوسوم — افصل بينها بفاصلة', 'text'],
      ['excerpt', 'المقتطف', 'textarea'],
      ['seo_title', 'عنوان الصفحة في جوجل', 'text'], ['seo_desc', 'الوصف الذي يظهر تحت العنوان في جوجل', 'textarea'],
      ['body', 'محتوى المقال', 'rich']
    ],
    events: [
      ['title', 'عنوان الفعالية', 'text'], ['slug', 'المعرّف', 'text'],
      ['meta', 'السطر العلوي (مثال: الدمام · معرض متخصص)', 'text'],
      ['city', 'المدينة', 'text'], ['n', 'عدد صور المعرض', 'text'],
      ['desc', 'الوصف المختصر', 'textarea'],
      ['bodyText', 'الفقرات (اكتب كل فقرة في سطر مستقل)', 'textarea'],
      ['pointsText', 'أبرز النقاط (كل نقطة في سطر مستقل)', 'textarea'],
      ['factsText', 'البطاقة الجانبية — اكتب: العنوان | القيمة (كل سطر بند)', 'textarea'],
      ['seo_title', 'عنوان الصفحة في جوجل', 'text'], ['seo_desc', 'الوصف الذي يظهر تحت العنوان في جوجل', 'textarea']
    ],
    jobs: [
      ['title', 'المسمى الوظيفي', 'text'], ['location', 'الموقع', 'text'],
      ['type', 'نوع الدوام', 'text'], ['desc', 'الوصف', 'textarea']
    ]
  };
  EDITORS.achievements = EDITORS.events;

  var editing = { v: null, i: -1 };

  function openEditor(v, i) {
    var m = META[v], arr = D[m.key], isNew = i < 0;
    var it = isNew ? blank(v) : JSON.parse(JSON.stringify(arr[i]));

    // تحويل المصفوفات إلى نص
    if (it.tags) it.tagsText = it.tags.join('، ');
    if (it.body && Array.isArray(it.body)) it.bodyText = it.body.join('\n');
    if (it.points) it.pointsText = it.points.join('\n');
    if (it.facts) it.factsText = it.facts.map(function (f) { return f[0] + ' | ' + f[1]; }).join('\n');

    editing = { v: v, i: i };
    $('#mTitle').textContent = (isNew ? 'إضافة ' : 'تحرير ') + m.label;
    $('#mDelete').style.display = isNew ? 'none' : '';

    var h = '<div class="grid2">';
    EDITORS[v].forEach(function (f) {
      var full = f[2] === 'tall' || f[2] === 'textarea' || f[2] === 'rich' || f[0] === 'title';
      if (f[2].indexOf('image:') === 0) {
        var folder = f[2].split(':')[1];
        var src = it.dataImage || ('../assets/img/' + folder + '/' + (it[f[0]] || ''));
        h += '<div class="f" style="grid-column:1/-1"><label>' + f[1] + '</label>' +
             '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
             '<img id="imgPrev" src="' + src + '" style="width:132px;height:99px;object-fit:cover;border-radius:9px;border:1px solid #e3e9f0" onerror="this.style.opacity=.15">' +
             '<label class="btn btn--o" style="cursor:pointer">رفع صورة جديدة<input type="file" id="imgFile" accept="image/*" hidden></label>' +
             '<input id="m_' + f[0] + '" value="' + esc(it[f[0]] || '') + '" style="flex:1;min-width:180px">' +
             '</div></div>';
      } else {
        h += field('m_' + f[0], f[1], it[f[0]] || '', f[2], full);
      }
    });
    h += '</div>';
    $('#mBody').innerHTML = h;
    $('#modal').classList.add('open');
    EDITORS[v].forEach(function (f) { if (f[2] === 'rich') wireRTE('m_' + f[0]); });

    var fi = document.getElementById('imgFile');
    if (fi) fi.addEventListener('change', function () {
      var f = fi.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        document.getElementById('imgPrev').src = fr.result;
        document.getElementById('imgPrev').style.opacity = 1;
        if (LIVE) {
          uploadImage('blog', f).then(function (p) {
            document.getElementById('m_image').value = p.split('/').pop();
            toast('تم رفع الصورة', 'ok');
          });
        } else {
          document.getElementById('m_image').value = f.name;
          editing.dataImage = fr.result;
          toast('في وضع المعاينة تُعرض الصورة مؤقتاً فقط');
        }
      };
      fr.readAsDataURL(f);
    });
  }

  function blank(v) {
    if (v === 'posts') return { slug: 'new-post-' + Date.now(), title: '', date: new Date().toISOString().slice(0, 10), author: 'فريق التكامل المتحدة', image: '', tags: [], excerpt: '', body: '', seo_title: '', seo_desc: '' };
    if (v === 'jobs') return { title: '', location: 'الرياض', type: 'دوام كامل', desc: '' };
    if (v === 'services') return { slug: 'new-service-' + Date.now(), title: '', nav: '', icon: 'box', short: '', seo_title: '', seo_desc: '', body_html: '' };
    return { slug: 'new-' + Date.now(), title: '', meta: '', city: '', n: 1, desc: '', body: [], points: [], facts: [], seo_title: '', seo_desc: '' };
  }

  $('#mSave').addEventListener('click', function () {
    var v = editing.v, m = META[v], arr = D[m.key];
    var it = editing.i < 0 ? blank(v) : arr[editing.i];
    EDITORS[v].forEach(function (f) {
      if (f[2] === 'rich') {
        var html = readRTE('m_' + f[0]);
        if (html != null) it[f[0]] = html;
        return;
      }
      var el = document.getElementById('m_' + f[0]);
      if (!el) return;
      it[f[0]] = el.value;
    });
    // إعادة تحويل النصوص إلى مصفوفات
    if (it.tagsText != null) { it.tags = it.tagsText.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean); delete it.tagsText; }
    if (it.bodyText != null) { it.body = it.bodyText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); delete it.bodyText; }
    if (it.pointsText != null) { it.points = it.pointsText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); delete it.pointsText; }
    if (it.factsText != null) {
      it.facts = it.factsText.split('\n').map(function (s) {
        var p = s.split('|'); return p.length > 1 ? [p[0].trim(), p.slice(1).join('|').trim()] : null;
      }).filter(Boolean);
      delete it.factsText;
    }
    if (it.n != null) it.n = parseInt(it.n, 10) || 1;
    if (editing.dataImage) { it.dataImage = editing.dataImage; delete editing.dataImage; }
    if (editing.i < 0) arr.unshift(it);
    closeModal(); markDirty(); render();
    toast('تم الحفظ في المسودة — لا تنسَ الضغط على «حفظ التغييرات»', 'ok');
  });

  $('#mDelete').addEventListener('click', function () {
    if (!confirm('تأكيد الحذف؟')) return;
    D[META[editing.v].key].splice(editing.i, 1);
    closeModal(); markDirty(); render();
  });
  $('#mClose').addEventListener('click', closeModal);
  $('#mCancel').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', function (e) { if (e.target === $('#modal')) closeModal(); });
  function closeModal() { $('#modal').classList.remove('open'); }

  /* ---------- حفظ / نشر ---------- */
  function markDirty() { dirty = true; $('#btnSave').classList.add('btn--g'); }

  $('#btnSave').addEventListener('click', function () {
    localStorage.setItem(LS, JSON.stringify(D));
    if (LIVE) {
      fetch('api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(D) })
        .then(function (r) { return r.json(); })
        .then(function () { toast('تم الحفظ على الخادم — اضغط «نشر» لتحديث الموقع', 'ok'); })
        .catch(function () { toast('تعذّر الحفظ على الخادم', 'err'); });
    } else {
      toast('تم الحفظ في متصفحك — استخدم «النشر والتصدير» لتطبيقه على الموقع', 'ok');
    }
    dirty = false; $('#btnSave').classList.remove('btn--g');
  });

  $('#btnReset').addEventListener('click', function () {
    if (!confirm('استعادة المحتوى الأصلي وإلغاء كل التعديلات غير المنشورة؟')) return;
    localStorage.removeItem(LS);
    D = JSON.parse(JSON.stringify(ORIGINAL));
    dirty = false; render(); toast('تمت الاستعادة', 'ok');
  });

  function exportJson() {
    var blob = new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('تم تنزيل الملف', 'ok');
  }

  function publish() {
    var log = $('#buildLog');
    log.style.display = 'block';
    log.textContent = '⏳ جارٍ الحفظ وإعادة البناء…';
    fetch('api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(D) })
      .then(function () { return fetch('api/build', { method: 'POST' }); })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        log.textContent = j.output || 'تم';
        toast(j.ok ? 'تم نشر الموقع بنجاح' : 'حدث خطأ أثناء البناء', j.ok ? 'ok' : 'err');
      })
      .catch(function (e) { log.textContent = String(e); toast('تعذّر النشر', 'err'); });
  }

  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault(); e.returnValue = '';
  });

  boot();
})();
