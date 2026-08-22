/* ============================================================================
   ربط مِنوال بلوحة إبراهيم الداخلية
   • يقيس كل زيارة في site_visits (تظهر في تبويب «موقع مِنوال» باللوحة).
   • يقرأ المحتوى القابل للتعديل من site_content ويطبّقه على الصفحة الرئيسية.
   القاعدة = قاعدة اللوحة الرئيسية (rrerwhhx…) — المفتاح علني (publishable).
   ============================================================================ */
(function () {
  "use strict";
  var API = "https://rrerwhhxrjyzmnnjsfev.supabase.co/rest/v1";
  var KEY = "sb_publishable_T-ka4hy2LVRjUuf0wUH9yA_g4Emxm13";
  var RD  = { apikey: KEY, Authorization: "Bearer " + KEY };
  var WR  = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
  var SLUG = "minwal";

  /* 1) قياس الزيارة */
  function vid() {
    try {
      var k = "minwal-vid", v = localStorage.getItem(k);
      if (!v) { v = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem(k, v); }
      return v;
    } catch (e) { return "anon"; }
  }
  try {
    fetch(API + "/site_visits", {
      method: "POST", keepalive: true, headers: WR,
      body: JSON.stringify({
        slug: SLUG,
        path: location.pathname + location.hash,
        ref: document.referrer ? document.referrer.slice(0, 300) : "",
        device: matchMedia("(max-width:820px)").matches ? "mobile" : "desktop",
        visitor: vid()
      })
    })["catch"](function () {});
  } catch (e) { /* لا يعطّل الموقع أبداً */ }

  /* 2) المحتوى القابل للتعديل (الصفحة الرئيسية فقط) */
  if (!document.getElementById("cfgTitle")) return;
  fetch(API + "/site_content?slug=eq." + SLUG + "&select=data", { headers: RD })
    .then(function (r) { return r.json(); })
    .then(function (rows) { apply((rows && rows[0] && rows[0].data) || {}); })
    ["catch"](function () {});

  function setText(id, val) {
    if (val == null || val === "") return;
    var el = document.getElementById(id); if (el) el.textContent = val;
  }
  function apply(d) {
    setText("cfgPill", d.pill);
    if (d.heroTitle) {
      var h = document.getElementById("cfgTitle");
      if (h) h.innerHTML = String(d.heroTitle)
        .replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; })
        .replace(/\n/g, "<br>");
    }
    setText("cfgSub", d.heroSub);
    if (d.email) { var e = document.getElementById("cfgEmail"); if (e) e.href = "mailto:" + d.email; }
    if (d.whatsapp) { var w = document.getElementById("cfgWa"); if (w) w.href = "https://wa.me/" + String(d.whatsapp).replace(/[^0-9]/g, ""); }
    var secs = d.sections || {};
    Object.keys(secs).forEach(function (k) {
      if (secs[k] === false) {
        var s = document.getElementById(k); if (s) s.style.display = "none";
        var lnk = document.querySelector('.nav-links a[href="#' + k + '"]'); if (lnk) lnk.style.display = "none";
        if (k === "works") { var wl = document.querySelector('.nav-links a[href="./works/"]'); if (wl) wl.style.display = "none"; }
      }
    });
  }
})();
