/* ==========================================================================
   منابر — الطلبات
   القائمة والفلاتر · تفاصيل الطلب وإجراءاته · نموذج طلب جديد · خطاب الاعتماد
   ========================================================================== */
(function (global) {
  "use strict";

  var V = global.Views;

  /* ============================ قائمة الطلبات ============================ */

  V.requests = function (params) {
    var st = V.requests.state = V.requests.state || { status: "all", type: "", mosqueId: "", q: "", view: "table" };
    if (params && params.status) st.status = params.status;

    var mine = Store.role() === "preacher";
    var rows = Store.filter(st);
    var counts = {
      all: Store.scopedRequests().length,
      open: Store.filter({ status: "open" }).length,
      ministry: Store.filter({ status: "ministry" }).length,
      active: Store.filter({ status: "active" }).length,
      done: Store.filter({ status: "done" }).length,
      rejected: Store.filter({ status: "rejected" }).length
    };

    var tabs = [
      { k: "all", n: "الكل", c: counts.all },
      { k: "open", n: "قيد الإجراء", c: counts.open },
      { k: "ministry", n: "لدى الوزارة", c: counts.ministry },
      { k: "active", n: "معتمدة", c: counts.active },
      { k: "done", n: "منفَّذة", c: counts.done },
      { k: "rejected", n: "مرفوضة", c: counts.rejected }
    ];

    return V.head(mine ? "طلباتي" : "الطلبات", (mine ? "متابعة حالة طلباتك" : "كل طلبات الأنشطة الدعوية") + " — " + UI.num(rows.length) + " نتيجة",
      (Store.can("create") ? '<button class="btn btn-primary" data-go="#/requests/new">' + Icons.svg("plus") + "طلب جديد</button>" : "") +
      (Store.can("export") ? '<button class="btn" id="expReq">' + Icons.svg("download") + "تصدير</button>" : "")) +

      '<section class="card glass" style="margin-bottom:14px">' +
      '<div class="row" style="gap:10px">' +
      '<div class="seg" id="reqTabs">' + tabs.map(function (t) {
        return '<button data-st="' + t.k + '" class="' + (st.status === t.k ? "on" : "") + '">' + t.n +
          ' <span class="num" style="opacity:.6">' + UI.num(t.c) + "</span></button>";
      }).join("") + "</div>" +
      '<span class="spacer"></span>' +
      '<select class="select" id="fType" style="min-height:36px;max-width:170px">' +
      '<option value="">كل الأنواع</option>' +
      SEED.ACTIVITY_TYPES.map(function (t) {
        return '<option value="' + t.key + '"' + (st.type === t.key ? " selected" : "") + ">" + t.name + "</option>";
      }).join("") + "</select>" +
      (mine ? "" : '<select class="select" id="fMosque" style="min-height:36px;max-width:200px">' +
        '<option value="">كل المساجد</option>' +
        Store.db.mosques.map(function (m) {
          return '<option value="' + m.id + '"' + (st.mosqueId === m.id ? " selected" : "") + ">" + UI.esc(m.name) + "</option>";
        }).join("") + "</select>") +
      "</div></section>" +

      (rows.length ? '<section class="card glass card-pad-0"><div class="table-wrap"><table class="tbl">' +
        "<thead><tr><th>النشاط</th><th>الداعية</th><th>المسجد</th><th>الموعد</th><th>الفئة</th><th>الحالة</th><th></th></tr></thead><tbody>" +
        rows.map(function (r) {
          return '<tr class="clickable" data-req="' + r.id + '">' +
            '<td><div class="cell-main">' + UI.esc(r.title) + '</div><div class="cell-sub num">' + r.id + " · " + UI.esc(Store.typeName(r.type)) + "</div></td>" +
            '<td><div class="row" style="gap:8px;flex-wrap:nowrap">' + UI.avatar(Store.preacherName(r.preacherId)) +
            '<span class="nowrap">' + UI.esc(Store.preacherName(r.preacherId)) + "</span></div></td>" +
            "<td>" + UI.esc(Store.mosqueName(r.mosqueId)) + "</td>" +
            '<td><div class="nowrap">' + UI.fmtDate(r.date) + '</div><div class="cell-sub nowrap">' + UI.fmtTime(r.start) + " — " + UI.fmtTime(r.end) + "</div></td>" +
            "<td>" + UI.esc(r.audience || "—") + "</td>" +
            "<td>" + V.statusBadge(r.status) + "</td>" +
            '<td><span class="muted" style="display:flex">' + Icons.svg("chevronLeft", 16) + "</span></td>" +
            "</tr>";
        }).join("") + "</tbody></table></div></section>"
        : UI.empty("inbox", "لا توجد طلبات مطابقة", "جرّب تغيير الفلاتر أو ابدأ بطلب جديد.",
          Store.can("create") ? '<button class="btn btn-primary btn-sm" data-go="#/requests/new">طلب جديد</button>' : ""));
  };

  V.requests.mount = function (root) {
    var st = V.requests.state;
    root.addEventListener("click", function (e) {
      var t = e.target.closest("[data-st]");
      if (t) { st.status = t.getAttribute("data-st"); App.render(); }
    });
    var ft = root.querySelector("#fType");
    if (ft) ft.addEventListener("change", function () { st.type = ft.value; App.render(); });
    var fm = root.querySelector("#fMosque");
    if (fm) fm.addEventListener("change", function () { st.mosqueId = fm.value; App.render(); });
    var ex = root.querySelector("#expReq");
    if (ex) ex.addEventListener("click", function () {
      Store.download("manabir-requests.csv", Store.exportCSV(Store.filter(st)), "text/csv;charset=utf-8");
      UI.toast("تم تصدير الطلبات بصيغة CSV");
    });
  };

  V["my-requests"] = V.requests;
  V["my-requests"].mount = V.requests.mount;

  /* ============================ تفاصيل الطلب ============================ */

  V.openRequest = function (id) {
    var r = Store.request(id);
    if (!r) { UI.toast("الطلب غير موجود", "bad"); return; }
    var m = Store.mosque(r.mosqueId) || {};
    var p = Store.preacher(r.preacherId) || {};
    var actions = Store.actions(r);

    var body =
      V.pipeline(r) +

      '<div class="card glass" style="margin:18px 0">' +
      '<div class="row" style="gap:10px;margin-bottom:12px">' +
      '<span class="chip">' + Icons.svg(Store.typeIcon(r.type)) + UI.esc(Store.typeName(r.type)) + "</span>" +
      '<span class="chip">' + Icons.svg("users") + UI.esc(r.audience || "عام") + "</span>" +
      (r.sessions > 1 ? '<span class="chip">' + Icons.svg("layers") + UI.num(r.sessions) + " جلسات</span>" : "") +
      (r.approvalNo ? '<span class="chip teal">' + Icons.svg("shield") + UI.esc(r.approvalNo) + "</span>" : "") +
      (r.mosqueReady ? '<span class="chip teal">' + Icons.svg("checkCircle") + "المسجد جاهز</span>" : "") +
      "</div>" +
      '<div class="grid g-2" style="gap:12px">' +
      V.kv("المسجد", m.name + (m.district ? " — " + m.district : "")) +
      V.kv("الداعية", p.name || "—") +
      V.kv("التاريخ", UI.fmtDate(r.date, true)) +
      V.kv("التوقيت", UI.fmtTime(r.start) + " — " + UI.fmtTime(r.end)) +
      V.kv("التاريخ الهجري", UI.hijri(r.date)) +
      V.kv("الحضور المتوقع", UI.num(r.expected || 0)) +
      (r.actual ? V.kv("الحضور الفعلي", UI.num(r.actual)) : "") +
      V.kv("تاريخ التقديم", UI.fmtDateTime(r.createdAt)) +
      "</div>" +
      (r.needs && r.needs.length ? '<div class="row" style="margin-top:12px">' + r.needs.map(function (n) {
        return '<span class="chip">' + Icons.svg("check") + UI.esc(n) + "</span>";
      }).join("") + "</div>" : "") +
      (r.notes ? '<div style="margin-top:12px"><div class="small muted">ملاحظات مقدّم الطلب</div><p class="small" style="margin-top:4px">' + UI.esc(r.notes) + "</p></div>" : "") +
      "</div>" +

      (r.rejectReason ? '<div class="card glass" style="margin-bottom:18px;border-color:var(--rose-500)">' +
        '<div class="row" style="gap:10px"><span class="stat-ico" style="margin:0;background:var(--rose-50);color:var(--rose-600)">' + Icons.svg("alert") + "</span>" +
        '<div><b>سبب الإعادة / الإلغاء</b><div class="small muted">' + UI.esc(r.rejectReason) + "</div></div></div></div>" : "") +

      (r.report ? '<div class="card glass" style="margin-bottom:18px">' +
        '<div class="card-head"><h3>تقرير التنفيذ</h3></div><p class="small">' + UI.esc(r.report) + "</p></div>" : "") +

      '<div class="card-head"><h3>سجلّ الطلب</h3></div>' +
      '<div class="timeline">' + (r.timeline || []).slice().reverse().map(function (t) {
        var bad = /أعاد|ألغى|رفض/.test(t.action);
        return '<div class="tl-item ' + (bad ? "bad" : "") + '"><b>' + UI.esc(t.action) + "</b>" +
          "<small>" + UI.esc(t.by) + " · " + Store.roleInfo(t.role).name + " · " + UI.ago(t.at) + "</small>" +
          (t.note ? "<p>" + UI.esc(t.note) + "</p>" : "") + "</div>";
      }).join("") + "</div>";

    var foot = actions.map(function (a) {
      return '<button class="btn ' + (a.kind === "primary" ? "btn-primary" : a.kind === "danger" ? "btn-danger" : "") +
        '" data-act="' + a.key + '" data-id="' + r.id + '">' + Icons.svg(a.icon) + UI.esc(a.label) + "</button>";
    }).join("");

    UI.drawer({
      title: r.title,
      sub: r.id + " · " + Store.statusName(r.status),
      badge: '<span class="stat-ico" style="margin:0">' + Icons.svg(Store.typeIcon(r.type)) + "</span>",
      body: body,
      foot: foot || '<button class="btn" data-drawer="close">إغلاق</button>'
    });
  };

  /* تنفيذ إجراء من درج التفاصيل */
  V.runAction = function (id, action) {
    var r = Store.request(id);
    if (!r) return;

    if (action === "letter") { V.letter(r); return; }

    if (action === "approve") {
      UI.modal({
        title: "اعتماد الطلب",
        sub: r.title + " — " + Store.mosqueName(r.mosqueId),
        okText: "اعتماد وإصدار رقم",
        body:
          '<div class="stack">' +
          '<div class="card glass" style="padding:12px"><div class="small muted">سيصدر رقم اعتماد رسمي ويُشعَر الداعية والمسجد تلقائياً.</div></div>' +
          UI.field({ label: "ملاحظة الاعتماد (اختياري)", name: "note", type: "textarea", placeholder: "أي اشتراطات أو توجيهات" }) +
          "</div>"
      }).then(function (v) {
        if (!v) return;
        var vals = v.values || {};
        Store.act(id, "approve", vals.note);
        UI.toast("تم اعتماد الطلب — " + Store.request(id).approvalNo);
        V.openRequest(id); App.render();
      });
      return;
    }

    if (action === "reject" || action === "cancel") {
      var isReject = action === "reject";
      UI.modal({
        title: isReject ? "إعادة الطلب لمقدّمه" : "إلغاء النشاط",
        sub: r.title,
        okText: isReject ? "إعادة الطلب" : "تأكيد الإلغاء",
        danger: true,
        body: UI.field({
          label: "السبب (يظهر لمقدّم الطلب)", name: "note", type: "textarea", required: true,
          placeholder: isReject ? "مثال: تعارض الموعد مع نشاط آخر، يُرجى اختيار موعد بديل." : "سبب الإلغاء"
        })
      }).then(function (v) {
        if (!v) return;
        var note = (v.values || {}).note || "";
        if (!note.trim()) { UI.toast("السبب مطلوب", "bad"); return; }
        Store.act(id, action, note);
        UI.toast(isReject ? "أُعيد الطلب لمقدّمه" : "تم إلغاء النشاط");
        V.openRequest(id); App.render();
      });
      return;
    }

    if (action === "report") {
      UI.modal({
        title: "تقرير التنفيذ",
        sub: r.title,
        okText: "رفع التقرير",
        body: '<div class="stack">' +
          UI.field({ label: "الحضور الفعلي", name: "actual", type: "number", value: r.expected || 0, required: true }) +
          UI.field({ label: "ملخّص التنفيذ", name: "text", type: "textarea", placeholder: "أبرز ما دار في النشاط والملاحظات." }) +
          "</div>"
      }).then(function (v) {
        if (!v) return;
        var vals = v.values || {};
        Store.act(id, "report", { actual: vals.actual, text: vals.text });
        UI.toast("تم رفع تقرير التنفيذ");
        V.openRequest(id); App.render();
      });
      return;
    }

    if (action === "to_ministry") {
      var p = Store.preacher(r.preacherId);
      if (p && p.status !== "معتمد") {
        UI.toast("لا يمكن الرفع: حالة الداعية «" + p.status + "»", "bad");
        return;
      }
    }

    /* إجراءات مباشرة بلا مدخلات */
    Store.act(id, action);
    var names = { review: "بدأت المراجعة الإدارية", to_ministry: "تم رفع الطلب للوزارة", ready: "تم تأكيد جاهزية المسجد" };
    UI.toast(names[action] || "تم تنفيذ الإجراء");
    V.openRequest(id);
    App.render();
  };

  /* ============================ خطاب الاعتماد ============================ */

  V.letter = function (r) {
    var m = Store.mosque(r.mosqueId) || {};
    var p = Store.preacher(r.preacherId) || {};
    var s = Store.db.settings;

    UI.drawer({
      title: "خطاب الاعتماد",
      sub: r.approvalNo || "غير معتمد بعد",
      body:
        '<div class="letter" id="letterBox">' +
        '<div class="letter-logo"><img src="assets/logo-org.png" alt="" /></div>' +
        '<div class="letter-meta"><span>' + UI.esc(s.ministryName) + "</span><span>" + UI.esc(s.orgName) + "</span></div>" +
        "<h4>خطاب اعتماد نشاط دعوي</h4>" +
        '<div class="letter-meta" style="border:0;margin-bottom:10px"><span class="num">الرقم: ' + UI.esc(r.approvalNo || "—") +
        '</span><span>التاريخ: ' + UI.hijri(new Date()) + "</span></div>" +
        "<p>بناءً على الطلب المقدَّم رقم <b>" + UI.esc(r.id) + "</b>، وبعد استكمال المراجعة الإدارية والاعتماد النظامي، " +
        "يُصرَّح لفضيلة <b>" + UI.esc(p.name || "—") + "</b>" + (p.license ? " (تصريح رقم " + UI.esc(p.license) + ")" : "") +
        " بتقديم <b>" + UI.esc(Store.typeName(r.type)) + "</b> بعنوان: <b>" + UI.esc(r.title) + "</b>، " +
        "في <b>" + UI.esc(m.name || "—") + "</b> بحي " + UI.esc(m.district || "—") + " بمدينة " + UI.esc(m.city || s.city) + "، " +
        "وذلك يوم " + UI.fmtDate(r.date, true) + " الموافق " + UI.hijri(r.date) + "، " +
        "من الساعة " + UI.fmtTime(r.start) + " إلى " + UI.fmtTime(r.end) + "، للفئة: " + UI.esc(r.audience || "عام") + "." +
        (r.sessions > 1 ? " ويشمل الاعتماد <b>" + UI.num(r.sessions) + "</b> جلسات." : "") + "</p>" +
        "<p>وعلى إدارة المسجد التعاون والتهيئة اللازمة، والله الموفق.</p>" +
        '<div class="sign"><div>' + UI.esc(s.orgName) + "</div><div>مدير الإدارة</div></div>" +
        "</div>",
      foot:
        '<button class="btn btn-primary" onclick="window.print()">' + Icons.svg("printer") + "طباعة / حفظ PDF</button>" +
        '<button class="btn" data-req="' + r.id + '">' + Icons.svg("arrowRight") + "عودة للطلب</button>"
    });
  };

  /* ============================ طلب جديد ============================ */

  V["requests/new"] = function (params) {
    var me = Store.me();
    var isPreacher = me.role === "preacher";
    var mosques = Store.db.mosques.filter(function (m) { return m.status === "نشط"; });
    var preachers = Store.db.preachers.filter(function (p) { return p.status === "معتمد"; });
    var facilities = ["مكبر صوت", "شاشة عرض", "بروجكتر", "سبورة", "قسم نساء", "بث مباشر", "ضيافة"];

    return '<div style="max-width:820px;margin-inline:auto">' +
      V.head("طلب نشاط جديد", "املأ البيانات وسيمر الطلب على المراجعة الإدارية ثم الاعتماد",
        '<button class="btn btn-ghost" data-go="#/requests">' + Icons.svg("arrowRight") + "عودة</button>") +

      '<form id="newReq" class="stack">' +

      '<section class="card glass"><div class="card-head"><span class="stat-ico" style="margin:0">' + Icons.svg("mic") + "</span><h3>بيانات النشاط</h3></div>" +
      '<div class="stack">' +
      '<div class="grid g-2">' +
      UI.field({ label: "نوع النشاط", name: "type", type: "select", options: SEED.ACTIVITY_TYPES.map(function (t) { return { value: t.key, label: t.name }; }) }) +
      UI.field({ label: "الفئة المستهدفة", name: "audience", type: "select", options: SEED.AUDIENCES }) +
      "</div>" +
      UI.field({ label: "عنوان النشاط", name: "title", required: true, placeholder: "مثال: محاضرة بعنوان أثر الصلاة في حياة المسلم" }) +
      '<div class="grid g-2">' +
      UI.field({ label: "الموضوع / التخصص", name: "topic", placeholder: "العقيدة، الفقه، السيرة…" }) +
      UI.field({ label: "عدد الجلسات", name: "sessions", type: "number", value: 1, hint: "للدورات والحلقات متعددة اللقاءات" }) +
      "</div>" +
      (isPreacher ? '<input type="hidden" name="preacherId" value="' + me.preacherId + '" />'
        : UI.field({ label: "الداعية / الإمام", name: "preacherId", type: "select", required: true, options: preachers.map(function (p) { return { value: p.id, label: p.name + " — " + p.title }; }) })) +
      "</div></section>" +

      '<section class="card glass"><div class="card-head"><span class="stat-ico" style="margin:0">' + Icons.svg("mosque") + "</span><h3>المكان والموعد</h3></div>" +
      '<div class="stack">' +
      UI.field({ label: "المسجد", name: "mosqueId", type: "select", required: true, options: mosques.map(function (m) { return { value: m.id, label: m.name + " — " + m.district + " (يتسع " + m.capacity + ")" }; }) }) +
      '<div class="grid g-3">' +
      UI.field({ label: "التاريخ", name: "date", type: "date", required: true, value: (params && params.date) || UI.iso(UI.addDays(new Date(), 7)) }) +
      UI.field({ label: "من", name: "start", type: "time", value: "20:00", required: true }) +
      UI.field({ label: "إلى", name: "end", type: "time", value: "21:15", required: true }) +
      "</div>" +
      '<div id="availBox"></div>' +
      UI.field({ label: "الحضور المتوقع", name: "expected", type: "number", value: 150 }) +
      "</div></section>" +

      '<section class="card glass"><div class="card-head"><span class="stat-ico" style="margin:0">' + Icons.svg("layers") + "</span><h3>الاحتياجات والملاحظات</h3></div>" +
      '<div class="row" style="gap:14px;margin-bottom:12px">' + facilities.map(function (f) {
        return '<label class="check"><input type="checkbox" name="need" value="' + UI.esc(f) + '" />' + UI.esc(f) + "</label>";
      }).join("") + "</div>" +
      UI.field({ label: "ملاحظات إضافية", name: "notes", type: "textarea", placeholder: "أي تفاصيل تساعد الإدارة على المراجعة." }) +
      "</section>" +

      '<div class="row" style="gap:9px">' +
      '<button class="btn btn-primary" type="submit">' + Icons.svg("send") + "إرسال الطلب</button>" +
      '<button class="btn btn-ghost" type="button" data-go="#/requests">إلغاء</button>' +
      "</div></form></div>";
  };

  V["requests/new"].mount = function (root) {
    var form = root.querySelector("#newReq");
    if (!form) return;

    function check() {
      var d = readForm(form);
      var box = root.querySelector("#availBox");
      if (!d.mosqueId || !d.date) { box.innerHTML = ""; return; }
      var conflicts = Store.conflicts(d.mosqueId, d.date, d.start, d.end);
      var sameDay = Store.onDate(d.date).filter(function (r) { return r.mosqueId === d.mosqueId; });
      if (conflicts.length) {
        box.innerHTML = '<div class="card glass" style="padding:12px;border-color:var(--rose-500)"><div class="row" style="gap:10px">' +
          '<span class="muted" style="display:flex;color:var(--rose-600)">' + Icons.svg("alert", 18) + "</span>" +
          '<div class="small"><b>تعارض في الموعد</b> — ' + UI.esc(conflicts[0].title) + " (" + UI.fmtTime(conflicts[0].start) + " — " + UI.fmtTime(conflicts[0].end) + ")</div></div></div>";
      } else {
        box.innerHTML = '<div class="card glass" style="padding:12px;border-color:var(--accent)"><div class="row" style="gap:10px">' +
          '<span style="display:flex;color:var(--accent)">' + Icons.svg("checkCircle", 18) + "</span>" +
          '<div class="small"><b>الموعد متاح</b>' + (sameDay.length ? " — يوجد " + UI.num(sameDay.length) + " نشاط آخر في نفس اليوم بأوقات مختلفة." : "") + "</div></div></div>";
      }
    }

    ["mosqueId", "date", "start", "end"].forEach(function (n) {
      var f = form.querySelector('[name="' + n + '"]');
      if (f) f.addEventListener("change", check);
    });
    check();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = readForm(form);
      d.needs = UI.qsa('[name="need"]:checked', form).map(function (c) { return c.value; });

      if (!d.title.trim()) { UI.toast("عنوان النشاط مطلوب", "bad"); return; }
      if (d.start >= d.end) { UI.toast("وقت النهاية يجب أن يكون بعد البداية", "bad"); return; }
      var lead = (UI.date(d.date) - Date.now()) / 86400000;
      if (lead < Store.db.settings.minLeadDays) {
        UI.toast("يجب التقديم قبل " + Store.db.settings.minLeadDays + " أيام على الأقل من موعد النشاط", "bad"); return;
      }
      if (Store.conflicts(d.mosqueId, d.date, d.start, d.end).length) {
        UI.toast("لا يمكن الحفظ: المسجد محجوز في هذا الوقت", "bad"); return;
      }
      var req = Store.createRequest(d);
      UI.toast("تم إرسال الطلب — " + req.id);
      location.hash = "#/requests";
      setTimeout(function () { V.openRequest(req.id); }, 260);
    });
  };

  function readForm(form) {
    var out = {};
    UI.qsa("[name]", form).forEach(function (f) {
      if (f.type === "checkbox") return;
      out[f.name] = f.value;
    });
    return out;
  }
  V.readForm = readForm;

  global.Views = V;
})(window);
