/* ==========================================================================
   منابر — أدوات الواجهة المشتركة
   دوال مساعدة: صياغة النصوص والتواريخ، النوافذ، الأدراج، التنبيهات.
   ========================================================================== */
(function (global) {
  "use strict";

  var UI = {};

  /* ------------------------------ نصوص ------------------------------ */
  UI.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  UI.initials = function (name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "؟";
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] || "") + (parts[parts.length - 1][0] || "");
  };

  /* لون ثابت للصورة الرمزية مشتق من الاسم */
  UI.avatarTone = function (seed) {
    var tones = ["", "gold", "sky", "rose"];
    var n = 0, s = String(seed || "");
    for (var i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % 997;
    return tones[n % tones.length];
  };

  UI.avatar = function (name, cls) {
    return '<span class="avatar ' + (cls || "") + " " + UI.avatarTone(name) + '">' + UI.esc(UI.initials(name)) + "</span>";
  };

  UI.num = function (n) {
    return new Intl.NumberFormat("ar-SA-u-nu-latn").format(Number(n) || 0);
  };

  UI.pluralize = function (n, one, two, many) {
    n = Number(n) || 0;
    if (n === 1) return one;
    if (n === 2) return two;
    return many;
  };

  /* ------------------------------ تواريخ ------------------------------ */
  var DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  UI.dayName = function (d) { return DAYS[UI.date(d).getDay()]; };
  UI.monthName = function (m) { return MONTHS[m]; };

  UI.date = function (v) { return v instanceof Date ? v : new Date(v + (typeof v === "string" && v.length === 10 ? "T00:00:00" : "")); };

  UI.iso = function (d) {
    d = UI.date(d);
    var m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  };

  /* ٢٠٢٦-٠٨-٠٥ ← ٥ أغسطس ٢٠٢٦ */
  UI.fmtDate = function (v, withDay) {
    if (!v) return "—";
    var d = UI.date(v);
    if (isNaN(d)) return "—";
    var s = d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
    return withDay ? DAYS[d.getDay()] + " " + s : s;
  };

  /* التاريخ الهجري (تقريبي عبر Intl، للعرض فقط) */
  UI.hijri = function (v) {
    try {
      return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-arab", {
        day: "numeric", month: "long", year: "numeric"
      }).format(UI.date(v)) ;
    } catch (e) { return ""; }
  };

  /* "١٩:٣٠" ← "٧:٣٠ م" */
  UI.fmtTime = function (t) {
    if (!t) return "—";
    var p = String(t).split(":"), h = Number(p[0]), m = p[1] || "00";
    var mer = h >= 12 ? "م" : "ص";
    var hh = h % 12; if (hh === 0) hh = 12;
    return hh + ":" + m + " " + mer;
  };

  UI.fmtDateTime = function (v) {
    var d = UI.date(v);
    if (isNaN(d)) return "—";
    return UI.fmtDate(d) + " · " + UI.fmtTime(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"));
  };

  /* "قبل ٣ أيام" */
  UI.ago = function (v) {
    var diff = (Date.now() - UI.date(v).getTime()) / 1000;
    if (diff < 60) return "الآن";
    if (diff < 3600) { var m = Math.floor(diff / 60); return "قبل " + m + " " + UI.pluralize(m, "دقيقة", "دقيقتين", "دقائق"); }
    if (diff < 86400) { var h = Math.floor(diff / 3600); return "قبل " + h + " " + UI.pluralize(h, "ساعة", "ساعتين", "ساعات"); }
    if (diff < 2592000) { var d = Math.floor(diff / 86400); return "قبل " + d + " " + UI.pluralize(d, "يوم", "يومين", "أيام"); }
    return UI.fmtDate(v);
  };

  UI.addDays = function (v, n) {
    var d = UI.date(v); var out = new Date(d.getTime()); out.setDate(out.getDate() + n); return out;
  };

  UI.startOfMonth = function (v) { var d = UI.date(v); return new Date(d.getFullYear(), d.getMonth(), 1); };

  /* ------------------------------ عام ------------------------------ */
  UI.qs = function (sel, root) { return (root || document).querySelector(sel); };
  UI.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  UI.debounce = function (fn, ms) {
    var t; return function () {
      var a = arguments, c = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 220);
    };
  };

  UI.uid = function (prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9);
  };

  UI.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { UI.toast("تم نسخ الرابط"); },
        function () { UI.toast("تعذّر النسخ", "bad"); });
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); UI.toast("تم نسخ الرابط"); } catch (e) { UI.toast("تعذّر النسخ", "bad"); }
    document.body.removeChild(ta);
  };

  /* ------------------------------ تنبيهات ------------------------------ */
  UI.toast = function (msg, kind) {
    var host = document.getElementById("toasts");
    if (!host) return;
    var ico = kind === "bad" ? "alert" : kind === "info" ? "info" : "check";
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = '<span class="t-ico">' + Icons.svg(ico) + "</span><span>" + UI.esc(msg) + "</span>";
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 320);
    }, 3200);
  };

  /* ------------------------------ نافذة ------------------------------ */
  var modalResolve = null;

  UI.modal = function (opts) {
    var host = document.getElementById("modalHost");
    var box = document.getElementById("modal");
    box.innerHTML =
      '<div class="modal-head"><h3>' + UI.esc(opts.title) + "</h3>" +
      (opts.sub ? "<p>" + UI.esc(opts.sub) + "</p>" : "") + "</div>" +
      (opts.body ? '<div class="modal-body">' + opts.body + "</div>" : "") +
      '<div class="modal-foot">' +
      '<button class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '" data-modal="ok">' + UI.esc(opts.okText || "تأكيد") + "</button>" +
      '<button class="btn btn-ghost" data-modal="cancel">' + UI.esc(opts.cancelText || "إلغاء") + "</button>" +
      "</div>";
    host.hidden = false;
    Icons.paint(box);
    var first = box.querySelector("input,select,textarea");
    if (first) setTimeout(function () { first.focus(); }, 60);

    return new Promise(function (resolve) {
      modalResolve = resolve;
    });
  };

  UI.closeModal = function (value) {
    var host = document.getElementById("modalHost");
    host.hidden = true;
    document.getElementById("modal").innerHTML = "";
    if (modalResolve) { modalResolve(value); modalResolve = null; }
  };

  /* يجمع قيم الحقول داخل النافذة قبل إغلاقها */
  UI.modalValues = function () {
    var box = document.getElementById("modal");
    var out = {};
    UI.qsa("[name]", box).forEach(function (f) {
      out[f.name] = f.type === "checkbox" ? f.checked : f.value;
    });
    return out;
  };

  UI.confirm = function (title, sub, okText, danger) {
    return UI.modal({ title: title, sub: sub, okText: okText || "تأكيد", danger: !!danger });
  };

  /* ------------------------------ درج جانبي ------------------------------ */
  UI.drawer = function (opts) {
    var host = document.getElementById("drawerHost");
    var box = document.getElementById("drawer");
    box.innerHTML =
      '<div class="drawer-head">' +
      (opts.badge || "") +
      "<div><h3>" + UI.esc(opts.title) + "</h3>" +
      (opts.sub ? '<small class="muted">' + UI.esc(opts.sub) + "</small>" : "") + "</div>" +
      '<button class="icon-btn dh-close" data-drawer="close" aria-label="إغلاق">' + Icons.svg("x") + "</button></div>" +
      '<div class="drawer-body">' + (opts.body || "") + "</div>" +
      (opts.foot ? '<div class="drawer-foot">' + opts.foot + "</div>" : "");
    host.hidden = false;
    Icons.paint(box);
    box.scrollTop = 0;
    if (typeof opts.onMount === "function") opts.onMount(box);
  };

  UI.closeDrawer = function () {
    var host = document.getElementById("drawerHost");
    host.hidden = true;
    document.getElementById("drawer").innerHTML = "";
  };

  UI.drawerOpen = function () { return !document.getElementById("drawerHost").hidden; };

  /* ------------------------------ قائمة منبثقة ------------------------------ */
  UI.popover = function (anchor, html, onPick) {
    var pop = document.getElementById("popover");
    pop.innerHTML = html;
    pop.hidden = false;
    Icons.paint(pop);
    var r = anchor.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 8);
    var left = r.left;
    if (left + w > window.innerWidth - 10) left = Math.max(10, r.right - w);
    pop.style.top = top + "px";
    pop.style.left = left + "px";
    pop._onPick = onPick || null;
  };

  UI.closePopover = function () {
    var pop = document.getElementById("popover");
    pop.hidden = true; pop.innerHTML = ""; pop._onPick = null;
  };

  /* ------------------------------ قوالب صغيرة ------------------------------ */
  UI.empty = function (icon, title, text, action) {
    return '<div class="empty"><span class="empty-ico">' + Icons.svg(icon || "inbox") + "</span>" +
      "<b>" + UI.esc(title) + "</b>" + (text ? "<p>" + UI.esc(text) + "</p>" : "") +
      (action || "") + "</div>";
  };

  UI.stat = function (o) {
    return '<article class="stat glass">' +
      '<span class="stat-ico">' + Icons.svg(o.icon) + "</span>" +
      (o.trend ? '<span class="trend ' + (o.trendDown ? "down" : "") + '">' + UI.esc(o.trend) + "</span>" : "") +
      '<b class="num">' + UI.esc(o.value) + "</b><span>" + UI.esc(o.label) + "</span></article>";
  };

  UI.field = function (o) {
    var id = o.id || UI.uid("f");
    var input;
    if (o.type === "select") {
      input = '<select class="select" id="' + id + '" name="' + o.name + '"' + (o.required ? " required" : "") + ">" +
        (o.options || []).map(function (op) {
          var v = op.value !== undefined ? op.value : op;
          var l = op.label !== undefined ? op.label : op;
          return '<option value="' + UI.esc(v) + '"' + (String(o.value) === String(v) ? " selected" : "") + ">" + UI.esc(l) + "</option>";
        }).join("") + "</select>";
    } else if (o.type === "textarea") {
      input = '<textarea class="textarea" id="' + id + '" name="' + o.name + '" placeholder="' + UI.esc(o.placeholder || "") + '"' +
        (o.required ? " required" : "") + ">" + UI.esc(o.value || "") + "</textarea>";
    } else {
      input = '<input class="input" id="' + id + '" name="' + o.name + '" type="' + (o.type || "text") + '"' +
        ' value="' + UI.esc(o.value == null ? "" : o.value) + '" placeholder="' + UI.esc(o.placeholder || "") + '"' +
        (o.min ? ' min="' + UI.esc(o.min) + '"' : "") + (o.max ? ' max="' + UI.esc(o.max) + '"' : "") +
        (o.required ? " required" : "") + " />";
    }
    return '<label class="field" for="' + id + '"><span class="field-label">' + UI.esc(o.label) + "</span>" + input +
      (o.hint ? '<span class="field-hint">' + UI.esc(o.hint) + "</span>" : "") + "</label>";
  };

  global.UI = UI;
})(window);
