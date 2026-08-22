/* ==========================================================================
   منابر — الإدارة
   الاعتمادات · التقارير · المستخدمون والصلاحيات · الإعدادات · جدول المسجد
   ========================================================================== */
(function (global) {
  "use strict";

  var V = global.Views;

  /* ============================ الاعتمادات ============================ */

  V.approvals = function () {
    var queue = Store.filter({ status: "ministry", asc: true });
    var approved = Store.filter({ status: "approved" });
    var st = V.approvals.state = V.approvals.state || { tab: "queue" };

    var rows = st.tab === "queue" ? queue : approved;

    return V.head("الاعتمادات", "الطلبات المرفوعة للوزارة وسجلّ ما تم اعتماده",
      '<button class="btn" id="expAp">' + Icons.svg("download") + "تصدير السجل</button>") +

      '<div class="grid g-3" style="margin-bottom:14px">' +
      UI.stat({ icon: "shield", value: UI.num(queue.length), label: "بانتظار الاعتماد" }) +
      UI.stat({ icon: "checkCircle", value: UI.num(approved.length), label: "معتمد وقائم" }) +
      UI.stat({ icon: "history", value: UI.num(Store.filter({ status: "done" }).length), label: "منفَّذ" }) +
      "</div>" +

      '<section class="card glass" style="margin-bottom:14px"><div class="seg">' +
      '<button data-ap="queue" class="' + (st.tab === "queue" ? "on" : "") + '">قائمة الاعتماد <span class="num" style="opacity:.6">' + UI.num(queue.length) + "</span></button>" +
      '<button data-ap="log" class="' + (st.tab === "log" ? "on" : "") + '">سجل المعتمَد <span class="num" style="opacity:.6">' + UI.num(approved.length) + "</span></button>" +
      "</div></section>" +

      (rows.length ? '<div class="stack">' + rows.map(function (r) {
        var p = Store.preacher(r.preacherId) || {};
        var m = Store.mosque(r.mosqueId) || {};
        return '<article class="card glass">' +
          '<div class="row" style="gap:12px;margin-bottom:12px">' +
          '<span class="stat-ico" style="margin:0">' + Icons.svg(Store.typeIcon(r.type)) + "</span>" +
          '<div style="min-width:0;flex:1"><b style="display:block">' + UI.esc(r.title) + "</b>" +
          '<small class="muted num">' + r.id + " · " + UI.esc(Store.typeName(r.type)) + "</small></div>" +
          V.statusBadge(r.status) + "</div>" +

          '<div class="grid g-4" style="gap:12px;margin-bottom:14px">' +
          V.kv("الداعية", p.name) + V.kv("المسجد", m.name) +
          V.kv("الموعد", UI.fmtDate(r.date) + " · " + UI.fmtTime(r.start)) +
          V.kv(r.approvalNo ? "رقم الاعتماد" : "التصريح", r.approvalNo || p.license) +
          "</div>" +

          '<div class="row" style="gap:8px">' +
          '<button class="btn btn-sm" data-req="' + r.id + '">' + Icons.svg("eye") + "التفاصيل</button>" +
          (st.tab === "queue" && Store.can("approve")
            ? '<button class="btn btn-sm btn-primary" data-quick="approve" data-id="' + r.id + '">' + Icons.svg("shield") + "اعتماد</button>" +
              '<button class="btn btn-sm btn-danger" data-quick="reject" data-id="' + r.id + '">' + Icons.svg("ban") + "رفض</button>"
            : '<button class="btn btn-sm" data-quick="letter" data-id="' + r.id + '">' + Icons.svg("printer") + "خطاب الاعتماد</button>") +
          "</div></article>";
      }).join("") + "</div>"
        : UI.empty("checkCircle", st.tab === "queue" ? "لا يوجد ما ينتظر الاعتماد" : "السجل فارغ",
          st.tab === "queue" ? "كل الطلبات المرفوعة تمت معالجتها." : ""));
  };

  V.approvals.mount = function (root) {
    root.addEventListener("click", function (e) {
      var t = e.target.closest("[data-ap]");
      if (t) { V.approvals.state.tab = t.getAttribute("data-ap"); App.render(); return; }
      var q = e.target.closest("[data-quick]");
      if (q) {
        e.stopPropagation();
        V.runAction(q.getAttribute("data-id"), q.getAttribute("data-quick"));
      }
    });
    var ex = root.querySelector("#expAp");
    if (ex) ex.addEventListener("click", function () {
      Store.download("manabir-approvals.csv", Store.exportCSV(Store.filter({ status: "approved" }).concat(Store.filter({ status: "done" }))), "text/csv;charset=utf-8");
      UI.toast("تم تصدير سجل الاعتمادات");
    });
  };

  /* ============================ التقارير ============================ */

  V.reports = function () {
    var st = V.reports.state = V.reports.state || { period: "6m" };
    var all = Store.scopedRequests();
    var from = st.period === "3m" ? UI.iso(UI.addDays(new Date(), -90))
      : st.period === "12m" ? UI.iso(UI.addDays(new Date(), -365))
        : UI.iso(UI.addDays(new Date(), -180));
    var rows = all.filter(function (r) { return r.date >= from; });
    var done = rows.filter(function (r) { return r.status === "done"; });

    /* توزيع حسب النوع */
    var byType = SEED.ACTIVITY_TYPES.map(function (t) {
      return { label: t.name, value: rows.filter(function (r) { return r.type === t.key; }).length };
    });
    /* توزيع حسب الفئة */
    var byAud = SEED.AUDIENCES.map(function (a) {
      return { label: a, value: rows.filter(function (r) { return r.audience === a; }).length };
    }).filter(function (x) { return x.value > 0; });
    /* توزيع حسب الحي */
    var districts = {};
    rows.forEach(function (r) {
      var m = Store.mosque(r.mosqueId);
      if (!m) return;
      districts[m.district] = (districts[m.district] || 0) + 1;
    });
    var byDistrict = Object.keys(districts).map(function (k) { return { name: k, value: districts[k] }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 6);

    var approvedCount = rows.filter(function (r) { return ["approved", "scheduled", "done"].indexOf(r.status) > -1; }).length;
    var rate = rows.length ? Math.round((approvedCount / rows.length) * 100) : 0;
    var attendance = done.reduce(function (s, r) { return s + (r.actual || r.expected || 0); }, 0);
    var avg = done.length ? Math.round(attendance / done.length) : 0;

    return V.head("التقارير", "قياس أثر الأنشطة الدعوية وتوزيعها",
      '<div class="seg">' + [["3m", "٣ أشهر"], ["6m", "٦ أشهر"], ["12m", "سنة"]].map(function (o) {
        return '<button data-per="' + o[0] + '" class="' + (st.period === o[0] ? "on" : "") + '">' + o[1] + "</button>";
      }).join("") + "</div>" +
      '<button class="btn" id="expRep">' + Icons.svg("download") + "تصدير</button>") +

      '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.stat({ icon: "requests", value: UI.num(rows.length), label: "إجمالي الطلبات" }) +
      UI.stat({ icon: "checkCircle", value: UI.num(done.length), label: "أنشطة منفَّذة" }) +
      UI.stat({ icon: "users", value: UI.num(attendance), label: "إجمالي الحضور" }) +
      UI.stat({ icon: "target", value: rate + "%", label: "نسبة الاعتماد" }) +
      "</div>" +

      '<div class="grid g-side" style="margin-bottom:14px">' +
      '<section class="card glass"><div class="card-head"><h3>الأنشطة شهرياً</h3>' +
      '<span class="card-act"><span class="chip">متوسط الحضور ' + UI.num(avg) + "</span></span></div>" +
      V.bars(Store.monthly()) + "</section>" +

      '<section class="card glass"><div class="card-head"><h3>حسب نوع النشاط</h3></div>' +
      '<div class="stack" style="gap:11px">' + byType.map(function (t) {
        var max = Math.max.apply(null, byType.map(function (x) { return x.value; }).concat([1]));
        return '<div><div class="row" style="gap:8px;margin-bottom:5px"><b class="small">' + UI.esc(t.label) + "</b>" +
          '<span class="spacer"></span><span class="small muted num">' + UI.num(t.value) + "</span></div>" +
          '<div class="meter"><i style="width:' + Math.round((t.value / max) * 100) + '%"></i></div></div>';
      }).join("") + "</div></section></div>" +

      '<div class="grid g-3">' +
      '<section class="card glass"><div class="card-head"><h3>أكثر الأحياء تغطية</h3></div>' + V.rankList(byDistrict, "pin") + "</section>" +
      '<section class="card glass"><div class="card-head"><h3>حسب الفئة المستهدفة</h3></div>' + V.bars(byAud, true) + "</section>" +
      '<section class="card glass"><div class="card-head"><h3>أكثر الدعاة نشاطاً</h3></div>' + V.rankList(Store.topPreachers(5), "mic") + "</section>" +
      "</div>" +

      '<section class="card glass card-pad-0" style="margin-top:14px">' +
      '<div class="card-head" style="padding:16px 18px 0;margin:0"><h3>تفصيل الأنشطة المنفَّذة</h3></div>' +
      (done.length ? '<div class="table-wrap" style="margin-top:10px"><table class="tbl">' +
        "<thead><tr><th>النشاط</th><th>الداعية</th><th>المسجد</th><th>التاريخ</th><th>المتوقع</th><th>الفعلي</th><th>الفرق</th></tr></thead><tbody>" +
        done.map(function (r) {
          var diff = (r.actual || 0) - (r.expected || 0);
          return '<tr class="clickable" data-req="' + r.id + '"><td class="cell-main">' + UI.esc(r.title) + "</td>" +
            "<td>" + UI.esc(Store.preacherName(r.preacherId)) + "</td>" +
            "<td>" + UI.esc(Store.mosqueName(r.mosqueId)) + "</td>" +
            '<td class="nowrap">' + UI.fmtDate(r.date) + "</td>" +
            '<td class="num">' + UI.num(r.expected || 0) + "</td>" +
            '<td class="num">' + UI.num(r.actual || 0) + "</td>" +
            '<td><span class="chip ' + (diff >= 0 ? "teal" : "rose") + '">' + (diff >= 0 ? "+" : "") + UI.num(diff) + "</span></td></tr>";
        }).join("") + "</tbody></table></div>"
        : UI.empty("chart", "لا توجد أنشطة منفَّذة في هذه الفترة", "")) +
      "</section>";
  };

  V.reports.mount = function (root) {
    root.addEventListener("click", function (e) {
      var p = e.target.closest("[data-per]");
      if (p) { V.reports.state.period = p.getAttribute("data-per"); App.render(); }
    });
    var ex = root.querySelector("#expRep");
    if (ex) ex.addEventListener("click", function () {
      Store.download("manabir-report.csv", Store.exportCSV(Store.scopedRequests()), "text/csv;charset=utf-8");
      UI.toast("تم تصدير التقرير");
    });
  };

  /* ============================ المستخدمون والصلاحيات ============================ */

  V.users = function () {
    var st = V.users.state = V.users.state || { tab: "users" };
    var users = Store.db.users;
    var invites = Store.db.invites;

    var tabs = '<section class="card glass" style="margin-bottom:14px"><div class="seg">' +
      [["users", "المستخدمون"], ["roles", "مصفوفة الصلاحيات"], ["invites", "روابط التقديم"]].map(function (o) {
        return '<button data-ut="' + o[0] + '" class="' + (st.tab === o[0] ? "on" : "") + '">' + o[1] + "</button>";
      }).join("") + "</div></section>";

    var body = "";

    if (st.tab === "users") {
      body = '<section class="card glass card-pad-0"><div class="table-wrap"><table class="tbl">' +
        "<thead><tr><th>المستخدم</th><th>الدور</th><th>الارتباط</th><th>آخر دخول</th><th>الحالة</th><th></th></tr></thead><tbody>" +
        users.map(function (u) {
          var link = u.preacherId ? Store.preacherName(u.preacherId) : u.mosqueId ? Store.mosqueName(u.mosqueId) : "—";
          return "<tr>" +
            '<td><div class="row" style="gap:9px;flex-wrap:nowrap">' + UI.avatar(u.name) +
            '<div><div class="cell-main">' + UI.esc(u.name) + '</div><div class="cell-sub">' + UI.esc(u.email) + "</div></div></div></td>" +
            '<td><span class="chip ' + (Store.roleInfo(u.role).color || "") + '">' + UI.esc(Store.roleInfo(u.role).name) + "</span></td>" +
            "<td>" + UI.esc(link) + "</td>" +
            '<td class="nowrap small muted">' + UI.ago(u.lastLogin) + "</td>" +
            '<td><span class="chip ' + (u.active ? "teal" : "rose") + '">' + (u.active ? "نشط" : "موقوف") + "</span></td>" +
            '<td><div class="row" style="gap:5px;flex-wrap:nowrap">' +
            '<button class="icon-btn" data-euser="' + u.id + '" title="تعديل">' + Icons.svg("pencil") + "</button>" +
            '<button class="icon-btn" data-tuser="' + u.id + '" title="إيقاف/تفعيل">' + Icons.svg(u.active ? "ban" : "checkCircle") + "</button>" +
            "</div></td></tr>";
        }).join("") + "</tbody></table></div></section>";
    }

    if (st.tab === "roles") {
      var caps = [
        { k: "create", n: "تقديم طلب" },
        { k: "review", n: "المراجعة الإدارية" },
        { k: "submit_ministry", n: "الرفع للوزارة" },
        { k: "approve", n: "الاعتماد النهائي" },
        { k: "schedule", n: "الجدولة والتعديل" },
        { k: "edit_mosque", n: "إدارة المساجد" },
        { k: "edit_preacher", n: "إدارة الدعاة" },
        { k: "manage_users", n: "إدارة المستخدمين" },
        { k: "invite", n: "إنشاء روابط التقديم" },
        { k: "export", n: "تصدير البيانات" }
      ];
      var roleKeys = Object.keys(SEED.ROLES);
      body = '<section class="card glass card-pad-0"><div class="table-wrap"><table class="tbl">' +
        "<thead><tr><th>الصلاحية</th>" + roleKeys.map(function (r) {
          return "<th>" + UI.esc(SEED.ROLES[r].name) + "</th>";
        }).join("") + "</tr></thead><tbody>" +
        caps.map(function (c) {
          return '<tr><td class="cell-main">' + UI.esc(c.n) + "</td>" + roleKeys.map(function (r) {
            var on = SEED.PERMISSIONS[r].can.indexOf(c.k) > -1;
            return '<td><span style="display:flex;color:' + (on ? "var(--accent)" : "var(--ink-3)") + ';opacity:' + (on ? 1 : .35) + '">' +
              Icons.svg(on ? "checkCircle" : "x", 17) + "</span></td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table></div></section>" +

        '<div class="grid g-3" style="margin-top:14px">' + roleKeys.map(function (r) {
          var role = SEED.ROLES[r];
          var n = users.filter(function (u) { return u.role === r; }).length;
          return '<article class="card glass"><div class="row" style="gap:11px;margin-bottom:8px">' +
            '<span class="stat-ico" style="margin:0">' + Icons.svg(role.icon === "badge" ? "shield" : role.icon) + "</span>" +
            "<div><b>" + UI.esc(role.name) + '</b><div class="small muted">' + UI.num(n) + " مستخدم</div></div></div>" +
            '<p class="small muted">' + UI.esc(role.desc) + "</p>" +
            '<div class="row" style="gap:5px;margin-top:10px">' + SEED.PERMISSIONS[r].views.slice(0, 4).map(function (v) {
              return '<span class="chip mute">' + UI.esc(App.viewTitle(v)) + "</span>";
            }).join("") + "</div></article>";
        }).join("") + "</div>";
    }

    if (st.tab === "invites") {
      body = invites.length ? '<section class="card glass card-pad-0"><div class="table-wrap"><table class="tbl">' +
        "<thead><tr><th>المدعو</th><th>الجوال</th><th>المسجد</th><th>أنشئ</th><th>بواسطة</th><th></th></tr></thead><tbody>" +
        invites.map(function (i) {
          return '<tr><td class="cell-main">' + UI.esc(i.name || "—") + "</td><td>" + UI.esc(i.phone || "—") + "</td>" +
            "<td>" + UI.esc(i.mosqueId ? Store.mosqueName(i.mosqueId) : "—") + "</td>" +
            '<td class="small muted nowrap">' + UI.ago(i.createdAt) + "</td>" +
            "<td>" + UI.esc(i.createdBy || "—") + "</td>" +
            '<td><button class="btn btn-sm" data-cpinv="' + i.token + '">' + Icons.svg("copy") + "نسخ الرابط</button></td></tr>";
        }).join("") + "</tbody></table></div></section>"
        : UI.empty("link", "لا توجد روابط تقديم", "أنشئ رابطاً خاصاً وأرسله للداعية ليقدّم طلبه مباشرة.",
          '<button class="btn btn-primary btn-sm" id="mkInvite2">إنشاء رابط</button>');
    }

    return V.head("المستخدمون والصلاحيات", "إدارة الوصول إلى المنصة وتحديد ما يراه كل دور",
      '<button class="btn btn-primary" id="addUser">' + Icons.svg("userPlus") + "مستخدم جديد</button>" +
      '<button class="btn" id="mkInvite3">' + Icons.svg("link") + "رابط تقديم</button>") + tabs + body;
  };

  V.users.mount = function (root) {
    root.addEventListener("click", function (e) {
      var t = e.target.closest("[data-ut]");
      if (t) { V.users.state.tab = t.getAttribute("data-ut"); App.render(); return; }

      var ed = e.target.closest("[data-euser]");
      if (ed) { V.userForm(ed.getAttribute("data-euser")); return; }

      var tg = e.target.closest("[data-tuser]");
      if (tg) {
        var u = Store.user(tg.getAttribute("data-tuser"));
        if (u.id === (Store.me() || {}).id) { UI.toast("لا يمكنك إيقاف حسابك الحالي", "bad"); return; }
        Store.saveUser({ id: u.id, active: !u.active });
        UI.toast(u.active ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
        App.render();
        return;
      }

      var cp = e.target.closest("[data-cpinv]");
      if (cp) { UI.copy(Store.inviteUrl(cp.getAttribute("data-cpinv"))); return; }
    });

    ["addUser"].forEach(function (id) {
      var b = root.querySelector("#" + id);
      if (b) b.addEventListener("click", function () { V.userForm(null); });
    });
    ["mkInvite2", "mkInvite3"].forEach(function (id) {
      var b = root.querySelector("#" + id);
      if (b) b.addEventListener("click", function () { V.inviteForm(); });
    });
  };

  V.userForm = function (id) {
    var u = id ? Store.user(id) : null;
    var roleOptions = Object.keys(SEED.ROLES).map(function (k) { return { value: k, label: SEED.ROLES[k].name }; });

    UI.modal({
      title: u ? "تعديل المستخدم" : "مستخدم جديد",
      sub: u ? u.email : "يُنشأ الحساب بكلمة مرور مبدئية يغيّرها المستخدم لاحقاً",
      okText: "حفظ",
      body: '<div class="stack">' +
        UI.field({ label: "الاسم", name: "name", value: u ? u.name : "", required: true }) +
        UI.field({ label: "البريد الإلكتروني", name: "email", type: "email", value: u ? u.email : "", required: true }) +
        '<div class="grid g-2">' +
        UI.field({ label: "الدور", name: "role", type: "select", value: u ? u.role : "staff", options: roleOptions }) +
        UI.field({ label: "الجوال", name: "phone", value: u ? u.phone : "" }) +
        "</div>" +
        UI.field({
          label: "ارتباط بداعية (لدور الداعية)", name: "preacherId", type: "select", value: u ? u.preacherId : "",
          options: [{ value: "", label: "— لا يوجد —" }].concat(Store.db.preachers.map(function (p) { return { value: p.id, label: p.name }; }))
        }) +
        UI.field({
          label: "ارتباط بمسجد (لدور مشرف المسجد)", name: "mosqueId", type: "select", value: u ? u.mosqueId : "",
          options: [{ value: "", label: "— لا يوجد —" }].concat(Store.db.mosques.map(function (m) { return { value: m.id, label: m.name }; }))
        }) +
        UI.field({ label: "كلمة المرور", name: "pass", value: u ? u.pass : "1234", hint: "في النسخة المرتبطة بقاعدة بيانات تُدار كلمات المرور بنظام آمن." }) +
        "</div>"
    }).then(function (v) {
      if (!v) return;
      var vals = v.values || {};
      if (!vals.name || !vals.email) { UI.toast("الاسم والبريد مطلوبان", "bad"); return; }
      var dup = Store.db.users.filter(function (x) { return x.email === vals.email && (!u || x.id !== u.id); })[0];
      if (dup) { UI.toast("البريد مستخدم مسبقاً", "bad"); return; }
      Store.saveUser({
        id: u ? u.id : undefined, name: vals.name, email: vals.email, role: vals.role,
        phone: vals.phone, preacherId: vals.preacherId || "", mosqueId: vals.mosqueId || "", pass: vals.pass
      });
      UI.toast(u ? "تم تحديث المستخدم" : "تم إنشاء الحساب");
      App.render();
    });
  };

  /* ============================ الإعدادات ============================ */

  V.settings = function () {
    var s = Store.db.settings;
    return '<div style="max-width:880px;margin-inline:auto">' +
      V.head("الإعدادات", "هوية المنصة وقواعد سير العمل وبيانات النظام") +

      '<section class="card glass" style="margin-bottom:14px">' +
      '<div class="card-head"><span class="stat-ico" style="margin:0">' + Icons.svg("tag") + "</span><h3>الهوية</h3></div>" +
      '<form id="brandForm" class="stack">' +
      '<div class="grid g-2">' +
      UI.field({ label: "اسم المنصة", name: "brandName", value: s.brandName }) +
      UI.field({ label: "الوصف المختصر", name: "tagline", value: s.tagline }) +
      "</div>" +
      '<div class="grid g-2">' +
      UI.field({ label: "الجهة الإدارية", name: "orgName", value: s.orgName }) +
      UI.field({ label: "الجهة المعتمِدة", name: "ministryName", value: s.ministryName }) +
      "</div>" +
      '<div class="grid g-3">' +
      UI.field({ label: "المدينة", name: "city", value: s.city }) +
      UI.field({ label: "بريد التواصل", name: "contactEmail", value: s.contactEmail }) +
      UI.field({ label: "هاتف التواصل", name: "contactPhone", value: s.contactPhone }) +
      "</div>" +
      '<div class="row"><button class="btn btn-primary" type="submit">' + Icons.svg("check") + "حفظ الهوية</button></div>" +
      "</form></section>" +

      '<section class="card glass" style="margin-bottom:14px">' +
      '<div class="card-head"><span class="stat-ico" style="margin:0">' + Icons.svg("sliders") + "</span><h3>سير العمل</h3></div>" +
      '<div class="stack">' +
      toggle("requireMinistry", "اعتماد الوزارة إلزامي", "عند تعطيله يُعتمد الطلب مباشرة بعد المراجعة الإدارية.", s.requireMinistry) +
      toggle("autoApproveKhutbah", "اعتماد خطب الجمعة تلقائياً", "تُعتمد خطب الجمعة فور المراجعة الإدارية دون رفعها للوزارة.", s.autoApproveKhutbah) +
      '<div class="row" style="gap:12px;align-items:flex-end">' +
      '<div style="flex:1">' + UI.field({ label: "أقل مدة بين التقديم وموعد النشاط (أيام)", name: "minLeadDays", type: "number", value: s.minLeadDays, id: "leadDays" }) + "</div>" +
      '<button class="btn" id="saveLead">' + Icons.svg("check") + "حفظ</button>" +
      "</div></div></section>" +

      '<section class="card glass" style="margin-bottom:14px">' +
      '<div class="card-head"><span class="stat-ico" style="margin:0">' + Icons.svg("layers") + "</span><h3>البيانات</h3></div>" +
      '<p class="small muted" style="margin-bottom:12px">' +
      (Store.mode === "supabase"
        ? "المنصة مرتبطة بقاعدة بيانات خارجية. التغييرات تُحفظ مباشرة في حساب الجهة."
        : "المنصة تعمل حالياً في وضع العرض: البيانات محفوظة في هذا المتصفح فقط. عند الربط بقاعدة بيانات الجهة تصبح مشتركة بين كل المستخدمين.") +
      "</p>" +
      '<div class="row" style="gap:9px">' +
      '<button class="btn" id="expJson">' + Icons.svg("download") + "تصدير نسخة كاملة (JSON)</button>" +
      '<button class="btn" id="expCsv">' + Icons.svg("file") + "تصدير الطلبات (CSV)</button>" +
      '<button class="btn btn-danger" id="resetDb">' + Icons.svg("refresh") + "إعادة البيانات التجريبية</button>" +
      "</div></section>" +

      '<section class="card glass">' +
      '<div class="card-head"><span class="stat-ico" style="margin:0">' + Icons.svg("info") + "</span><h3>عن المنصة</h3></div>" +
      '<div class="grid g-2" style="gap:12px">' +
      V.kv("الإصدار", "1.0") +
      V.kv("وضع التشغيل", Store.mode === "supabase" ? "قاعدة بيانات مرتبطة" : "عرض تجريبي (المتصفح)") +
      V.kv("عدد المساجد", UI.num(Store.db.mosques.length)) +
      V.kv("عدد المستخدمين", UI.num(Store.db.users.length)) +
      "</div></section></div>";
  };

  function toggle(name, label, hint, on) {
    return '<label class="check" data-toggle="' + name + '" style="align-items:flex-start">' +
      '<input type="checkbox"' + (on ? " checked" : "") + ' style="margin-top:3px" />' +
      "<span><b>" + UI.esc(label) + '</b><br /><span class="small muted">' + UI.esc(hint) + "</span></span></label>";
  }

  V.settings.mount = function (root) {
    var form = root.querySelector("#brandForm");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = V.readForm(form);
      Store.saveSettings(d);
      UI.toast("تم حفظ الهوية");
      App.render();
    });

    root.addEventListener("change", function (e) {
      var t = e.target.closest("[data-toggle]");
      if (!t) return;
      var patch = {};
      patch[t.getAttribute("data-toggle")] = t.querySelector("input").checked;
      Store.saveSettings(patch);
      UI.toast("تم تحديث الإعداد");
    });

    var sl = root.querySelector("#saveLead");
    if (sl) sl.addEventListener("click", function () {
      Store.saveSettings({ minLeadDays: Number(root.querySelector("#leadDays").value) || 0 });
      UI.toast("تم الحفظ");
    });

    var ej = root.querySelector("#expJson");
    if (ej) ej.addEventListener("click", function () {
      Store.download("manabir-data.json", Store.exportJSON(), "application/json");
      UI.toast("تم تصدير نسخة كاملة");
    });
    var ec = root.querySelector("#expCsv");
    if (ec) ec.addEventListener("click", function () {
      Store.download("manabir-requests.csv", Store.exportCSV(Store.db.requests), "text/csv;charset=utf-8");
      UI.toast("تم التصدير");
    });
    var rd = root.querySelector("#resetDb");
    if (rd) rd.addEventListener("click", function () {
      UI.confirm("إعادة البيانات التجريبية", "سيُحذف كل ما أُضيف وتعود البيانات الأصلية. لا يمكن التراجع.", "إعادة الضبط", true)
        .then(function (v) {
          if (!v) return;
          Store.reset();
          UI.toast("تمت إعادة البيانات");
          App.render();
        });
    });
  };

  /* ============================ جدول المسجد (لمشرف المسجد) ============================ */

  V["mosque-schedule"] = function () {
    var me = Store.me();
    var m = Store.mosque(me.mosqueId) || {};
    var list = Store.scopedRequests().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var today = UI.iso(new Date());
    var upcoming = list.filter(function (r) { return r.date >= today && ["rejected", "canceled"].indexOf(r.status) === -1; });
    var past = list.filter(function (r) { return r.date < today; });

    return V.head("جدول " + (m.name || "المسجد"), "كل الأنشطة المرتبطة بمسجدك") +
      '<section class="card glass card-pad-0" style="margin-bottom:14px">' +
      '<div class="card-head" style="padding:16px 18px 0;margin:0"><h3>القادمة</h3>' +
      '<span class="card-act"><span class="chip teal">' + UI.num(upcoming.length) + "</span></span></div>" +
      '<div class="list" style="margin-top:10px">' +
      (upcoming.length ? upcoming.map(function (r) { return V.reqRow(r, { time: true }); }).join("") : UI.empty("calendar", "لا توجد أنشطة قادمة", "")) +
      "</div></section>" +

      '<section class="card glass card-pad-0">' +
      '<div class="card-head" style="padding:16px 18px 0;margin:0"><h3>السجل السابق</h3></div>' +
      '<div class="list" style="margin-top:10px">' +
      (past.length ? past.slice(0, 20).map(function (r) { return V.reqRow(r); }).join("") : UI.empty("history", "لا يوجد سجل بعد", "")) +
      "</div></section>";
  };

  global.Views = V;
})(window);
