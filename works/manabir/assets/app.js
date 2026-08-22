/* ==========================================================================
   منابر — تشغيل التطبيق
   التوجيه · القائمة حسب الدور · الإشعارات · البحث · الجلسة
   ========================================================================== */
(function (global) {
  "use strict";

  var App = {};

  /* خريطة الشاشات: العنوان، الأيقونة، والمجموعة في القائمة */
  var VIEWS = {
    desk:              { title: "المكتب",         icon: "grid",      group: "الرئيسية" },
    dashboard:         { title: "لوحة المعلومات", icon: "gauge",     group: "الرئيسية" },
    requests:          { title: "الطلبات",        icon: "requests",  group: "العمل" },
    "my-requests":     { title: "طلباتي",         icon: "requests",  group: "العمل" },
    approvals:         { title: "الاعتمادات",      icon: "shield",    group: "العمل" },
    calendar:          { title: "التقويم",         icon: "calendar",  group: "العمل" },
    "mosque-schedule": { title: "جدول المسجد",     icon: "calendar",  group: "العمل" },
    mosques:           { title: "المساجد",         icon: "mosque",    group: "الأدلة" },
    preachers:         { title: "الدعاة والأئمة",  icon: "users",     group: "الأدلة" },
    reports:           { title: "التقارير",        icon: "chart",     group: "التحليل" },
    guide:             { title: "شرح المنصة",      icon: "book",      group: "الرئيسية" },
    users:             { title: "المستخدمون",      icon: "key",       group: "الإدارة" },
    settings:          { title: "الإعدادات",       icon: "sliders",   group: "الإدارة" }
  };

  /* أيقونات شريط الجوال (أول أربع شاشات + الأخيرة) */
  App.viewTitle = function (v) { return (VIEWS[v] || {}).title || v; };

  /* ------------------------------ التوجيه ------------------------------ */
  function parseHash() {
    var h = (location.hash || "#/dashboard").replace(/^#\/?/, "");
    var qi = h.indexOf("?");
    var params = {};
    if (qi > -1) {
      h.slice(qi + 1).split("&").forEach(function (kv) {
        var p = kv.split("=");
        params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });
      h = h.slice(0, qi);
    }
    h = h.replace(/\/$/, "") || "dashboard";
    return { route: h, params: params };
  }

  App.go = function (hash) {
    if (location.hash === hash) App.render();
    else location.hash = hash;
  };

  /* ------------------------------ الرسم ------------------------------ */
  App.render = function () {
    var r = parseHash();
    var route = r.route;

    /* شاشات عامة لا تحتاج تسجيل دخول */
    if (route === "apply") {
      showApp(false);
      renderPublic(r);
      return;
    }
    if (route === "login" || !Store.me()) {
      renderAuth();
      return;
    }

    showApp(true);

    /* توجيه افتراضي حسب الدور */
    var allowed = SEED.PERMISSIONS[Store.role()].views;
    if (route === "dashboard" && allowed.indexOf("dashboard") === -1) route = allowed[0];

    var base = route.split("/")[0];
    var view = Views[route] || Views[base];

    /* منع الوصول لما لا يسمح به الدور */
    var permKey = route === "requests/new" ? "requests" : base;
    if (VIEWS[permKey] && allowed.indexOf(permKey) === -1 && !(permKey === "requests" && allowed.indexOf("my-requests") > -1)) {
      view = null;
      document.getElementById("view").innerHTML = UI.empty("lock", "لا تملك صلاحية الوصول",
        "هذه الشاشة متاحة لأدوار أخرى. ارجع للوحة المعلومات.",
        '<button class="btn btn-primary btn-sm" data-go="#/dashboard">لوحة المعلومات</button>');
      Icons.paint(document.getElementById("view"));
      buildNav(route);
      return;
    }

    if (!view) {
      document.getElementById("view").innerHTML = UI.empty("alert", "الصفحة غير موجودة", "",
        '<button class="btn btn-primary btn-sm" data-go="#/dashboard">العودة للرئيسية</button>');
      Icons.paint(document.getElementById("view"));
      return;
    }

    var host = document.getElementById("view");
    host.innerHTML = view(r.params);
    Icons.paint(host);
    if (typeof view.mount === "function") view.mount(host);

    buildNav(route);
    paintUser();
    host.scrollTop = 0;
    window.scrollTo(0, 0);
  };

  function renderPublic(r) {
    var host = document.getElementById("view");
    document.getElementById("sidebar").style.display = Store.me() ? "" : "none";
    host.innerHTML = Views.apply(r.params);
    Icons.paint(host);
    Views.apply.mount(host);
    if (Store.me()) { buildNav("apply"); paintUser(); }
  }

  function showApp(on) {
    document.getElementById("app").hidden = !on;
    document.getElementById("auth").hidden = on;
    if (on) document.getElementById("sidebar").style.display = "";
  }

  /* ------------------------------ القائمة ------------------------------ */
  function buildNav(current) {
    var allowed = SEED.PERMISSIONS[Store.role()].views;
    var groups = {};
    allowed.forEach(function (v) {
      if (!VIEWS[v]) return;
      var g = VIEWS[v].group;
      (groups[g] = groups[g] || []).push(v);
    });

    var counts = {
      requests: Store.filter({ status: "open" }).length,
      "my-requests": Store.filter({ status: "open" }).length,
      approvals: Store.filter({ status: "ministry" }).length
    };

    var html = "";
    Object.keys(groups).forEach(function (g) {
      html += '<div class="nav-group">' + UI.esc(g) + "</div>";
      groups[g].forEach(function (v) {
        var on = current === v || current.split("/")[0] === v;
        html += '<button class="nav-item' + (on ? " active" : "") + '" data-go="#/' + v + '">' +
          '<span class="nav-ico">' + Icons.svg(VIEWS[v].icon) + "</span><span>" + UI.esc(VIEWS[v].title) + "</span>" +
          (counts[v] ? '<span class="nav-count num">' + UI.num(counts[v]) + "</span>" : "") + "</button>";
      });
    });
    var nav = document.getElementById("mainNav");
    nav.innerHTML = html;

    /* شريط الجوال */
    var tabs = allowed.filter(function (v) { return VIEWS[v]; }).slice(0, 5);
    document.getElementById("tabbar").innerHTML = tabs.map(function (v) {
      var on = current === v || current.split("/")[0] === v;
      return '<button class="tab' + (on ? " active" : "") + '" data-go="#/' + v + '">' +
        Icons.svg(VIEWS[v].icon) + "<span>" + UI.esc(VIEWS[v].title) + "</span></button>";
    }).join("");

    /* الهوية */
    var s = Store.db.settings;
    document.getElementById("navBrandName").textContent = s.brandName;
    document.getElementById("navOrgName").textContent = s.orgName;
    document.title = s.brandName + " — " + App.viewTitle(current.split("/")[0]);
  }

  function paintUser() {
    var me = Store.me();
    if (!me) return;
    document.getElementById("userName").textContent = me.name;
    document.getElementById("userRole").textContent = Store.roleInfo(me.role).name;
    document.getElementById("userAvatar").outerHTML = UI.avatar(me.name).replace('class="avatar', 'id="userAvatar" class="avatar');
    var n = Store.myNotifications().filter(function (x) { return x.unread; }).length;
    document.getElementById("notifDot").hidden = n === 0;
  }

  /* ------------------------------ شاشة الدخول ------------------------------ */
  function renderAuth() {
    showApp(false);
    document.getElementById("auth").hidden = false;
    var s = (Store.db && Store.db.settings) || {};
    document.getElementById("authBrandName").textContent = s.brandName || "منابر";
    document.getElementById("authBrandTag").textContent = s.tagline || "";

    var demos = ["U-1", "U-2", "U-4", "U-5", "U-7"];
    document.getElementById("demoRoles").innerHTML = demos.map(function (id) {
      var u = Store.user(id);
      if (!u) return "";
      var role = Store.roleInfo(u.role);
      return '<button class="role-btn" data-demo="' + u.id + '" type="button">' + UI.avatar(u.name) +
        "<span><b>" + UI.esc(role.name) + "</b><small>" + UI.esc(u.name) + "</small></span>" +
        '<span class="role-go">' + Icons.svg("chevronLeft", 18) + "</span></button>";
    }).join("");
    Icons.paint(document.getElementById("auth"));
  }

  /* ------------------------------ الإشعارات ------------------------------ */
  function notifPopover(anchor) {
    var list = Store.myNotifications();
    var html = '<div class="pop-head">الإشعارات</div>' +
      (list.length ? list.map(function (n) {
        return '<button class="pop-item" data-notif="' + (n.ref || "") + '">' +
          '<span style="display:flex;color:var(--accent)">' + Icons.svg("bell", 16) + "</span>" +
          '<span style="min-width:0"><span style="display:block">' + UI.esc(n.text) + "</span>" +
          '<small class="muted">' + UI.ago(n.at) + "</small></span></button>";
      }).join("") : '<div class="pop-item muted">لا توجد إشعارات</div>');
    UI.popover(anchor, html);
    Store.db.notifications.forEach(function (n) { n.unread = false; });
    Store.save();
    document.getElementById("notifDot").hidden = true;
  }

  function userPopover(anchor) {
    var me = Store.me();
    var others = Store.db.users.filter(function (u) { return u.active && u.id !== me.id; }).slice(0, 6);
    var html = '<div class="pop-head">' + UI.esc(me.email) + "</div>" +
      (Store.canView("settings") ? '<button class="pop-item" data-go="#/settings">' + Icons.svg("sliders") + "الإعدادات</button>" : "") +
      '<button class="pop-item" data-toggletheme="1">' + Icons.svg("moon") + "تبديل المظهر</button>" +
      '<div class="pop-sep"></div><div class="pop-head">تبديل سريع (للعرض)</div>' +
      others.map(function (u) {
        return '<button class="pop-item" data-switch="' + u.id + '">' + Icons.svg("user") +
          UI.esc(Store.roleInfo(u.role).name) + " — " + UI.esc(u.name.split(" ")[0]) + "</button>";
      }).join("") +
      '<div class="pop-sep"></div><button class="pop-item danger" data-logout="1">' + Icons.svg("logout") + "تسجيل الخروج</button>";
    UI.popover(anchor, html);
  }

  /* ------------------------------ البحث ------------------------------ */
  function runSearch(q) {
    var box = document.getElementById("searchResults");
    q = String(q || "").trim();
    if (q.length < 2) { box.hidden = true; box.innerHTML = ""; return; }

    var reqs = Store.filter({ q: q }).slice(0, 5);
    var mosques = Store.db.mosques.filter(function (m) { return (m.name + m.district).indexOf(q) > -1; }).slice(0, 4);
    var preachers = Store.db.preachers.filter(function (p) { return (p.name + p.specialties.join("")).indexOf(q) > -1; }).slice(0, 4);

    var html = "";
    if (reqs.length) {
      html += '<div class="pop-head">الطلبات</div>' + reqs.map(function (r) {
        return '<button class="pop-item" data-req="' + r.id + '">' + Icons.svg("requests") +
          '<span style="min-width:0"><span style="display:block">' + UI.esc(r.title) + "</span>" +
          '<small class="muted">' + UI.esc(Store.mosqueName(r.mosqueId)) + " · " + UI.fmtDate(r.date) + "</small></span></button>";
      }).join("");
    }
    if (mosques.length && Store.canView("mosques")) {
      html += '<div class="pop-head">المساجد</div>' + mosques.map(function (m) {
        return '<button class="pop-item" data-mosque="' + m.id + '">' + Icons.svg("mosque") + UI.esc(m.name) +
          ' <small class="muted">' + UI.esc(m.district) + "</small></button>";
      }).join("");
    }
    if (preachers.length && Store.canView("preachers")) {
      html += '<div class="pop-head">الدعاة</div>' + preachers.map(function (p) {
        return '<button class="pop-item" data-preacher="' + p.id + '">' + Icons.svg("mic") + UI.esc(p.name) + "</button>";
      }).join("");
    }
    if (!html) html = '<div class="pop-item muted">لا توجد نتائج مطابقة</div>';

    box.innerHTML = html;
    box.hidden = false;
    Icons.paint(box);
  }

  /* ------------------------------ المظهر ------------------------------ */
  App.setTheme = function (t) {
    document.documentElement.setAttribute("data-theme", t);
    Store.saveSettings({ theme: t });
    var btn = document.getElementById("themeToggle");
    if (btn) btn.innerHTML = '<span class="nav-ico">' + Icons.svg(t === "dark" ? "sun" : "moon") + "</span><span>" +
      (t === "dark" ? "المظهر النهاري" : "المظهر الليلي") + "</span>";
  };

  /* ------------------------------ الأحداث ------------------------------ */
  function wire() {
    /* تسجيل الدخول */
    document.getElementById("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var res = Store.login(document.getElementById("loginEmail").value, document.getElementById("loginPass").value);
      var err = document.getElementById("loginError");
      if (!res.ok) { err.textContent = res.error; err.hidden = false; return; }
      err.hidden = true;
      location.hash = "#/dashboard";
      App.render();
      UI.toast("مرحباً " + res.user.name);
    });

    document.getElementById("demoRoles").addEventListener("click", function (e) {
      var b = e.target.closest("[data-demo]");
      if (!b) return;
      Store.setSession(b.getAttribute("data-demo"));
      location.hash = "#/dashboard";
      App.render();
    });

    /* تفويض النقر العام */
    document.addEventListener("click", function (e) {
      var t = e.target;

      var go = t.closest("[data-go]");
      if (go) {
        e.preventDefault();
        UI.closePopover();
        if (UI.drawerOpen() && go.closest(".drawer")) UI.closeDrawer();
        closeSidebar();
        App.go(go.getAttribute("data-go"));
        return;
      }

      var req = t.closest("[data-req]");
      if (req && !t.closest("[data-quick]")) {
        UI.closePopover();
        hideSearch();
        Views.openRequest(req.getAttribute("data-req"));
        return;
      }

      var act = t.closest("[data-act]");
      if (act) { Views.runAction(act.getAttribute("data-id"), act.getAttribute("data-act")); return; }

      var em = t.closest("[data-editmosque]");
      if (em) { Views.mosqueForm(em.getAttribute("data-editmosque")); return; }
      var ep = t.closest("[data-editpreacher]");
      if (ep) { Views.preacherForm(ep.getAttribute("data-editpreacher")); return; }
      var ip = t.closest("[data-invitep]");
      if (ip) { Views.inviteForm(ip.getAttribute("data-invitep")); return; }

      var mo = t.closest("[data-mosque]");
      if (mo && !mo.classList.contains("cal-cell")) { hideSearch(); UI.closePopover(); Views.openMosque(mo.getAttribute("data-mosque")); return; }
      var pr = t.closest("[data-preacher]");
      if (pr) { hideSearch(); UI.closePopover(); Views.openPreacher(pr.getAttribute("data-preacher")); return; }

      var nf = t.closest("[data-notif]");
      if (nf) {
        UI.closePopover();
        var id = nf.getAttribute("data-notif");
        if (id) Views.openRequest(id);
        return;
      }

      var sw = t.closest("[data-switch]");
      if (sw) {
        UI.closePopover();
        Store.setSession(sw.getAttribute("data-switch"));
        location.hash = "#/dashboard";
        App.render();
        UI.toast("تم التبديل إلى " + Store.me().name);
        return;
      }

      if (t.closest("[data-logout]")) { doLogout(); return; }
      if (t.closest("[data-toggletheme]")) {
        UI.closePopover();
        App.setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
        return;
      }

      /* النوافذ والأدراج */
      var md = t.closest("[data-modal]");
      if (md) {
        var k = md.getAttribute("data-modal");
        UI.closeModal(k === "ok" ? { ok: true, values: UI.modalValues() } : null);
        return;
      }
      if (t.closest('[data-drawer="close"]') || t.closest(".drawer-scrim")) { UI.closeDrawer(); return; }
      if (t.closest(".modal-scrim")) { UI.closeModal(null); return; }

      /* إغلاق القوائم المنبثقة عند النقر خارجها */
      if (!t.closest("#popover") && !t.closest("#notifBtn") && !t.closest("#userChip")) UI.closePopover();
      if (!t.closest(".search-wrap")) hideSearch();
      if (t.closest("#scrim")) closeSidebar();
    });

    /* شريط علوي */
    document.getElementById("notifBtn").addEventListener("click", function () { notifPopover(this); });
    document.getElementById("userChip").addEventListener("click", function () { userPopover(this); });
    document.getElementById("menuBtn").addEventListener("click", openSidebar);
    document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
    document.getElementById("logoutBtn").addEventListener("click", doLogout);
    document.getElementById("themeToggle").addEventListener("click", function () {
      App.setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });

    var search = document.getElementById("globalSearch");
    search.addEventListener("input", UI.debounce(function () { runSearch(search.value); }, 200));
    search.addEventListener("focus", function () { if (search.value.length > 1) runSearch(search.value); });

    /* لوحة المفاتيح */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!document.getElementById("popover").hidden) return UI.closePopover();
        if (!document.getElementById("modalHost").hidden) return UI.closeModal(null);
        if (UI.drawerOpen()) return UI.closeDrawer();
        hideSearch();
        closeSidebar();
      }
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault(); search.focus();
      }
    });

    window.addEventListener("hashchange", App.render);
  }

  function hideSearch() {
    var b = document.getElementById("searchResults");
    if (b) { b.hidden = true; b.innerHTML = ""; }
  }
  function openSidebar() {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("scrim").hidden = false;
  }
  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("scrim").hidden = true;
  }
  function doLogout() {
    UI.closePopover();
    UI.confirm("تسجيل الخروج", "سيتم إنهاء جلستك الحالية.", "خروج", true).then(function (v) {
      if (!v) return;
      Store.logout();
      location.hash = "#/login";
      App.render();
    });
  }

  /* ------------------------------ الإقلاع ------------------------------ */
  App.boot = function () {
    Store.init();
    App.setTheme(Store.db.settings.theme || "light");
    Icons.paint(document);
    wire();
    App.render();

    /* توجيه رابط التقديم العام قبل الدخول */
    if (!location.hash) location.hash = Store.me() ? "#/dashboard" : "#/login";
  };

  global.App = App;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", App.boot);
  else App.boot();
})(window);
