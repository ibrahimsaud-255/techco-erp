/* ==========================================================================
   منابر — الأدلة
   دليل المساجد (البيانات والتوفّر والجدول) · دليل الدعاة والأئمة
   ========================================================================== */
(function (global) {
  "use strict";

  var V = global.Views;

  /* ============================ المساجد ============================ */

  V.mosques = function () {
    var st = V.mosques.state = V.mosques.state || { q: "", district: "", only: "" };
    var today = UI.iso(new Date());

    var list = Store.db.mosques.filter(function (m) {
      if (st.district && m.district !== st.district) return false;
      if (st.only === "women" && !m.womenSection) return false;
      if (st.only === "free" && Store.onDate(today).some(function (r) { return r.mosqueId === m.id; })) return false;
      if (st.only === "busy" && !Store.onDate(today).some(function (r) { return r.mosqueId === m.id; })) return false;
      if (st.q && (m.name + " " + m.district + " " + m.imam).indexOf(st.q) === -1) return false;
      return true;
    });

    var districts = [];
    Store.db.mosques.forEach(function (m) { if (districts.indexOf(m.district) === -1) districts.push(m.district); });

    return V.head("دليل المساجد", UI.num(list.length) + " مسجد وجامع — الحالة والتوفّر والأنشطة",
      (Store.can("edit_mosque") ? '<button class="btn btn-primary" id="addMosque">' + Icons.svg("plus") + "إضافة مسجد</button>" : "")) +

      '<section class="card glass" style="margin-bottom:14px"><div class="row" style="gap:10px">' +
      '<div class="seg">' +
      [["", "الكل"], ["free", "متاح اليوم"], ["busy", "فيه نشاط اليوم"], ["women", "فيه قسم نساء"]].map(function (o) {
        return '<button data-only="' + o[0] + '" class="' + (st.only === o[0] ? "on" : "") + '">' + o[1] + "</button>";
      }).join("") + "</div>" +
      '<span class="spacer"></span>' +
      '<select class="select" id="fDistrict" style="min-height:36px;max-width:180px"><option value="">كل الأحياء</option>' +
      districts.map(function (d) { return '<option value="' + UI.esc(d) + '"' + (st.district === d ? " selected" : "") + ">" + UI.esc(d) + "</option>"; }).join("") +
      "</select>" +
      '<input class="input" id="fq" style="max-width:200px;min-height:36px" placeholder="بحث باسم المسجد…" value="' + UI.esc(st.q) + '" />' +
      "</div></section>" +

      (list.length ? '<div class="grid g-3">' + list.map(function (m) {
        var todayEvents = Store.onDate(today).filter(function (r) { return r.mosqueId === m.id; });
        var count = Store.db.requests.filter(function (r) {
          return r.mosqueId === m.id && ["rejected", "canceled"].indexOf(r.status) === -1;
        }).length;
        return '<article class="card glass clickable" data-mosque="' + m.id + '" style="cursor:pointer">' +
          '<div class="row" style="gap:11px;margin-bottom:12px">' +
          '<span class="stat-ico" style="margin:0">' + Icons.svg("mosque") + "</span>" +
          '<div style="min-width:0"><b style="display:block">' + UI.esc(m.name) + "</b>" +
          '<small class="muted">' + UI.esc(m.district) + " · " + UI.esc(m.city) + "</small></div>" +
          "</div>" +
          '<div class="row small muted" style="gap:12px;margin-bottom:12px">' +
          '<span class="row" style="gap:5px">' + Icons.svg("users", 14) + UI.num(m.capacity) + "</span>" +
          '<span class="row" style="gap:5px">' + Icons.svg("calendar", 14) + UI.num(count) + " نشاط</span>" +
          "</div>" +
          '<div class="row" style="gap:6px">' +
          (m.status === "نشط"
            ? (todayEvents.length ? '<span class="chip gold">' + Icons.svg("clock") + "مشغول اليوم</span>" : '<span class="chip teal">' + Icons.svg("checkCircle") + "متاح اليوم</span>")
            : '<span class="chip rose">' + Icons.svg("alert") + UI.esc(m.status) + "</span>") +
          (m.womenSection ? '<span class="chip">قسم نساء</span>' : "") +
          "</div></article>";
      }).join("") + "</div>" : UI.empty("mosque", "لا توجد مساجد مطابقة", "جرّب تغيير معايير البحث."));
  };

  V.mosques.mount = function (root) {
    var st = V.mosques.state;
    root.addEventListener("click", function (e) {
      var o = e.target.closest("[data-only]");
      if (o) { st.only = o.getAttribute("data-only"); App.render(); return; }
      var c = e.target.closest("[data-mosque]");
      if (c) V.openMosque(c.getAttribute("data-mosque"));
    });
    var fd = root.querySelector("#fDistrict");
    if (fd) fd.addEventListener("change", function () { st.district = fd.value; App.render(); });
    var fq = root.querySelector("#fq");
    if (fq) fq.addEventListener("input", UI.debounce(function () {
      st.q = fq.value; App.render();
      var el = document.querySelector("#fq"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 300));
    var add = root.querySelector("#addMosque");
    if (add) add.addEventListener("click", function () { V.mosqueForm(null); });
  };

  V.openMosque = function (id) {
    var m = Store.mosque(id);
    if (!m) return;
    var reqs = Store.db.requests.filter(function (r) { return r.mosqueId === id; });
    var today = UI.iso(new Date());
    var upcoming = reqs.filter(function (r) { return r.date >= today && ["approved", "scheduled"].indexOf(r.status) > -1; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var past = reqs.filter(function (r) { return r.status === "done"; });

    /* توفّر الأيام السبعة القادمة */
    var week = [];
    for (var i = 0; i < 7; i++) {
      var d = UI.iso(UI.addDays(new Date(), i));
      var evs = Store.onDate(d).filter(function (r) { return r.mosqueId === id; });
      week.push({ date: d, count: evs.length, items: evs });
    }

    UI.drawer({
      title: m.name,
      sub: m.district + " · " + m.city,
      badge: '<span class="stat-ico" style="margin:0">' + Icons.svg("mosque") + "</span>",
      body:
        '<div class="row" style="gap:8px;margin-bottom:16px">' +
        '<span class="chip ' + (m.status === "نشط" ? "teal" : "rose") + '">' + UI.esc(m.status) + "</span>" +
        '<span class="chip">' + Icons.svg("users") + "يتسع " + UI.num(m.capacity) + "</span>" +
        (m.womenSection ? '<span class="chip">قسم نساء</span>' : "") +
        "</div>" +

        '<div class="card glass" style="margin-bottom:16px"><div class="grid g-2" style="gap:12px">' +
        V.kv("العنوان", m.address) + V.kv("الإمام", m.imam) +
        V.kv("المشرف", m.supervisor) + V.kv("الجوال", m.phone) +
        "</div>" +
        (m.facilities && m.facilities.length ? '<div class="row" style="margin-top:12px">' + m.facilities.map(function (f) {
          return '<span class="chip">' + Icons.svg("check") + UI.esc(f) + "</span>";
        }).join("") + "</div>" : "") + "</div>" +

        '<div class="card-head"><h3>التوفّر خلال ٧ أيام</h3></div>' +
        '<div class="grid" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-bottom:18px">' +
        week.map(function (w) {
          var d = UI.date(w.date);
          return '<div class="cal-cell" style="min-height:70px;cursor:default">' +
            '<div class="cal-day num">' + d.getDate() + "</div>" +
            '<small class="muted" style="font-size:9.5px">' + UI.dayName(w.date).slice(0, 3) + "</small>" +
            (w.count ? '<div class="cal-ev">' + UI.num(w.count) + " نشاط</div>" : '<div class="cal-ev mute">متاح</div>') +
            "</div>";
        }).join("") + "</div>" +

        '<div class="grid g-3" style="margin-bottom:18px">' +
        UI.stat({ icon: "calendar", value: UI.num(upcoming.length), label: "أنشطة قادمة" }) +
        UI.stat({ icon: "checkCircle", value: UI.num(past.length), label: "أنشطة منفَّذة" }) +
        UI.stat({ icon: "users", value: UI.num(past.reduce(function (s, r) { return s + (r.actual || 0); }, 0)), label: "إجمالي الحضور" }) +
        "</div>" +

        '<div class="card-head"><h3>الأنشطة القادمة</h3></div>' +
        (upcoming.length ? '<div class="list card glass card-pad-0">' + upcoming.map(function (r) { return V.reqRow(r, { time: true }); }).join("") + "</div>"
          : UI.empty("calendar", "لا توجد أنشطة قادمة", "")),
      foot:
        (Store.can("create") ? '<button class="btn btn-primary" data-go="#/requests/new">' + Icons.svg("plus") + "طلب نشاط هنا</button>" : "") +
        (Store.can("edit_mosque") ? '<button class="btn" data-editmosque="' + m.id + '">' + Icons.svg("pencil") + "تعديل البيانات</button>" : "")
    });
  };

  V.mosqueForm = function (id) {
    var m = id ? Store.mosque(id) : null;
    var facilities = ["قسم نساء", "بث مباشر", "مواقف", "قاعة دروس", "تكييف مركزي"];
    UI.modal({
      title: m ? "تعديل بيانات المسجد" : "إضافة مسجد",
      okText: "حفظ",
      body: '<div class="stack">' +
        UI.field({ label: "اسم المسجد", name: "name", value: m ? m.name : "", required: true }) +
        '<div class="grid g-2">' +
        UI.field({ label: "الحي", name: "district", value: m ? m.district : "" }) +
        UI.field({ label: "المدينة", name: "city", value: m ? m.city : Store.db.settings.city }) +
        "</div>" +
        UI.field({ label: "العنوان", name: "address", value: m ? m.address : "" }) +
        '<div class="grid g-2">' +
        UI.field({ label: "الطاقة الاستيعابية", name: "capacity", type: "number", value: m ? m.capacity : 300 }) +
        UI.field({ label: "الحالة", name: "status", type: "select", value: m ? m.status : "نشط", options: ["نشط", "تحت الصيانة", "موقوف"] }) +
        "</div>" +
        '<div class="grid g-2">' +
        UI.field({ label: "الإمام", name: "imam", value: m ? m.imam : "" }) +
        UI.field({ label: "المشرف", name: "supervisor", value: m ? m.supervisor : "" }) +
        "</div>" +
        UI.field({ label: "جوال التواصل", name: "phone", value: m ? m.phone : "" }) +
        '<div><span class="field-label">التجهيزات</span><div class="row" style="gap:12px;margin-top:6px">' +
        facilities.map(function (f) {
          var on = m && m.facilities && m.facilities.indexOf(f) > -1;
          return '<label class="check"><input type="checkbox" name="fac_' + UI.esc(f) + '"' + (on ? " checked" : "") + " />" + UI.esc(f) + "</label>";
        }).join("") + "</div></div>" +
        "</div>"
    }).then(function (v) {
      if (!v) return;
      var vals = v.values || {};
      var data = {
        id: m ? m.id : undefined,
        name: vals.name, district: vals.district, city: vals.city, address: vals.address,
        capacity: Number(vals.capacity) || 0, status: vals.status, imam: vals.imam,
        supervisor: vals.supervisor, phone: vals.phone,
        facilities: facilities.filter(function (f) { return vals["fac_" + f]; }),
        womenSection: !!vals["fac_قسم نساء"]
      };
      if (!data.name) { UI.toast("اسم المسجد مطلوب", "bad"); return; }
      Store.saveMosque(data);
      UI.toast(m ? "تم تحديث بيانات المسجد" : "تمت إضافة المسجد");
      UI.closeDrawer();
      App.render();
    });
  };

  /* ============================ الدعاة والأئمة ============================ */

  V.preachers = function () {
    var st = V.preachers.state = V.preachers.state || { q: "", status: "" };
    var list = Store.db.preachers.filter(function (p) {
      if (st.status && p.status !== st.status) return false;
      if (st.q && (p.name + " " + p.title + " " + p.specialties.join(" ")).indexOf(st.q) === -1) return false;
      return true;
    });

    return V.head("الدعاة والأئمة", UI.num(list.length) + " مسجّل — التصاريح والتخصصات والسجل",
      (Store.can("edit_preacher") ? '<button class="btn btn-primary" id="addPreacher">' + Icons.svg("userPlus") + "إضافة داعية</button>" : "") +
      (Store.can("invite") ? '<button class="btn" id="mkInvite">' + Icons.svg("link") + "رابط تقديم</button>" : "")) +

      '<section class="card glass" style="margin-bottom:14px"><div class="row" style="gap:10px">' +
      '<div class="seg">' + [["", "الكل"], ["معتمد", "معتمد"], ["تحت المراجعة", "تحت المراجعة"], ["موقوف", "موقوف"]].map(function (o) {
        return '<button data-pst="' + o[0] + '" class="' + (st.status === o[0] ? "on" : "") + '">' + o[1] + "</button>";
      }).join("") + "</div>" +
      '<span class="spacer"></span>' +
      '<input class="input" id="pq" style="max-width:220px;min-height:36px" placeholder="بحث بالاسم أو التخصص…" value="' + UI.esc(st.q) + '" />' +
      "</div></section>" +

      (list.length ? '<div class="grid g-3">' + list.map(function (p) {
        var count = Store.db.requests.filter(function (r) { return r.preacherId === p.id && ["rejected", "canceled"].indexOf(r.status) === -1; }).length;
        var expSoon = (UI.date(p.licenseExpiry) - Date.now()) / 86400000 < 60;
        return '<article class="card glass" data-preacher="' + p.id + '" style="cursor:pointer">' +
          '<div class="row" style="gap:11px;margin-bottom:12px">' + UI.avatar(p.name, "lg") +
          '<div style="min-width:0"><b style="display:block">' + UI.esc(p.name) + "</b>" +
          '<small class="muted">' + UI.esc(p.title) + "</small>" +
          '<div class="row small muted" style="gap:4px;margin-top:3px">' + Icons.svg("star", 13) + '<span class="num">' + (p.rating || "—") + "</span></div>" +
          "</div></div>" +
          '<div class="row" style="gap:6px;margin-bottom:10px">' + p.specialties.slice(0, 3).map(function (s) {
            return '<span class="chip">' + UI.esc(s) + "</span>";
          }).join("") + "</div>" +
          '<div class="row" style="gap:6px">' +
          '<span class="chip ' + (p.status === "معتمد" ? "teal" : p.status === "موقوف" ? "rose" : "gold") + '">' + UI.esc(p.status) + "</span>" +
          '<span class="chip mute">' + UI.num(count) + " نشاط</span>" +
          (expSoon ? '<span class="chip gold">' + Icons.svg("alert") + "تصريح ينتهي قريباً</span>" : "") +
          "</div></article>";
      }).join("") + "</div>" : UI.empty("users", "لا يوجد دعاة مطابقون", ""));
  };

  V.preachers.mount = function (root) {
    var st = V.preachers.state;
    root.addEventListener("click", function (e) {
      var s = e.target.closest("[data-pst]");
      if (s) { st.status = s.getAttribute("data-pst"); App.render(); return; }
      var c = e.target.closest("[data-preacher]");
      if (c) V.openPreacher(c.getAttribute("data-preacher"));
    });
    var pq = root.querySelector("#pq");
    if (pq) pq.addEventListener("input", UI.debounce(function () {
      st.q = pq.value; App.render();
      var el = document.querySelector("#pq"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 300));
    var add = root.querySelector("#addPreacher");
    if (add) add.addEventListener("click", function () { V.preacherForm(null); });
    var inv = root.querySelector("#mkInvite");
    if (inv) inv.addEventListener("click", function () { V.inviteForm(); });
  };

  V.openPreacher = function (id) {
    var p = Store.preacher(id);
    if (!p) return;
    var reqs = Store.db.requests.filter(function (r) { return r.preacherId === id; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var done = reqs.filter(function (r) { return r.status === "done"; });
    var expDays = Math.round((UI.date(p.licenseExpiry) - Date.now()) / 86400000);

    UI.drawer({
      title: p.name,
      sub: p.title,
      badge: UI.avatar(p.name),
      body:
        '<div class="row" style="gap:8px;margin-bottom:16px">' +
        '<span class="chip ' + (p.status === "معتمد" ? "teal" : p.status === "موقوف" ? "rose" : "gold") + '">' + UI.esc(p.status) + "</span>" +
        '<span class="chip">' + Icons.svg("star") + (p.rating || "—") + "</span>" +
        '<span class="chip' + (expDays < 60 ? " gold" : "") + '">' + Icons.svg("shield") + "تصريح " + UI.esc(p.license) + "</span>" +
        "</div>" +

        (p.bio ? '<p class="small muted" style="margin-bottom:16px">' + UI.esc(p.bio) + "</p>" : "") +

        '<div class="card glass" style="margin-bottom:16px"><div class="grid g-2" style="gap:12px">' +
        V.kv("الجوال", p.phone) + V.kv("البريد", p.email) +
        V.kv("المدينة", p.city) +
        V.kv("انتهاء التصريح", UI.fmtDate(p.licenseExpiry) + (expDays < 60 ? " (بعد " + UI.num(expDays) + " يوم)" : "")) +
        "</div>" +
        '<div class="row" style="margin-top:12px">' + p.specialties.map(function (s) {
          return '<span class="chip">' + Icons.svg("tag") + UI.esc(s) + "</span>";
        }).join("") + "</div></div>" +

        '<div class="grid g-3" style="margin-bottom:18px">' +
        UI.stat({ icon: "requests", value: UI.num(reqs.length), label: "إجمالي الطلبات" }) +
        UI.stat({ icon: "checkCircle", value: UI.num(done.length), label: "أنشطة منفَّذة" }) +
        UI.stat({ icon: "users", value: UI.num(done.reduce(function (s, r) { return s + (r.actual || 0); }, 0)), label: "إجمالي الحضور" }) +
        "</div>" +

        '<div class="card-head"><h3>سجل الأنشطة</h3></div>' +
        (reqs.length ? '<div class="list card glass card-pad-0">' + reqs.slice(0, 12).map(function (r) { return V.reqRow(r); }).join("") + "</div>"
          : UI.empty("inbox", "لا توجد أنشطة", "")),
      foot:
        (Store.can("edit_preacher") ? '<button class="btn" data-editpreacher="' + p.id + '">' + Icons.svg("pencil") + "تعديل</button>" : "") +
        (Store.can("invite") ? '<button class="btn btn-primary" data-invitep="' + p.id + '">' + Icons.svg("link") + "إرسال رابط تقديم</button>" : "")
    });
  };

  V.preacherForm = function (id) {
    var p = id ? Store.preacher(id) : null;
    UI.modal({
      title: p ? "تعديل بيانات الداعية" : "إضافة داعية / إمام",
      okText: "حفظ",
      body: '<div class="stack">' +
        UI.field({ label: "الاسم الكامل", name: "name", value: p ? p.name : "", required: true }) +
        '<div class="grid g-2">' +
        UI.field({ label: "الصفة", name: "title", type: "select", value: p ? p.title : "داعية", options: ["داعية", "إمام", "إمام وخطيب", "محاضر", "محاضِرة", "داعية ومحاضر"] }) +
        UI.field({ label: "الحالة", name: "status", type: "select", value: p ? p.status : "تحت المراجعة", options: ["معتمد", "تحت المراجعة", "موقوف"] }) +
        "</div>" +
        '<div class="grid g-2">' +
        UI.field({ label: "الجوال", name: "phone", value: p ? p.phone : "" }) +
        UI.field({ label: "البريد الإلكتروني", name: "email", type: "email", value: p ? p.email : "" }) +
        "</div>" +
        '<div class="grid g-2">' +
        UI.field({ label: "رقم التصريح", name: "license", value: p ? p.license : "" }) +
        UI.field({ label: "انتهاء التصريح", name: "licenseExpiry", type: "date", value: p ? p.licenseExpiry : "" }) +
        "</div>" +
        UI.field({ label: "التخصصات (افصل بفاصلة)", name: "specialties", value: p ? p.specialties.join("، ") : "", placeholder: "العقيدة، الفقه" }) +
        UI.field({ label: "نبذة", name: "bio", type: "textarea", value: p ? p.bio : "" }) +
        "</div>"
    }).then(function (v) {
      if (!v) return;
      var vals = v.values || {};
      if (!vals.name) { UI.toast("الاسم مطلوب", "bad"); return; }
      Store.savePreacher({
        id: p ? p.id : undefined,
        name: vals.name, title: vals.title, status: vals.status, phone: vals.phone, email: vals.email,
        license: vals.license, licenseExpiry: vals.licenseExpiry, bio: vals.bio,
        city: p ? p.city : Store.db.settings.city,
        specialties: String(vals.specialties || "").split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean)
      });
      UI.toast(p ? "تم تحديث البيانات" : "تمت إضافة الداعية");
      UI.closeDrawer();
      App.render();
    });
  };

  /* رابط تقديم خاص يُرسل للداعية */
  V.inviteForm = function (preacherId) {
    var p = preacherId ? Store.preacher(preacherId) : null;
    UI.modal({
      title: "إنشاء رابط تقديم",
      sub: "رابط خاص يُرسل للداعية ليقدّم طلبه مباشرة دون حساب",
      okText: "إنشاء الرابط",
      body: '<div class="stack">' +
        UI.field({ label: "اسم المدعو", name: "name", value: p ? p.name : "", required: true }) +
        UI.field({ label: "الجوال", name: "phone", value: p ? p.phone : "" }) +
        UI.field({
          label: "المسجد المقترح (اختياري)", name: "mosqueId", type: "select",
          options: [{ value: "", label: "— يختاره المدعو —" }].concat(Store.db.mosques.map(function (m) { return { value: m.id, label: m.name }; }))
        }) +
        UI.field({ label: "ملاحظة تظهر له", name: "note", type: "textarea", placeholder: "مثال: نرحّب بتقديمك لمحاضرة ضمن برنامج الأحياء." }) +
        "</div>"
    }).then(function (v) {
      if (!v) return;
      var vals = v.values || {};
      var inv = Store.createInvite(vals);
      var url = Store.inviteUrl(inv.token);
      UI.modal({
        title: "الرابط جاهز",
        sub: "أرسله للداعية عبر الرسائل أو واتساب",
        okText: "نسخ الرابط",
        cancelText: "إغلاق",
        body: '<div class="card glass" style="padding:12px;word-break:break-all;font-size:12.5px" id="invUrl">' + UI.esc(url) + "</div>" +
          '<p class="small muted" style="margin-top:10px">الرابط صالح للاستخدام المتكرر، ويصل الطلب مباشرة إلى قائمة المراجعة الإدارية.</p>'
      }).then(function (ok) {
        if (ok) UI.copy(url);
      });
    });
  };

  global.Views = V;
})(window);
