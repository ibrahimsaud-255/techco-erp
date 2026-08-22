/* ==========================================================================
   منابر — مجموعة الأيقونات
   أيقونات SVG خطّية مرسومة داخل الملف (لا مكتبات خارجية، ولا إيموجي).
   الاستخدام:  Icons.svg("mosque")  أو  <span data-icon="mosque"></span>
   ========================================================================== */
(function (global) {
  "use strict";

  var P = {
    /* التنقّل */
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4.2-4.6"/><circle cx="12" cy="17" r="1.4"/>',
    requests: '<path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="9" y="2" width="6" height="4" rx="1.2"/><path d="M9 12h6M9 16h4"/>',
    mosque: '<path d="M3 21h18"/><path d="M6.5 21v-6.5a5.5 5.5 0 0 1 11 0V21"/><path d="M10 21v-3a2 2 0 0 1 4 0v3"/><path d="M12 8.2V4.6"/><circle cx="12" cy="3.4" r="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.4"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5.2L12 2 4 5.2V12c0 6 8 10 8 10z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
    chart: '<path d="M3.5 21h17"/><rect x="5" y="11" width="4" height="7" rx="1.2"/><rect x="10.5" y="6.5" width="4" height="11.5" rx="1.2"/><rect x="16" y="13.5" width="4" height="4.5" rx="1.2"/>',
    sliders: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/><circle cx="9" cy="6.5" r="2.3"/><circle cx="15" cy="12" r="2.3"/><circle cx="7.5" cy="17.5" r="2.3"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2"/>',
    layers: '<path d="M12 2.5 22 8l-10 5.5L2 8l10-5.5z"/><path d="M2.6 12.4 12 17.5l9.4-5.1"/><path d="M2.6 16.4 12 21.5l9.4-5.1"/>',
    book: '<path d="M4 5a3 3 0 0 1 3-3h13v16H7a3 3 0 0 0-3 3z"/><path d="M8 7h8M8 11h6"/>',

    /* إجراءات */
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/>',
    bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5"/><path d="M10.2 20.5a2.2 2.2 0 0 0 3.6 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6.5 9.2 17.3 4 12.1"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.4 12.2l2.4 2.4 4.8-4.9"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevronDown: '<path d="M6 9.5 12 15.5 18 9.5"/>',
    chevronUp: '<path d="M6 14.5 12 8.5 18 14.5"/>',
    chevronLeft: '<path d="M14.5 6 8.5 12l6 6"/>',
    chevronRight: '<path d="M9.5 6l6 6-6 6"/>',
    arrowLeft: '<path d="M20 12H4"/><path d="M10 6l-6 6 6 6"/>',
    arrowRight: '<path d="M4 12h16"/><path d="M14 6l6 6-6 6"/>',
    filter: '<path d="M21 4H3l7.2 8.5V19l3.6 2v-8.5L21 4z"/>',
    pin: '<path d="M20 10.2c0 5.8-8 11.8-8 11.8s-8-6-8-11.8a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.6 2.1"/>',
    phone: '<path d="M6.4 3h3.1l2 4.9-2.5 1.5a12.5 12.5 0 0 0 5.6 5.6l1.5-2.5 4.9 2v3.1a2 2 0 0 1-2.2 2A17.2 17.2 0 0 1 4.4 5.2 2 2 0 0 1 6.4 3z"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><path d="M3.4 7.2 12 13.4l8.6-6.2"/>',
    logout: '<path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 16.5 20.5 12 16 7.5"/><path d="M20.5 12H9.5"/>',
    menu: '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
    download: '<path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M12 3v12"/>',
    printer: '<path d="M6.5 9V2.5h11V9"/><path d="M6.5 18.5h-2a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2h-2"/><rect x="6.5" y="14.5" width="11" height="7" rx="1.4"/>',
    link: '<path d="M10.5 13.2a4.6 4.6 0 0 0 6.9.5l2.6-2.6a4.6 4.6 0 0 0-6.5-6.5l-1.5 1.5"/><path d="M13.5 10.8a4.6 4.6 0 0 0-6.9-.5L4 12.9a4.6 4.6 0 0 0 6.5 6.5l1.5-1.5"/>',
    external: '<path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M15 3h6v6"/><path d="M10.5 13.5 21 3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2.2"/><path d="M5.5 15H4.5a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2H13a2 2 0 0 1 2 2v1"/>',
    eye: '<path d="M2.2 12S6 5.5 12 5.5 21.8 12 21.8 12 18 18.5 12 18.5 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="3.2"/>',
    pencil: '<path d="M16.8 3.2a2.4 2.4 0 0 1 3.4 3.4L8.4 18.4 3.6 20l1.6-4.8L16.8 3.2z"/>',
    trash: '<path d="M3.5 6h17"/><path d="M8.5 6V4.2a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V6"/><path d="M6.2 6l.9 13.4a2 2 0 0 0 2 1.9h5.8a2 2 0 0 0 2-1.9L17.8 6"/>',
    send: '<path d="M21.5 2.5 10.8 13.2"/><path d="M21.5 2.5 14.8 21.5l-4-8.3-8.3-4 19-6.7z"/>',
    alert: '<path d="M12 3.2 2.6 20h18.8L12 3.2z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".9"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    refresh: '<path d="M3.6 12a8.4 8.4 0 0 1 14.3-6"/><path d="M18.4 2.4v4.2h-4.2"/><path d="M20.4 12a8.4 8.4 0 0 1-14.3 6"/><path d="M5.6 21.6v-4.2h4.2"/>',
    moon: '<path d="M20.8 13.4A8.6 8.6 0 0 1 10.6 3.2a8.6 8.6 0 1 0 10.2 10.2z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
    star: '<path d="M12 3.2l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.6l6-.9L12 3.2z"/>',
    more: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
    key: '<circle cx="7.6" cy="15.6" r="4.1"/><path d="M10.6 12.6 21 2.2"/><path d="M17.2 6l3 3"/>',
    lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.4"/><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2.4"/><path d="M8 7.5h2.2M13.8 7.5H16M8 12h2.2M13.8 12H16"/><path d="M9.8 21v-3.4h4.4V21"/>',
    inbox: '<path d="M22 12.5h-5.5l-1.7 2.8H9.2l-1.7-2.8H2"/><path d="M5.6 4.6h12.8l3.6 7.9V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.5l3.6-7.9z"/>',
    history: '<path d="M3.6 12a8.4 8.4 0 1 0 2.5-6"/><path d="M3 3.2v4.2h4.2"/><path d="M12 7.4V12l3.4 2"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><path d="M14 14h3v3h-3zM19.5 14H21v3M14 19.5h3V21M19.5 19.5H21V21"/>',
    file: '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z"/><path d="M14 2.5v5h5"/>',
    tag: '<path d="M20.5 12.6 12.6 20.5a2 2 0 0 1-2.8 0l-6.3-6.3a2 2 0 0 1-.6-1.4V4.5a2 2 0 0 1 2-2h8.3a2 2 0 0 1 1.4.6l5.9 5.9a2 2 0 0 1 0 2.8z"/><circle cx="7.8" cy="7.8" r="1.3"/>',
    mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5 11.5a7 7 0 0 0 14 0"/><path d="M12 18.5V21.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>'
  };

  var ICONS = {
    svg: function (name, size) {
      var d = P[name];
      if (!d) return "";
      var s = size || 24;
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s +
        '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + "</svg>"
      );
    },
    has: function (name) { return !!P[name]; },
    names: function () { return Object.keys(P); },
    /* يستبدل كل عنصر يحمل data-icon بالأيقونة المطابقة */
    paint: function (root) {
      var scope = root || document;
      var nodes = scope.querySelectorAll("[data-icon]");
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.getAttribute("data-painted") === "1") continue;
        n.insertAdjacentHTML("afterbegin", ICONS.svg(n.getAttribute("data-icon")));
        n.setAttribute("data-painted", "1");
      }
    }
  };

  global.Icons = ICONS;
})(window);
