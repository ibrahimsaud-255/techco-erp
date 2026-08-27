/* ============================================================================
   شريط معاينة مِنوال — يُحقن في نسخ الأعمال الحيّة
   يعطي الزائر: زر رجوع للأعمال + تبديل (الواجهة/لوحة التحكم) + هوية مِنوال.
   الاستخدام: <script src="/works/preview-bar.js" data-name="..."
              data-front="/works/x/index.html" data-dash="/works/x/dash.html"></script>
   (احذف data-front/data-dash للمواقع بلا لوحة تحكم.)
   ============================================================================ */
(function () {
  if (window.__mnwbar) return; window.__mnwbar = 1;
  var s = document.currentScript || (function(){var a=document.getElementsByTagName('script');return a[a.length-1];})();
  var name  = (s && s.getAttribute('data-name')) || '';
  var back  = (s && s.getAttribute('data-back')) || 'https://minwal.tech/works/';
  var front = (s && s.getAttribute('data-front')) || '';
  var dash  = (s && s.getAttribute('data-dash')) || '';

  var css =
  '#mnwbar{position:fixed;inset-inline:0;inset-block-end:0;z-index:2147483000;display:flex;align-items:center;gap:10px;'+
  'padding:9px 14px calc(9px + env(safe-area-inset-bottom));background:rgba(18,14,48,.94);'+
  '-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.14);'+
  'font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;direction:rtl;box-shadow:0 -10px 34px rgba(0,0,0,.34)}'+
  '#mnwbar *{box-sizing:border-box}#mnwbar a{text-decoration:none}'+
  '#mnwbar .mnw-back{display:inline-flex;align-items:center;gap:6px;color:#fff;font-size:14px;font-weight:700;'+
  'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);padding:9px 16px;border-radius:100px;white-space:nowrap;transition:.2s}'+
  '#mnwbar .mnw-back:hover{background:rgba(255,255,255,.18)}#mnwbar .mnw-back svg{width:15px;height:15px}'+
  '#mnwbar .mnw-pills{display:flex;gap:3px;margin-inline:auto;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:100px;padding:3px}'+
  '#mnwbar .mnw-pills a{font-size:13px;font-weight:700;color:rgba(255,255,255,.72);padding:8px 15px;border-radius:100px;white-space:nowrap;transition:.2s}'+
  '#mnwbar .mnw-pills a.on{background:linear-gradient(120deg,#6d43ee,#12cdbd);color:#fff;box-shadow:0 6px 16px rgba(109,67,238,.4)}'+
  '#mnwbar .mnw-brand{display:inline-flex;align-items:center;gap:8px;color:rgba(255,255,255,.85);font-size:12.5px;font-weight:600;margin-inline-start:auto;white-space:nowrap}'+
  '#mnwbar .mnw-brand img{width:26px;height:26px;display:block}'+
  '@media(max-width:560px){#mnwbar{gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom))}#mnwbar .mnw-brand span{display:none}#mnwbar .mnw-pills a{padding:8px 12px;font-size:12.5px}#mnwbar .mnw-back{padding:9px 13px}}';

  var st = document.createElement('style'); st.textContent = css; (document.head||document.documentElement).appendChild(st);

  var pills = '';
  if (front && dash) {
    var isFront = location.search.indexOf('dash=1') < 0 && location.pathname.indexOf('dashboard') < 0;
    pills = '<div class="mnw-pills">'+
      '<a href="'+front+'" class="'+(isFront?'on':'')+'">الواجهة</a>'+
      '<a href="'+dash+'" class="'+(isFront?'':'on')+'">لوحة التحكم</a></div>';
  }

  function build() {
    if (document.getElementById('mnwbar')) return;
    var bar = document.createElement('div'); bar.id = 'mnwbar';
    bar.innerHTML =
      '<a class="mnw-back" href="'+back+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg><span>الأعمال</span></a>'+
      pills+
      '<a class="mnw-brand" href="https://minwal.tech"><img src="/assets/logo-white.png" alt="مِنوال"><span>معاينة في مِنوال</span></a>';
    document.body.appendChild(bar);
    document.body.style.paddingBottom = '74px';
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
