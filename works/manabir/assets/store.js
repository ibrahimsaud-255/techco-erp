/* ==========================================================================
   منابر — طبقة البيانات والحالة
   • وضع العرض (local): يحفظ في متصفح المستخدم — مناسب للتجربة والعرض.
   • وضع الإنتاج (supabase): يُفعّل من config.js عند ربط المنصة بحساب العميل.
   واجهة الاستدعاء واحدة في الحالتين، فلا تتغيّر بقية ملفات الواجهة.
   ========================================================================== */
(function (global) {
  "use strict";

  var CFG = global.MANABIR_CONFIG || {};
  var KEY = (CFG.storageKey || "manabir") + ".v2";
  var SKEY = (CFG.storageKey || "manabir") + ".session";

  var Store = {
    db: null,
    session: null,
    mode: CFG.dataSource === "supabase" ? "supabase" : "local"
  };

  /* ------------------------------ التهيئة ------------------------------ */
  Store.init = function () {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* وضع التصفح الخاص */ }
    if (raw) {
      try { Store.db = JSON.parse(raw); } catch (e) { Store.db = null; }
    }
    if (!Store.db || !Store.db.requests) Store.db = SEED.build();
    if (!Store.db.invites) Store.db.invites = [];
    if (!Store.db.settings) Store.db.settings = SEED.build().settings;

    try {
      var s = localStorage.getItem(SKEY);
      if (s) Store.session = JSON.parse(s);
    } catch (e) { /* تجاهل */ }
    return Store.db;
  };

  Store.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(Store.db)); } catch (e) { /* تجاهل */ }
  };

  Store.reset = function () {
    Store.db = SEED.build();
    Store.save();
  };

  /* ------------------------------ الجلسة ------------------------------ */
  Store.login = function (email, pass) {
    var u = Store.db.users.filter(function (x) {
      return x.email.toLowerCase() === String(email).trim().toLowerCase();
    })[0];
    if (!u) return { ok: false, error: "لا يوجد حساب بهذا البريد الإلكتروني." };
    if (u.pass !== String(pass)) return { ok: false, error: "كلمة المرور غير صحيحة." };
    if (!u.active) return { ok: false, error: "هذا الحساب موقوف. راجع مدير النظام." };
    Store.setSession(u.id);
    return { ok: true, user: u };
  };

  Store.setSession = function (userId) {
    var u = Store.user(userId);
    if (!u) return null;
    u.lastLogin = new Date().toISOString();
    Store.session = { userId: u.id, at: u.lastLogin };
    try { localStorage.setItem(SKEY, JSON.stringify(Store.session)); } catch (e) { /* تجاهل */ }
    Store.save();
    return u;
  };

  Store.logout = function () {
    Store.session = null;
    try { localStorage.removeItem(SKEY); } catch (e) { /* تجاهل */ }
  };

  Store.me = function () {
    return Store.session ? Store.user(Store.session.userId) : null;
  };

  Store.role = function () {
    var me = Store.me();
    return me ? me.role : null;
  };

  Store.roleInfo = function (key) {
    return SEED.ROLES[key || Store.role()] || { name: "—", short: "—" };
  };

  /* ------------------------------ الصلاحيات ------------------------------ */
  Store.can = function (action) {
    var p = SEED.PERMISSIONS[Store.role()];
    return !!(p && p.can.indexOf(action) > -1);
  };

  Store.canView = function (view) {
    var p = SEED.PERMISSIONS[Store.role()];
    return !!(p && p.views.indexOf(view) > -1);
  };

  /* ------------------------------ استعلامات ------------------------------ */
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  Store.mosque = function (id) { return byId(Store.db.mosques, id); };
  Store.preacher = function (id) { return byId(Store.db.preachers, id); };
  Store.user = function (id) { return byId(Store.db.users, id); };
  Store.request = function (id) { return byId(Store.db.requests, id); };

  Store.mosqueName = function (id) { var m = Store.mosque(id); return m ? m.name : "—"; };
  Store.preacherName = function (id) { var p = Store.preacher(id); return p ? p.name : "—"; };

  Store.typeName = function (key) {
    for (var i = 0; i < SEED.ACTIVITY_TYPES.length; i++) if (SEED.ACTIVITY_TYPES[i].key === key) return SEED.ACTIVITY_TYPES[i].name;
    return key || "—";
  };
  Store.typeIcon = function (key) {
    for (var i = 0; i < SEED.ACTIVITY_TYPES.length; i++) if (SEED.ACTIVITY_TYPES[i].key === key) return SEED.ACTIVITY_TYPES[i].icon;
    return "mic";
  };
  Store.statusName = function (key) { return (SEED.STATUS[key] || {}).name || key; };

  /* نطاق ما يراه المستخدم الحالي من الطلبات */
  Store.scopedRequests = function () {
    var me = Store.me();
    if (!me) return [];
    var all = Store.db.requests;
    if (me.role === "preacher") {
      return all.filter(function (r) { return r.preacherId === me.preacherId; });
    }
    if (me.role === "mosque") {
      return all.filter(function (r) { return r.mosqueId === me.mosqueId; });
    }
    if (me.role === "ministry") {
      /* الوزارة ترى ما وصل إليها وما بعده */
      return all.filter(function (r) {
        return ["ministry", "approved", "scheduled", "done", "rejected"].indexOf(r.status) > -1;
      });
    }
    return all;
  };

  /* فلترة عامة */
  Store.filter = function (opts) {
    opts = opts || {};
    var list = (opts.base || Store.scopedRequests()).slice();
    if (opts.status && opts.status !== "all") {
      if (opts.status === "open") {
        list = list.filter(function (r) { return ["submitted", "admin_review", "ministry"].indexOf(r.status) > -1; });
      } else if (opts.status === "active") {
        list = list.filter(function (r) { return ["approved", "scheduled"].indexOf(r.status) > -1; });
      } else {
        list = list.filter(function (r) { return r.status === opts.status; });
      }
    }
    if (opts.mosqueId) list = list.filter(function (r) { return r.mosqueId === opts.mosqueId; });
    if (opts.preacherId) list = list.filter(function (r) { return r.preacherId === opts.preacherId; });
    if (opts.type) list = list.filter(function (r) { return r.type === opts.type; });
    if (opts.from) list = list.filter(function (r) { return r.date >= opts.from; });
    if (opts.to) list = list.filter(function (r) { return r.date <= opts.to; });
    if (opts.q) {
      var q = String(opts.q).trim();
      list = list.filter(function (r) {
        return (r.id + " " + r.title + " " + (r.topic || "") + " " + Store.mosqueName(r.mosqueId) + " " +
          Store.preacherName(r.preacherId) + " " + (r.approvalNo || "")).indexOf(q) > -1;
      });
    }
    var dir = opts.asc ? 1 : -1;
    list.sort(function (a, b) { return a.date < b.date ? -dir : a.date > b.date ? dir : 0; });
    return list;
  };

  Store.upcoming = function (days) {
    var today = UI.iso(new Date());
    var end = UI.iso(UI.addDays(new Date(), days || 30));
    return Store.filter({ from: today, to: end, asc: true }).filter(function (r) {
      return ["approved", "scheduled"].indexOf(r.status) > -1;
    });
  };

  /* هل المسجد مشغول في هذا التاريخ ضمن هذا الوقت */
  Store.conflicts = function (mosqueId, date, start, end, exceptId) {
    return Store.db.requests.filter(function (r) {
      if (r.id === exceptId) return false;
      if (r.mosqueId !== mosqueId || r.date !== date) return false;
      if (["rejected", "canceled", "draft"].indexOf(r.status) > -1) return false;
      if (!start || !end) return true;
      return start < (r.end || "23:59") && (r.start || "00:00") < end;
    });
  };

  /* أنشطة يوم محدّد */
  Store.onDate = function (date, mosqueId) {
    return Store.scopedRequests().filter(function (r) {
      if (r.date !== date) return false;
      if (mosqueId && r.mosqueId !== mosqueId) return false;
      return ["rejected", "canceled"].indexOf(r.status) === -1;
    }).sort(function (a, b) { return (a.start || "") < (b.start || "") ? -1 : 1; });
  };

  /* ------------------------------ إحصاءات ------------------------------ */
  Store.stats = function () {
    var list = Store.scopedRequests();
    var today = UI.iso(new Date());
    var count = function (fn) { return list.filter(fn).length; };
    return {
      total: list.length,
      open: count(function (r) { return ["submitted", "admin_review", "ministry"].indexOf(r.status) > -1; }),
      review: count(function (r) { return ["submitted", "admin_review"].indexOf(r.status) > -1; }),
      ministry: count(function (r) { return r.status === "ministry"; }),
      approved: count(function (r) { return ["approved", "scheduled"].indexOf(r.status) > -1; }),
      done: count(function (r) { return r.status === "done"; }),
      rejected: count(function (r) { return ["rejected", "canceled"].indexOf(r.status) > -1; }),
      upcoming: count(function (r) { return r.date >= today && ["approved", "scheduled"].indexOf(r.status) > -1; }),
      attendance: list.reduce(function (s, r) { return s + (r.status === "done" ? (r.actual || r.expected || 0) : 0); }, 0),
      mosques: Store.db.mosques.length,
      activeMosques: Store.db.mosques.filter(function (m) { return m.status === "نشط"; }).length,
      preachers: Store.db.preachers.length,
      activePreachers: Store.db.preachers.filter(function (p) { return p.status === "معتمد"; }).length
    };
  };

  /* توزيع الأنشطة على آخر ٦ أشهر */
  Store.monthly = function () {
    var out = [], now = new Date();
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var prefix = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      var n = Store.scopedRequests().filter(function (r) {
        return r.date.indexOf(prefix) === 0 && ["rejected", "canceled"].indexOf(r.status) === -1;
      }).length;
      out.push({ label: UI.monthName(d.getMonth()), value: n });
    }
    return out;
  };

  /* أكثر المساجد نشاطاً */
  Store.topMosques = function (n) {
    var map = {};
    Store.scopedRequests().forEach(function (r) {
      if (["rejected", "canceled"].indexOf(r.status) > -1) return;
      map[r.mosqueId] = (map[r.mosqueId] || 0) + 1;
    });
    return Object.keys(map).map(function (k) {
      return { id: k, name: Store.mosqueName(k), value: map[k] };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, n || 5);
  };

  Store.topPreachers = function (n) {
    var map = {};
    Store.scopedRequests().forEach(function (r) {
      if (["rejected", "canceled"].indexOf(r.status) > -1) return;
      map[r.preacherId] = (map[r.preacherId] || 0) + 1;
    });
    return Object.keys(map).map(function (k) {
      return { id: k, name: Store.preacherName(k), value: map[k] };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, n || 5);
  };

  /* ------------------------------ إجراءات الطلبات ------------------------------ */
  function nextRequestId() {
    var y = new Date().getFullYear();
    var max = 0;
    Store.db.requests.forEach(function (r) {
      var m = /^REQ-\d{4}-(\d+)$/.exec(r.id);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return "REQ-" + y + "-" + String(max + 1).padStart(4, "0");
  }

  function nextApprovalNo() {
    var y = new Date().getFullYear();
    var max = 0;
    Store.db.requests.forEach(function (r) {
      var m = /^AP-\d{4}-(\d+)$/.exec(r.approvalNo || "");
      if (m) max = Math.max(max, Number(m[1]));
    });
    return "AP-" + y + "-" + String(max + 1).padStart(4, "0");
  }

  function stamp(req, action, note) {
    var me = Store.me();
    req.timeline = req.timeline || [];
    req.timeline.push({
      at: new Date().toISOString(),
      by: me ? me.name : "زائر",
      role: me ? me.role : "guest",
      action: action,
      note: note || ""
    });
  }

  function notify(role, text, ref) {
    Store.db.notifications.unshift({
      id: UI.uid("N"), at: new Date().toISOString(), role: role, text: text, ref: ref || "", unread: true
    });
    Store.db.notifications = Store.db.notifications.slice(0, 40);
  }

  Store.createRequest = function (data, asGuest) {
    var me = Store.me();
    var req = {
      id: nextRequestId(),
      preacherId: data.preacherId || (me && me.preacherId) || "",
      mosqueId: data.mosqueId,
      type: data.type || "lecture",
      title: data.title,
      topic: data.topic || "",
      date: data.date,
      start: data.start,
      end: data.end,
      audience: data.audience || "عام",
      expected: Number(data.expected) || 0,
      sessions: Number(data.sessions) || 0,
      needs: data.needs || [],
      notes: data.notes || "",
      status: "submitted",
      createdAt: new Date().toISOString(),
      approvalNo: "",
      timeline: []
    };
    req.timeline.push({
      at: req.createdAt,
      by: asGuest ? (data.guestName || "مقدّم الطلب") : (me ? me.name : "—"),
      role: "preacher",
      action: "قدّم الطلب",
      note: asGuest ? "عبر رابط التقديم العام" : ""
    });
    Store.db.requests.unshift(req);
    notify("staff", "طلب جديد: " + req.title + " — " + Store.mosqueName(req.mosqueId), req.id);
    Store.save();
    return req;
  };

  /* الإجراء التالي المتاح للدور الحالي على طلب محدّد */
  Store.actions = function (req) {
    var role = Store.role(), out = [];
    if (!req || !role) return out;
    var s = req.status;

    if (role === "staff" || role === "admin") {
      if (s === "submitted") out.push({ key: "review", label: "بدء المراجعة", icon: "eye", kind: "primary" });
      if (s === "submitted" || s === "admin_review") {
        if (Store.db.settings.requireMinistry) out.push({ key: "to_ministry", label: "رفع للوزارة", icon: "send", kind: "primary" });
        else out.push({ key: "approve", label: "اعتماد", icon: "check", kind: "primary" });
        out.push({ key: "reject", label: "إعادة الطلب", icon: "ban", kind: "danger" });
      }
      if (["approved", "scheduled"].indexOf(s) > -1) {
        out.push({ key: "letter", label: "خطاب الاعتماد", icon: "printer" });
        out.push({ key: "cancel", label: "إلغاء النشاط", icon: "ban", kind: "danger" });
      }
    }

    if ((role === "ministry" || role === "admin") && s === "ministry") {
      out.push({ key: "approve", label: "اعتماد وإصدار رقم", icon: "shield", kind: "primary" });
      out.push({ key: "reject", label: "رفض مع السبب", icon: "ban", kind: "danger" });
      if (role === "admin") out.push({ key: "cancel", label: "إلغاء", icon: "ban", kind: "danger" });
    }
    if (role === "ministry" && ["approved", "scheduled", "done"].indexOf(s) > -1) {
      out.push({ key: "letter", label: "خطاب الاعتماد", icon: "printer" });
    }

    if (role === "preacher" && req.preacherId === (Store.me() || {}).preacherId) {
      if (["approved", "scheduled"].indexOf(s) > -1) {
        out.push({ key: "letter", label: "خطاب الاعتماد", icon: "printer" });
        if (req.date <= UI.iso(new Date())) out.push({ key: "report", label: "رفع تقرير التنفيذ", icon: "upload", kind: "primary" });
      }
      if (["submitted", "admin_review"].indexOf(s) > -1) out.push({ key: "cancel", label: "سحب الطلب", icon: "ban", kind: "danger" });
    }

    if (role === "mosque" && ["approved", "scheduled"].indexOf(s) > -1) {
      out.push({ key: "ready", label: "تأكيد جاهزية المسجد", icon: "checkCircle", kind: "primary" });
      out.push({ key: "letter", label: "خطاب الاعتماد", icon: "printer" });
    }
    return out;
  };

  /* تنفيذ إجراء على الطلب */
  Store.act = function (reqId, action, note) {
    var req = Store.request(reqId);
    if (!req) return null;

    switch (action) {
      case "review":
        req.status = "admin_review";
        stamp(req, "بدأ المراجعة الإدارية", note);
        break;

      case "to_ministry":
        req.status = "ministry";
        stamp(req, "رفع الطلب للوزارة", note);
        notify("ministry", "طلب بانتظار الاعتماد: " + req.title, req.id);
        break;

      case "approve":
        req.status = "approved";
        if (!req.approvalNo) req.approvalNo = nextApprovalNo();
        stamp(req, "اعتمد الطلب", note || ("رقم الاعتماد " + req.approvalNo));
        notify("preacher", "تم اعتماد نشاطك: " + req.title + " — " + req.approvalNo, req.id);
        notify("mosque", "نشاط معتمد في " + Store.mosqueName(req.mosqueId) + " يوم " + UI.fmtDate(req.date), req.id);
        break;

      case "reject":
        req.status = "rejected";
        req.rejectReason = note || "";
        stamp(req, "أعاد الطلب", note);
        notify("preacher", "أُعيد طلبك: " + req.title, req.id);
        break;

      case "cancel":
        req.status = "canceled";
        req.rejectReason = note || "";
        stamp(req, "ألغى الطلب", note);
        break;

      case "ready":
        req.mosqueReady = true;
        stamp(req, "أكّد جاهزية المسجد", note);
        break;

      case "report":
        req.status = "done";
        req.actual = Number((note && note.actual) || 0) || req.expected;
        req.report = (note && note.text) || "";
        stamp(req, "رفع تقرير التنفيذ", "الحضور الفعلي " + UI.num(req.actual));
        break;

      case "reschedule":
        req.date = note.date; req.start = note.start; req.end = note.end;
        stamp(req, "عدّل موعد النشاط", UI.fmtDate(note.date) + " · " + UI.fmtTime(note.start));
        break;
    }
    Store.save();
    return req;
  };

  /* ------------------------------ المساجد والدعاة ------------------------------ */
  Store.saveMosque = function (data) {
    var m = data.id ? Store.mosque(data.id) : null;
    if (m) {
      Object.keys(data).forEach(function (k) { m[k] = data[k]; });
    } else {
      var n = Store.db.mosques.length + 101;
      data.id = "M-" + n;
      data.facilities = data.facilities || [];
      Store.db.mosques.push(data);
      m = data;
    }
    Store.save();
    return m;
  };

  Store.savePreacher = function (data) {
    var p = data.id ? Store.preacher(data.id) : null;
    if (p) {
      Object.keys(data).forEach(function (k) { p[k] = data[k]; });
    } else {
      var n = Store.db.preachers.length + 201;
      data.id = "P-" + n;
      data.specialties = data.specialties || [];
      data.rating = data.rating || 0;
      Store.db.preachers.push(data);
      p = data;
    }
    Store.save();
    return p;
  };

  Store.saveUser = function (data) {
    var u = data.id ? Store.user(data.id) : null;
    if (u) {
      Object.keys(data).forEach(function (k) { u[k] = data[k]; });
    } else {
      data.id = "U-" + (Store.db.users.length + 1);
      data.pass = data.pass || "1234";
      data.active = data.active !== false;
      Store.db.users.push(data);
      u = data;
    }
    Store.save();
    return u;
  };

  Store.deleteUser = function (id) {
    Store.db.users = Store.db.users.filter(function (u) { return u.id !== id; });
    Store.save();
  };

  /* ------------------------------ روابط الدعوة ------------------------------ */
  Store.createInvite = function (data) {
    var inv = {
      token: Math.random().toString(36).slice(2, 10),
      name: data.name || "",
      phone: data.phone || "",
      mosqueId: data.mosqueId || "",
      note: data.note || "",
      createdAt: new Date().toISOString(),
      createdBy: (Store.me() || {}).name || "",
      used: false
    };
    Store.db.invites.unshift(inv);
    Store.save();
    return inv;
  };

  Store.inviteUrl = function (token) {
    var base = location.href.split("#")[0];
    return base + "#/apply?t=" + token;
  };

  Store.invite = function (token) {
    return Store.db.invites.filter(function (i) { return i.token === token; })[0] || null;
  };

  /* ------------------------------ الإشعارات ------------------------------ */
  Store.myNotifications = function () {
    var role = Store.role();
    return Store.db.notifications.filter(function (n) {
      return !n.role || n.role === role || role === "admin";
    }).slice(0, 12);
  };

  /* ------------------------------ الإعدادات ------------------------------ */
  Store.saveSettings = function (patch) {
    Object.keys(patch).forEach(function (k) { Store.db.settings[k] = patch[k]; });
    Store.save();
    return Store.db.settings;
  };

  Store.exportJSON = function () {
    return JSON.stringify(Store.db, null, 2);
  };

  Store.exportCSV = function (rows) {
    var head = ["رقم الطلب", "النشاط", "النوع", "الداعية", "المسجد", "التاريخ", "من", "إلى", "الفئة", "الحالة", "رقم الاعتماد"];
    var lines = [head.join(",")];
    rows.forEach(function (r) {
      lines.push([
        r.id, '"' + (r.title || "").replace(/"/g, "'") + '"', Store.typeName(r.type),
        '"' + Store.preacherName(r.preacherId) + '"', '"' + Store.mosqueName(r.mosqueId) + '"',
        r.date, r.start || "", r.end || "", r.audience || "", Store.statusName(r.status), r.approvalNo || ""
      ].join(","));
    });
    return "﻿" + lines.join("\n");
  };

  Store.download = function (name, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };

  global.Store = Store;
})(window);
