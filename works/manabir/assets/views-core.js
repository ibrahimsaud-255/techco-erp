/* ==========================================================================
   منابر — الواجهات الأساسية
   لوحة المعلومات · التقويم · نموذج التقديم العام · قطع مشتركة
   ========================================================================== */
(function (global) {
  "use strict";

  var V = global.Views || {};

  /* ============================ قطع مشتركة ============================ */

  V.statusBadge = function (status) {
    return '<span class="status ' + status + '">' + UI.esc(Store.statusName(status)) + "</span>";
  };

  /* مسار الطلب (خطوات) */
  V.pipeline = function (req) {
    var cur = (SEED.STATUS[req.status] || {}).step;
    var bad = ["rejected", "canceled"].indexOf(req.status) > -1;
    return '<div class="steps">' + SEED.PIPELINE.map(function (s, i) {
      var step = i + 1;
      var cls = "";
      if (bad && step > (req.timeline || []).length - 1) cls = "";
      if (!bad && cur > step) cls = "done";
      else if (!bad && cur === step) cls = "on";
      if (bad && step === 2) cls = "bad";
      return '<div class="step ' + cls + '"><span class="bead"></span><b>' + UI.esc(s.label) + "</b><small>" + UI.esc(s.sub) + "</small></div>";
    }).join("") + "</div>";
  };

  /* صف طلب في قائمة */
  V.reqRow = function (r, opts) {
    opts = opts || {};
    return '<div class="list-row clickable" data-req="' + r.id + '">' +
      '<span class="stat-ico" style="width:36px;height:36px;margin:0">' + Icons.svg(Store.typeIcon(r.type)) + "</span>" +
      '<div class="lr-body"><b>' + UI.esc(r.title) + "</b>" +
      "<small>" + UI.esc(Store.mosqueName(r.mosqueId)) + " · " + UI.esc(Store.preacherName(r.preacherId)) +
      (opts.hideDate ? "" : " · " + UI.fmtDate(r.date)) + "</small></div>" +
      '<div class="lr-end">' + V.statusBadge(r.status) +
      (opts.time ? '<div class="small muted nowrap" style="margin-top:4px">' + UI.fmtTime(r.start) + "</div>" : "") +
      "</div></div>";
  };

  /* مخطط أعمدة بسيط */
  V.bars = function (data, alt) {
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    return '<div class="bars">' + data.map(function (d) {
      var h = Math.max(4, Math.round((d.value / max) * 118));
      return '<div class="bar-col"><span class="bv num">' + UI.num(d.value) + "</span>" +
        '<span class="bar ' + (alt ? "alt" : "") + '" style="height:' + h + 'px"></span>' +
        "<small>" + UI.esc(d.label) + "</small></div>";
    }).join("") + "</div>";
  };

  /* قائمة ترتيب (أكثر المساجد/الدعاة نشاطاً) */
  V.rankList = function (rows, icon) {
    if (!rows.length) return UI.empty("chart", "لا توجد بيانات بعد", "");
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }));
    return '<div class="stack" style="gap:11px">' + rows.map(function (r) {
      return '<div><div class="row" style="gap:8px;margin-bottom:5px">' +
        '<span class="muted" style="display:flex">' + Icons.svg(icon, 15) + "</span>" +
        '<b class="small">' + UI.esc(r.name) + "</b>" +
        '<span class="spacer"></span><span class="small muted num">' + UI.num(r.value) + " نشاط</span></div>" +
        '<div class="meter"><i style="width:' + Math.round((r.value / max) * 100) + '%"></i></div></div>';
    }).join("") + "</div>";
  };

  /* ============================ لوحة المعلومات ============================ */

  V.dashboard = function () {
    var me = Store.me();
    var role = me.role;
    if (role === "preacher") return dashPreacher(me);
    if (role === "mosque") return dashMosque(me);
    if (role === "ministry") return dashMinistry();
    return dashAdmin(me);
  };

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 17) return "طاب يومك";
    return "مساء الخير";
  }

  function head(title, sub, actions) {
    return '<header class="page-head"><div><h2>' + UI.esc(title) + "</h2>" +
      (sub ? "<p>" + UI.esc(sub) + "</p>" : "") + "</div>" +
      (actions ? '<div class="page-act">' + actions + "</div>" : "") + "</header>";
  }
  V.head = head;

  /* --- مدير النظام / الموظف الإداري --- */
  function dashAdmin(me) {
    var s = Store.stats();
    var latest = Store.filter({}).slice(0, 6);
    var soon = Store.upcoming(14).slice(0, 6);

    return head(greeting() + "، " + me.name.split(" ")[0], "ملخّص حركة المنصة اليوم " + UI.fmtDate(new Date(), true) + " — " + UI.hijri(new Date()),
      (Store.can("create") ? '<button class="btn btn-primary" data-go="#/requests/new">' + Icons.svg("plus") + "طلب جديد</button>" : "") +
      '<button class="btn" data-go="#/calendar">' + Icons.svg("calendar") + "التقويم</button>") +

      '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.stat({ icon: "requests", value: UI.num(s.open), label: "طلبات قيد الإجراء" }) +
      UI.stat({ icon: "shield", value: UI.num(s.ministry), label: "بانتظار اعتماد الوزارة" }) +
      UI.stat({ icon: "calendar", value: UI.num(s.upcoming), label: "أنشطة قادمة معتمدة" }) +
      UI.stat({ icon: "mosque", value: UI.num(s.activeMosques) + "/" + UI.num(s.mosques), label: "مساجد نشطة" }) +
      "</div>" +

      '<div class="grid g-side">' +
      '<section class="card glass"><div class="card-head"><h3>حركة الأنشطة — آخر ٦ أشهر</h3>' +
      '<span class="card-act"><span class="chip teal">' + Icons.svg("chart") + UI.num(s.done) + " نشاط منفَّذ</span></span></div>" +
      V.bars(Store.monthly()) + "</section>" +

      '<section class="card glass"><div class="card-head"><h3>مسار الطلبات</h3></div>' +
      '<div class="stack" style="gap:12px">' +
      pipeStat("قيد المراجعة الإدارية", s.review, s.total, "") +
      pipeStat("مرفوع للوزارة", s.ministry, s.total, "gold") +
      pipeStat("معتمد ومجدول", s.approved, s.total, "") +
      pipeStat("مرفوض / ملغى", s.rejected, s.total, "rose") +
      "</div></section>" +
      "</div>" +

      '<div class="grid g-2" style="margin-top:14px">' +
      '<section class="card glass card-pad-0"><div class="card-head" style="padding:16px 18px 0;margin:0"><h3>أحدث الطلبات</h3>' +
      '<span class="card-act"><button class="btn btn-sm btn-ghost" data-go="#/requests">الكل' + Icons.svg("chevronLeft") + "</button></span></div>" +
      '<div class="list" style="margin-top:10px">' + (latest.length ? latest.map(function (r) { return V.reqRow(r); }).join("") : UI.empty("inbox", "لا توجد طلبات", "")) + "</div></section>" +

      '<section class="card glass card-pad-0"><div class="card-head" style="padding:16px 18px 0;margin:0"><h3>الأنشطة القادمة</h3>' +
      '<span class="card-act"><button class="btn btn-sm btn-ghost" data-go="#/calendar">التقويم' + Icons.svg("chevronLeft") + "</button></span></div>" +
      '<div class="list" style="margin-top:10px">' + (soon.length ? soon.map(function (r) { return V.reqRow(r, { time: true }); }).join("") : UI.empty("calendar", "لا توجد أنشطة قادمة", "")) + "</div></section>" +
      "</div>" +

      '<div class="grid g-2" style="margin-top:14px">' +
      '<section class="card glass"><div class="card-head"><h3>أكثر المساجد نشاطاً</h3></div>' + V.rankList(Store.topMosques(5), "mosque") + "</section>" +
      '<section class="card glass"><div class="card-head"><h3>أكثر الدعاة نشاطاً</h3></div>' + V.rankList(Store.topPreachers(5), "mic") + "</section>" +
      "</div>";
  }

  function pipeStat(label, n, total, tone) {
    var pct = total ? Math.round((n / total) * 100) : 0;
    return '<div><div class="row" style="gap:8px;margin-bottom:5px"><b class="small">' + UI.esc(label) + "</b>" +
      '<span class="spacer"></span><span class="small muted num">' + UI.num(n) + "</span></div>" +
      '<div class="meter ' + (tone || "") + '"><i style="width:' + pct + '%"></i></div></div>';
  }

  /* --- الوزارة --- */
  function dashMinistry() {
    var s = Store.stats();
    var queue = Store.filter({ status: "ministry", asc: true });
    var recent = Store.filter({ status: "approved" }).slice(0, 5);

    return head("لوحة الاعتماد", "الطلبات المرفوعة من الإدارة بانتظار الاعتماد النهائي",
      '<button class="btn" data-go="#/approvals">' + Icons.svg("shield") + "قائمة الاعتماد</button>") +

      '<div class="grid g-3" style="margin-bottom:14px">' +
      UI.stat({ icon: "shield", value: UI.num(queue.length), label: "بانتظار اعتمادك" }) +
      UI.stat({ icon: "checkCircle", value: UI.num(s.approved), label: "معتمد وقائم" }) +
      UI.stat({ icon: "users", value: UI.num(s.attendance), label: "إجمالي الحضور المسجَّل" }) +
      "</div>" +

      '<section class="card glass card-pad-0"><div class="card-head" style="padding:16px 18px 0;margin:0"><h3>بانتظار الاعتماد</h3>' +
      '<span class="card-act"><span class="chip gold">' + UI.num(queue.length) + " طلب</span></span></div>" +
      '<div class="list" style="margin-top:10px">' +
      (queue.length ? queue.map(function (r) { return V.reqRow(r); }).join("")
        : UI.empty("checkCircle", "لا يوجد ما ينتظر الاعتماد", "كل الطلبات المرفوعة تمت معالجتها.")) +
      "</div></section>" +

      '<section class="card glass card-pad-0" style="margin-top:14px"><div class="card-head" style="padding:16px 18px 0;margin:0"><h3>آخر ما اعتُمد</h3></div>' +
      '<div class="list" style="margin-top:10px">' + (recent.length ? recent.map(function (r) { return V.reqRow(r); }).join("") : UI.empty("shield", "لا يوجد", "")) + "</div></section>";
  }

  /* --- الداعية --- */
  function dashPreacher(me) {
    var p = Store.preacher(me.preacherId) || {};
    var mine = Store.scopedRequests();
    var next = Store.upcoming(90)[0];
    var s = Store.stats();
    var expiring = p.licenseExpiry && (UI.date(p.licenseExpiry) - Date.now()) / 86400000 < 60;

    return head("أهلاً " + me.name.split(" ")[1] || me.name, "متابعة طلباتك وجدولك في المساجد",
      '<button class="btn btn-primary" data-go="#/requests/new">' + Icons.svg("plus") + "تقديم طلب جديد</button>") +

      (next ? '<section class="card glass" style="margin-bottom:14px;border-color:var(--accent)">' +
        '<div class="card-head"><span class="chip teal">' + Icons.svg("calendar") + "نشاطك القادم</span>" +
        '<span class="card-act">' + V.statusBadge(next.status) + "</span></div>" +
        '<h3 style="font-size:19px;margin-bottom:6px">' + UI.esc(next.title) + "</h3>" +
        '<div class="row small muted" style="gap:14px">' +
        '<span class="row" style="gap:5px">' + Icons.svg("mosque", 15) + UI.esc(Store.mosqueName(next.mosqueId)) + "</span>" +
        '<span class="row" style="gap:5px">' + Icons.svg("calendar", 15) + UI.fmtDate(next.date, true) + "</span>" +
        '<span class="row" style="gap:5px">' + Icons.svg("clock", 15) + UI.fmtTime(next.start) + " — " + UI.fmtTime(next.end) + "</span>" +
        (next.approvalNo ? '<span class="row" style="gap:5px">' + Icons.svg("shield", 15) + UI.esc(next.approvalNo) + "</span>" : "") +
        "</div>" +
        '<div class="row" style="margin-top:14px"><button class="btn btn-sm" data-req="' + next.id + '">' + Icons.svg("eye") + "تفاصيل الطلب</button></div>" +
        "</section>" : "") +

      '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.stat({ icon: "requests", value: UI.num(mine.length), label: "إجمالي طلباتي" }) +
      UI.stat({ icon: "clock", value: UI.num(s.open), label: "قيد الإجراء" }) +
      UI.stat({ icon: "checkCircle", value: UI.num(s.approved), label: "معتمدة" }) +
      UI.stat({ icon: "star", value: (p.rating || "—"), label: "تقييم الأداء" }) +
      "</div>" +

      (expiring ? '<section class="card glass" style="margin-bottom:14px"><div class="row" style="gap:12px">' +
        '<span class="stat-ico" style="margin:0;background:var(--amber-50);color:var(--amber-600)">' + Icons.svg("alert") + "</span>" +
        "<div><b>تصريحك يقارب الانتهاء</b><div class=\"small muted\">رقم التصريح " + UI.esc(p.license || "—") +
        " — ينتهي في " + UI.fmtDate(p.licenseExpiry) + ". يُنصح بتجديده قبل تقديم طلبات جديدة.</div></div></div></section>" : "") +

      '<section class="card glass card-pad-0"><div class="card-head" style="padding:16px 18px 0;margin:0"><h3>طلباتي</h3>' +
      '<span class="card-act"><button class="btn btn-sm btn-ghost" data-go="#/my-requests">الكل' + Icons.svg("chevronLeft") + "</button></span></div>" +
      '<div class="list" style="margin-top:10px">' +
      (mine.length ? mine.slice(0, 8).map(function (r) { return V.reqRow(r); }).join("")
        : UI.empty("inbox", "لم تقدّم أي طلب بعد", "ابدأ بتقديم طلب نشاط في أحد المساجد.",
          '<button class="btn btn-primary btn-sm" data-go="#/requests/new">تقديم طلب</button>')) +
      "</div></section>";
  }

  /* --- مشرف المسجد --- */
  function dashMosque(me) {
    var m = Store.mosque(me.mosqueId) || {};
    var list = Store.scopedRequests();
    var today = UI.iso(new Date());
    var upcoming = list.filter(function (r) {
      return r.date >= today && ["approved", "scheduled"].indexOf(r.status) > -1;
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var pending = list.filter(function (r) { return ["submitted", "admin_review", "ministry"].indexOf(r.status) > -1; });

    return head(m.name || "المسجد", "متابعة الأنشطة المعتمدة والمجدولة في مسجدك",
      '<button class="btn" data-go="#/calendar">' + Icons.svg("calendar") + "تقويم المسجد</button>") +

      '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.stat({ icon: "calendar", value: UI.num(upcoming.length), label: "أنشطة قادمة" }) +
      UI.stat({ icon: "clock", value: UI.num(pending.length), label: "طلبات قيد الإجراء" }) +
      UI.stat({ icon: "users", value: UI.num(m.capacity || 0), label: "الطاقة الاستيعابية" }) +
      UI.stat({ icon: "checkCircle", value: UI.num(list.filter(function (r) { return r.status === "done"; }).length), label: "أنشطة منفَّذة" }) +
      "</div>" +

      '<section class="card glass card-pad-0"><div class="card-head" style="padding:16px 18px 0;margin:0"><h3>الأنشطة القادمة في ' + UI.esc(m.name || "") + "</h3></div>" +
      '<div class="list" style="margin-top:10px">' +
      (upcoming.length ? upcoming.map(function (r) { return V.reqRow(r, { time: true }); }).join("")
        : UI.empty("calendar", "لا توجد أنشطة مجدولة", "سيظهر هنا كل نشاط معتمد في مسجدك.")) +
      "</div></section>" +

      '<section class="card glass" style="margin-top:14px"><div class="card-head"><h3>بيانات المسجد</h3></div>' +
      '<div class="grid g-2" style="gap:10px">' +
      kv("الحي", m.district) + kv("العنوان", m.address) + kv("الإمام", m.imam) +
      kv("المشرف", m.supervisor) + kv("الجوال", m.phone) + kv("الحالة", m.status) +
      "</div>" +
      '<div class="row" style="margin-top:12px">' + (m.facilities || []).map(function (f) {
        return '<span class="chip">' + Icons.svg("check") + UI.esc(f) + "</span>";
      }).join("") + "</div></section>";
  }

  function kv(k, v) {
    return '<div><div class="small muted">' + UI.esc(k) + '</div><div style="font-weight:600">' + UI.esc(v || "—") + "</div></div>";
  }
  V.kv = kv;

  /* ============================ التقويم ============================ */

  V.calendar = function (params) {
    var st = V.calendar.state = V.calendar.state || { month: null, mosqueId: "" };
    if (!st.month) st.month = UI.startOfMonth(new Date());
    if (params && params.month) st.month = new Date(params.month);

    var first = UI.startOfMonth(st.month);
    var startPad = first.getDay();
    var days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    var todayIso = UI.iso(new Date());

    var cells = [];
    for (var i = 0; i < startPad; i++) {
      var d = UI.addDays(first, i - startPad);
      cells.push({ date: UI.iso(d), out: true });
    }
    for (var j = 1; j <= days; j++) {
      cells.push({ date: UI.iso(new Date(first.getFullYear(), first.getMonth(), j)), out: false });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: UI.iso(UI.addDays(new Date(first.getFullYear(), first.getMonth(), days), cells.length - startPad - days + 1)), out: true });
    }

    var dayHeads = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    var monthEvents = 0;
    var grid = cells.map(function (c) {
      var evs = Store.onDate(c.date, st.mosqueId);
      if (!c.out) monthEvents += evs.length;
      var d = UI.date(c.date);
      return '<div class="cal-cell' + (c.out ? " out" : "") + (c.date === todayIso ? " today" : "") + '" data-day="' + c.date + '">' +
        '<div class="cal-day num">' + d.getDate() + (evs.length > 2 ? ' <small>+' + (evs.length - 2) + "</small>" : "") + "</div>" +
        '<div class="cal-evs">' + evs.slice(0, 2).map(function (r) {
          var cls = ["approved", "scheduled", "done"].indexOf(r.status) > -1 ? "" : "pend";
          return '<div class="cal-ev ' + cls + '" title="' + UI.esc(r.title) + '">' +
            UI.esc(UI.fmtTime(r.start).replace(" ", "")) + " " + UI.esc(r.title) + "</div>";
        }).join("") + "</div></div>";
    }).join("");

    var mosqueOptions = [{ value: "", label: "كل المساجد" }].concat(Store.db.mosques.map(function (m) {
      return { value: m.id, label: m.name };
    }));

    return V.head("التقويم", "توزيع الأنشطة على المساجد — " + UI.num(monthEvents) + " نشاط هذا الشهر",
      '<button class="btn btn-sm" data-cal="prev">' + Icons.svg("chevronRight") + "</button>" +
      '<button class="btn btn-sm" data-cal="today">اليوم</button>' +
      '<button class="btn btn-sm" data-cal="next">' + Icons.svg("chevronLeft") + "</button>") +

      '<section class="card glass">' +
      '<div class="card-head"><h3>' + UI.monthName(first.getMonth()) + " " + first.getFullYear() + "</h3>" +
      '<span class="card-sub">' + UI.hijri(first) + "</span>" +
      '<span class="card-act"><select class="select" id="calMosque" style="min-height:36px;max-width:210px">' +
      mosqueOptions.map(function (o) {
        return '<option value="' + o.value + '"' + (st.mosqueId === o.value ? " selected" : "") + ">" + UI.esc(o.label) + "</option>";
      }).join("") + "</select></span></div>" +

      '<div class="cal">' + dayHeads.map(function (d) { return '<div class="cal-h">' + d + "</div>"; }).join("") + grid + "</div>" +

      '<div class="row small muted" style="margin-top:14px;gap:16px">' +
      '<span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:var(--teal-500);display:block"></i>معتمد / منفَّذ</span>' +
      '<span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:var(--amber-500);display:block"></i>قيد الإجراء</span>' +
      "</div></section>";
  };

  V.calendar.mount = function (root) {
    var sel = root.querySelector("#calMosque");
    if (sel) sel.addEventListener("change", function () {
      V.calendar.state.mosqueId = sel.value;
      App.render();
    });

    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cal]");
      if (btn) {
        var st = V.calendar.state;
        var k = btn.getAttribute("data-cal");
        if (k === "prev") st.month = new Date(st.month.getFullYear(), st.month.getMonth() - 1, 1);
        if (k === "next") st.month = new Date(st.month.getFullYear(), st.month.getMonth() + 1, 1);
        if (k === "today") st.month = UI.startOfMonth(new Date());
        App.render();
        return;
      }
      var cell = e.target.closest("[data-day]");
      if (cell) V.dayDrawer(cell.getAttribute("data-day"));
    });
  };

  /* درج اليوم */
  V.dayDrawer = function (date) {
    var st = V.calendar.state || {};
    var evs = Store.onDate(date, st.mosqueId);
    var free = Store.db.mosques.filter(function (m) {
      return m.status === "نشط" && !Store.onDate(date).some(function (r) { return r.mosqueId === m.id; });
    });

    UI.drawer({
      title: UI.fmtDate(date, true),
      sub: UI.hijri(date),
      body:
        '<div class="stack">' +
        '<section><div class="card-head"><h3>الأنشطة (' + UI.num(evs.length) + ")</h3></div>" +
        (evs.length ? '<div class="list glass card card-pad-0">' + evs.map(function (r) { return V.reqRow(r, { hideDate: true, time: true }); }).join("") + "</div>"
          : UI.empty("calendar", "لا توجد أنشطة في هذا اليوم", "")) + "</section>" +
        (Store.role() === "preacher" || Store.role() === "mosque" ? "" :
          '<section><div class="card-head"><h3>مساجد متاحة (' + UI.num(free.length) + ")</h3></div>" +
          '<div class="row">' + free.slice(0, 12).map(function (m) {
            return '<span class="chip teal">' + Icons.svg("mosque") + UI.esc(m.name) + "</span>";
          }).join("") + "</div></section>") +
        "</div>",
      foot: Store.can("create") ? '<button class="btn btn-primary" data-go="#/requests/new?date=' + date + '">' + Icons.svg("plus") + "طلب نشاط في هذا اليوم</button>" : ""
    });
  };

  /* ============================ نموذج التقديم العام ============================ */

  V.apply = function (params) {
    var token = (params && params.t) || "";
    var inv = token ? Store.invite(token) : null;
    var mosques = Store.db.mosques.filter(function (m) { return m.status === "نشط"; });
    var preachers = Store.db.preachers.filter(function (p) { return p.status === "معتمد"; });

    return '<div style="max-width:760px;margin-inline:auto">' +
      V.head("تقديم طلب نشاط دعوي", inv ? ("دعوة خاصة باسم: " + (inv.name || "—")) : "املأ البيانات وسيصل الطلب إلى الإدارة للمراجعة ثم الاعتماد") +

      '<section class="card glass"><form id="applyForm" class="stack">' +
      '<div class="grid g-2">' +
      UI.field({ label: "اسم مقدّم الطلب", name: "guestName", value: inv ? inv.name : "", required: true, placeholder: "الاسم الثلاثي" }) +
      UI.field({ label: "رقم الجوال", name: "guestPhone", value: inv ? inv.phone : "", required: true, placeholder: "05XXXXXXXX" }) +
      "</div>" +
      UI.field({ label: "الداعية / الإمام المسجّل (إن وُجد)", name: "preacherId", type: "select", options: [{ value: "", label: "— غير مسجّل بعد —" }].concat(preachers.map(function (p) { return { value: p.id, label: p.name }; })) }) +
      '<div class="grid g-2">' +
      UI.field({ label: "نوع النشاط", name: "type", type: "select", options: SEED.ACTIVITY_TYPES.map(function (t) { return { value: t.key, label: t.name }; }) }) +
      UI.field({ label: "الفئة المستهدفة", name: "audience", type: "select", options: SEED.AUDIENCES }) +
      "</div>" +
      UI.field({ label: "عنوان النشاط", name: "title", required: true, placeholder: "مثال: محاضرة بعنوان أثر الصلاة في حياة المسلم" }) +
      UI.field({ label: "المسجد", name: "mosqueId", type: "select", value: inv ? inv.mosqueId : "", required: true, options: mosques.map(function (m) { return { value: m.id, label: m.name + " — " + m.district }; }) }) +
      '<div class="grid g-3">' +
      UI.field({ label: "التاريخ", name: "date", type: "date", required: true, value: UI.iso(UI.addDays(new Date(), 7)) }) +
      UI.field({ label: "من", name: "start", type: "time", value: "20:00", required: true }) +
      UI.field({ label: "إلى", name: "end", type: "time", value: "21:00", required: true }) +
      "</div>" +
      '<div class="grid g-2">' +
      UI.field({ label: "الحضور المتوقع", name: "expected", type: "number", value: 100 }) +
      UI.field({ label: "عدد الجلسات (للدورات)", name: "sessions", type: "number", value: 1 }) +
      "</div>" +
      UI.field({ label: "ملاحظات واحتياجات", name: "notes", type: "textarea", placeholder: "مثال: يلزم مكبر صوت وشاشة عرض، ويفضّل بعد صلاة العشاء." }) +
      '<div id="applyMsg"></div>' +
      '<div class="row" style="gap:9px"><button class="btn btn-primary" type="submit">' + Icons.svg("send") + "إرسال الطلب</button>" +
      '<button class="btn btn-ghost" type="button" data-go="#/login">عودة لتسجيل الدخول</button></div>' +
      "</form></section></div>";
  };

  V.apply.mount = function (root) {
    var form = root.querySelector("#applyForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = {};
      UI.qsa("[name]", form).forEach(function (f) { d[f.name] = f.value; });

      if (d.start >= d.end) { UI.toast("وقت النهاية يجب أن يكون بعد البداية", "bad"); return; }
      var lead = (UI.date(d.date) - Date.now()) / 86400000;
      if (lead < Store.db.settings.minLeadDays) {
        UI.toast("يجب تقديم الطلب قبل " + Store.db.settings.minLeadDays + " أيام على الأقل من موعد النشاط", "bad");
        return;
      }
      var conflict = Store.conflicts(d.mosqueId, d.date, d.start, d.end);
      if (conflict.length) {
        UI.toast("المسجد محجوز في هذا الوقت: " + conflict[0].title, "bad");
        return;
      }

      var req = Store.createRequest(d, true);
      root.querySelector("#applyMsg").innerHTML =
        '<div class="card glass" style="border-color:var(--accent)"><div class="row" style="gap:12px">' +
        '<span class="stat-ico" style="margin:0">' + Icons.svg("checkCircle") + "</span>" +
        '<div><b>تم استلام طلبك</b><div class="small muted">رقم الطلب <b class="num">' + req.id +
        "</b> — يمكنك متابعته عبر الإدارة. سيصلك إشعار عند الاعتماد.</div></div></div></div>";
      form.querySelector('button[type="submit"]').disabled = true;
      UI.toast("تم إرسال الطلب بنجاح");
      root.querySelector("#applyMsg").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  /* ============================ المكتب (شبكة التطبيقات) ============================ */

  /* تعريف التطبيقات: المفتاح، الاسم، الأيقونة، اللون، والوجهة */
  var APPS = [
    { view: "dashboard", name: "لوحة المعلومات", icon: "gauge", tone: "ic-teal", go: "#/dashboard" },
    { view: "requests", name: "الطلبات", icon: "requests", tone: "ic-blue", go: "#/requests", badge: "open" },
    { view: "my-requests", name: "طلباتي", icon: "requests", tone: "ic-blue", go: "#/my-requests", badge: "open" },
    { view: "requests", name: "طلب جديد", icon: "plus", tone: "ic-green", go: "#/requests/new", cap: "create" },
    { view: "approvals", name: "الاعتمادات", icon: "shield", tone: "ic-gold", go: "#/approvals", badge: "ministry" },
    { view: "calendar", name: "التقويم", icon: "calendar", tone: "ic-rose", go: "#/calendar" },
    { view: "mosque-schedule", name: "جدول المسجد", icon: "calendar", tone: "ic-rose", go: "#/mosque-schedule" },
    { view: "mosques", name: "المساجد", icon: "mosque", tone: "ic-cyan", go: "#/mosques" },
    { view: "preachers", name: "الدعاة والأئمة", icon: "users", tone: "ic-violet", go: "#/preachers" },
    { view: "reports", name: "التقارير", icon: "chart", tone: "ic-orange", go: "#/reports" },
    { view: "users", name: "المستخدمون", icon: "key", tone: "ic-slate", go: "#/users" },
    { view: "guide", name: "شرح المنصة", icon: "book", tone: "ic-green", go: "#/guide" },
    { view: "apply", name: "رابط التقديم", icon: "link", tone: "ic-gold", go: "#/apply" },
    { view: "settings", name: "الإعدادات", icon: "sliders", tone: "ic-slate", go: "#/settings" }
  ];

  V.desk = function () {
    var me = Store.me();
    var allowed = SEED.PERMISSIONS[me.role].views;
    var counts = {
      open: Store.filter({ status: "open" }).length,
      ministry: Store.filter({ status: "ministry" }).length
    };
    var s = Store.stats();
    var next = Store.upcoming(30)[0];

    var apps = APPS.filter(function (a) {
      if (a.view === "guide" || a.view === "apply") return true;
      if (a.cap && !Store.can(a.cap)) return false;
      return allowed.indexOf(a.view) > -1;
    });

    return V.head("المكتب", "كل أقسام المنصة في مكان واحد — اختر قسماً للدخول إليه") +

      '<section class="card glass desk" style="margin-bottom:14px">' +
      '<div class="desk-apps">' + apps.map(function (a) {
        var n = a.badge ? counts[a.badge] : 0;
        return '<button class="app-tile" data-go="' + a.go + '">' +
          '<span class="app-ico-wrap"><span class="app-ico ' + a.tone + '">' + Icons.svg(a.icon) + "</span>" +
          (n ? '<span class="app-badge num">' + UI.num(n) + "</span>" : "") + "</span>" +
          "<span>" + UI.esc(a.name) + "</span></button>";
      }).join("") + "</div></section>" +

      '<div class="grid g-4">' +
      UI.stat({ icon: "requests", value: UI.num(s.open), label: "طلبات قيد الإجراء" }) +
      UI.stat({ icon: "shield", value: UI.num(s.ministry), label: "بانتظار الاعتماد" }) +
      UI.stat({ icon: "calendar", value: UI.num(s.upcoming), label: "أنشطة قادمة" }) +
      UI.stat({ icon: "mosque", value: UI.num(s.activeMosques), label: "مساجد نشطة" }) +
      "</div>" +

      (next ? '<section class="card glass" style="margin-top:14px"><div class="card-head">' +
        '<span class="stat-ico" style="margin:0">' + Icons.svg("calendar") + "</span>" +
        "<h3>أقرب نشاط</h3>" +
        '<span class="card-act">' + V.statusBadge(next.status) + "</span></div>" +
        '<div class="list card-pad-0">' + V.reqRow(next, { time: true }) + "</div></section>" : "");
  };

  /* ============================ مركز الشرح ============================ */

  V.guide = function () {
    var cfg = (window.MANABIR_CONFIG && window.MANABIR_CONFIG.guideVideos) || {};
    var st = V.guide.state = V.guide.state || { mode: window.innerWidth < 820 ? "mobile" : "desktop" };
    var src = st.mode === "mobile" ? (cfg.mobile || "") : (cfg.desktop || "");
    var role = Store.role();

    var steps = {
      admin: [
        "راجع لوحة المعلومات لمعرفة الطلبات الجديدة وما ينتظر الاعتماد.",
        "افتح الطلب، تحقّق من الداعية والمسجد والموعد، ثم ابدأ المراجعة الإدارية.",
        "ارفع الطلب للوزارة، وبعد اعتماده يصدر رقم اعتماد ويُطبع خطاب رسمي.",
        "أضف المساجد والدعاة من الأدلة، وأدر صلاحيات الفريق من شاشة المستخدمين."
      ],
      staff: [
        "افتح شاشة الطلبات وابدأ بالطلبات الجديدة (قيد الإجراء).",
        "تأكد من توفّر المسجد في التقويم وعدم تعارض الموعد.",
        "ابدأ المراجعة ثم ارفع الطلب للوزارة، أو أعده لمقدّمه مع ذكر السبب.",
        "أرسل رابط تقديم للداعية الجديد ليقدّم طلبه مباشرة دون حساب."
      ],
      ministry: [
        "افتح قائمة الاعتماد لترى الطلبات المرفوعة من الإدارة.",
        "راجع بيانات الداعية وتصريحه وموعد النشاط.",
        "اعتمد الطلب ليصدر رقم اعتماد رسمي تلقائياً، أو ارفضه مع ذكر السبب.",
        "اطبع خطاب الاعتماد أو احفظه PDF من زر الخطاب."
      ],
      preacher: [
        "اضغط «تقديم طلب جديد» واختر نوع النشاط والمسجد والموعد.",
        "النظام يخبرك فوراً إن كان المسجد متاحاً أو محجوزاً.",
        "تابع حالة الطلب من «طلباتي» — ستصلك إشعارات عند كل خطوة.",
        "بعد الاعتماد اطبع الخطاب، وبعد التنفيذ ارفع تقرير الحضور."
      ],
      mosque: [
        "شاشة «جدول المسجد» تعرض كل نشاط معتمد في مسجدك.",
        "افتح النشاط لمعرفة الداعية والموعد والاحتياجات المطلوبة.",
        "أكّد جاهزية المسجد ليعلم المنظّمون أن كل شيء مهيّأ.",
        "التقويم يعرض الأيام المشغولة والمتاحة."
      ]
    }[role] || [];

    return '<div style="max-width:1000px;margin-inline:auto">' +
      V.head("شرح المنصة", "مقطع تعريفي مختصر يشرح طريقة العمل خطوة بخطوة",
        '<div class="seg">' +
        '<button data-gm="desktop" class="' + (st.mode === "desktop" ? "on" : "") + '">عرض الكمبيوتر</button>' +
        '<button data-gm="mobile" class="' + (st.mode === "mobile" ? "on" : "") + '">عرض الجوال</button>' +
        "</div>") +

      '<section class="card glass" style="margin-bottom:14px">' +
      '<div class="video-frame ' + (st.mode === "mobile" ? "vertical" : "") + '" id="videoFrame">' +
      (src
        ? '<video id="guideVideo" controls playsinline preload="metadata"' + (cfg.poster ? ' poster="' + UI.esc(cfg.poster) + '"' : "") +
          ' src="' + UI.esc(src) + '">متصفحك لا يدعم تشغيل الفيديو.</video>'
        : videoPlaceholder(st.mode)) +
      "</div>" +
      '<div class="row small muted" style="margin-top:12px;gap:14px">' +
      '<span class="row" style="gap:6px">' + Icons.svg("info", 15) + (st.mode === "mobile" ? "مقطع عمودي (٩:١٦) مناسب للجوال" : "مقطع أفقي (١٦:٩) مناسب للشاشات الكبيرة") + "</span>" +
      "</div></section>" +

      '<div class="grid g-side">' +
      '<section class="card glass"><div class="card-head">' +
      '<span class="stat-ico" style="margin:0">' + Icons.svg("book") + "</span>" +
      "<h3>البداية السريعة — " + UI.esc(Store.roleInfo(role).name) + "</h3></div>" +
      '<div class="timeline">' + steps.map(function (s, i) {
        return '<div class="tl-item"><b>الخطوة ' + UI.num(i + 1) + "</b><small>" + UI.esc(s) + "</small></div>";
      }).join("") + "</div></section>" +

      '<section class="card glass"><div class="card-head">' +
      '<span class="stat-ico" style="margin:0">' + Icons.svg("info") + "</span><h3>أسئلة متكرّرة</h3></div>" +
      '<div class="stack" style="gap:12px">' +
      faq("كم يستغرق اعتماد الطلب؟", "تعتمد المدة على مراجعة الإدارة ثم الوزارة، ويظهر لك مسار الطلب وحالته لحظة بلحظة.") +
      faq("كيف أعرف أن المسجد متاح؟", "عند اختيار المسجد والموعد يظهر تنبيه فوري بالتوفّر أو التعارض، والتقويم يعرض كل الأيام.") +
      faq("هل يمكن التقديم بدون حساب؟", "نعم، عبر رابط التقديم العام الذي ترسله الإدارة للداعية.") +
      faq("أين أجد خطاب الاعتماد؟", "من داخل الطلب بعد اعتماده، زر «خطاب الاعتماد» ثم طباعة أو حفظ PDF.") +
      "</div></section></div></div>";
  };

  function faq(q, a) {
    return '<div><b class="small" style="display:block">' + UI.esc(q) + "</b>" +
      '<span class="small muted">' + UI.esc(a) + "</span></div>";
  }

  /* بطاقة توضح مكان رفع المقطع قبل توفّره */
  function videoPlaceholder(mode) {
    var file = mode === "mobile" ? "guide-mobile.mp4" : "guide-desktop.mp4";
    return '<div class="video-empty"><span class="empty-ico">' + Icons.svg("mic") + "</span>" +
      "<b>مكان المقطع التعريفي</b>" +
      "<p>ضع ملف الفيديو باسم <code>" + file + "</code> داخل مجلد <code>media</code> وسيظهر هنا مباشرة." +
      (mode === "mobile" ? " المقاس المقترح ١٠٨٠×١٩٢٠ (٩:١٦)." : " المقاس المقترح ١٩٢٠×١٠٨٠ (١٦:٩).") +
      "</p></div>";
  }

  V.guide.mount = function (root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-gm]");
      if (!b) return;
      V.guide.state.mode = b.getAttribute("data-gm");
      App.render();
    });

    /* إن لم يكن الملف مرفوعاً بعد، تُعرض بطاقة الإرشاد بدل مشغّل فارغ */
    var v = root.querySelector("#guideVideo");
    if (!v) return;

    function fallback() {
      var frame = root.querySelector("#videoFrame");
      if (!frame || !frame.querySelector("video")) return;
      frame.innerHTML = videoPlaceholder(V.guide.state.mode);
      Icons.paint(frame);
    }

    v.addEventListener("error", fallback, true);
    /* بعض المتصفحات تُطلق الخطأ قبل ربط المستمع، فنتحقق من الحالة أيضاً */
    setTimeout(function () {
      if (v.error || (v.networkState === 3 && v.readyState === 0)) fallback();
    }, 900);
  };

  global.Views = V;
})(window);
