/* ==========================================================================
   منابر — البيانات التأسيسية (وضع العرض التجريبي)
   عند الربط بقاعدة بيانات حقيقية تُستبدل هذه البيانات بما يأتي من الخادم،
   وتبقى نفس الحقول والأسماء كما هي (انظر schema.sql).
   ========================================================================== */
(function (global) {
  "use strict";

  /* ------------------------------ الأدوار ------------------------------ */
  var ROLES = {
    admin: {
      key: "admin", name: "مدير النظام", short: "مدير",
      desc: "صلاحية كاملة على المنصة والمستخدمين والإعدادات",
      color: "", icon: "shield"
    },
    staff: {
      key: "staff", name: "موظف إداري", short: "إداري",
      desc: "مراجعة الطلبات وجدولتها ورفعها للوزارة",
      color: "sky", icon: "requests"
    },
    ministry: {
      key: "ministry", name: "ممثل الوزارة", short: "وزارة",
      desc: "الاعتماد النهائي وإصدار أرقام الاعتماد",
      color: "gold", icon: "badge"
    },
    preacher: {
      key: "preacher", name: "داعية / إمام", short: "داعية",
      desc: "تقديم طلبات الأنشطة ومتابعة جدوله",
      color: "", icon: "mic"
    },
    mosque: {
      key: "mosque", name: "مشرف مسجد", short: "مسجد",
      desc: "متابعة أنشطة المسجد وتأكيد التجهيز",
      color: "rose", icon: "mosque"
    }
  };

  /* الصلاحيات: ما الذي يراه/يفعله كل دور */
  var PERMISSIONS = {
    admin:    { views: ["desk","dashboard","guide","requests","calendar","mosques","preachers","approvals","reports","users","settings"], can: ["create","review","submit_ministry","approve","schedule","edit_mosque","edit_preacher","manage_users","export","invite"] },
    staff:    { views: ["desk","dashboard","guide","requests","calendar","mosques","preachers","reports"], can: ["create","review","submit_ministry","schedule","edit_mosque","edit_preacher","export","invite"] },
    ministry: { views: ["desk","dashboard","guide","approvals","requests","calendar","reports"], can: ["approve","export"] },
    preacher: { views: ["desk","dashboard","guide","my-requests","calendar","mosques"], can: ["create"] },
    mosque:   { views: ["desk","dashboard","guide","mosque-schedule","calendar"], can: ["confirm_ready"] }
  };

  /* ------------------------------ ثوابت ------------------------------ */
  var ACTIVITY_TYPES = [
    { key: "lecture", name: "محاضرة", icon: "mic" },
    { key: "course", name: "دورة علمية", icon: "book" },
    { key: "workshop", name: "ورشة عمل", icon: "layers" },
    { key: "halaqa", name: "حلقة أسبوعية", icon: "users" },
    { key: "khutbah", name: "خطبة جمعة", icon: "mosque" }
  ];

  var AUDIENCES = ["عام", "رجال", "نساء", "شباب", "أطفال"];

  var STATUS = {
    draft:        { key: "draft",        name: "مسودة",              step: 0 },
    submitted:    { key: "submitted",    name: "مقدَّم",              step: 1 },
    admin_review: { key: "admin_review", name: "قيد المراجعة الإدارية", step: 2 },
    ministry:     { key: "ministry",     name: "مرفوع للوزارة",       step: 3 },
    approved:     { key: "approved",     name: "معتمَد",              step: 4 },
    scheduled:    { key: "scheduled",    name: "مجدوَل",              step: 4 },
    done:         { key: "done",         name: "منفَّذ",               step: 5 },
    rejected:     { key: "rejected",     name: "مرفوض",              step: -1 },
    canceled:     { key: "canceled",     name: "ملغى",               step: -1 }
  };

  var PIPELINE = [
    { key: "submitted",    label: "تقديم الطلب",    sub: "الداعية" },
    { key: "admin_review", label: "المراجعة الإدارية", sub: "الإدارة" },
    { key: "ministry",     label: "الرفع للوزارة",   sub: "الإدارة" },
    { key: "approved",     label: "الاعتماد",       sub: "الوزارة" },
    { key: "done",         label: "التنفيذ",        sub: "الداعية" }
  ];

  /* ------------------------------ المساجد ------------------------------ */
  var MOSQUES = [
    { id: "M-101", name: "جامع الملك خالد", district: "الملز", city: "الرياض", address: "شارع الأمير عبدالله بن عبدالعزيز", capacity: 1200, imam: "الشيخ عبدالله الفهد", supervisor: "سعد المطيري", phone: "0555100101", womenSection: true, facilities: ["قسم نساء", "بث مباشر", "مواقف", "تكييف مركزي"], status: "نشط" },
    { id: "M-102", name: "جامع الأمير سلطان", district: "العليا", city: "الرياض", address: "طريق العروبة", capacity: 900, imam: "الشيخ ماجد العتيبي", supervisor: "فهد الدوسري", phone: "0555100102", womenSection: true, facilities: ["قسم نساء", "مواقف", "قاعة دروس"], status: "نشط" },
    { id: "M-103", name: "مسجد النور", district: "النسيم", city: "الرياض", address: "شارع الخليج", capacity: 450, imam: "الشيخ تركي الحربي", supervisor: "ناصر الشمري", phone: "0555100103", womenSection: false, facilities: ["مواقف"], status: "نشط" },
    { id: "M-104", name: "جامع التقوى", district: "الروضة", city: "الرياض", address: "شارع الحسن بن علي", capacity: 700, imam: "الشيخ بندر القحطاني", supervisor: "عمر الزهراني", phone: "0555100104", womenSection: true, facilities: ["قسم نساء", "قاعة دروس", "تكييف مركزي"], status: "نشط" },
    { id: "M-105", name: "مسجد الرحمة", district: "السويدي", city: "الرياض", address: "طريق الحائر", capacity: 380, imam: "الشيخ خالد الغامدي", supervisor: "محمد العنزي", phone: "0555100105", womenSection: false, facilities: ["مواقف"], status: "تحت الصيانة" },
    { id: "M-106", name: "جامع خادم الحرمين", district: "الياسمين", city: "الرياض", address: "طريق أنس بن مالك", capacity: 1500, imam: "الشيخ سلطان الرشيد", supervisor: "يوسف البقمي", phone: "0555100106", womenSection: true, facilities: ["قسم نساء", "بث مباشر", "مواقف", "قاعة دروس", "تكييف مركزي"], status: "نشط" },
    { id: "M-107", name: "مسجد الفرقان", district: "الشفا", city: "الرياض", address: "شارع الأمير بدر", capacity: 520, imam: "الشيخ راشد السبيعي", supervisor: "أحمد الحارثي", phone: "0555100107", womenSection: true, facilities: ["قسم نساء", "مواقف"], status: "نشط" },
    { id: "M-108", name: "جامع الإمام أحمد", district: "الملقا", city: "الرياض", address: "طريق الملك سلمان", capacity: 1100, imam: "الشيخ فيصل المالكي", supervisor: "طلال الجهني", phone: "0555100108", womenSection: true, facilities: ["قسم نساء", "بث مباشر", "قاعة دروس"], status: "نشط" },
    { id: "M-109", name: "مسجد الهدى", district: "الخليج", city: "الرياض", address: "شارع الشيخ حسن بن حسين", capacity: 300, imam: "الشيخ عادل الشهري", supervisor: "زياد الخالدي", phone: "0555100109", womenSection: false, facilities: ["مواقف"], status: "نشط" },
    { id: "M-110", name: "جامع البيان", district: "قرطبة", city: "الرياض", address: "شارع أبي بكر الصديق", capacity: 800, imam: "الشيخ إبراهيم النفيسة", supervisor: "معاذ الرشيدي", phone: "0555100110", womenSection: true, facilities: ["قسم نساء", "قاعة دروس", "مواقف"], status: "نشط" },
    { id: "M-111", name: "مسجد الصفا", district: "المروج", city: "الرياض", address: "شارع التخصصي", capacity: 420, imam: "الشيخ نايف العسيري", supervisor: "سامي القرني", phone: "0555100111", womenSection: false, facilities: ["تكييف مركزي"], status: "نشط" },
    { id: "M-112", name: "جامع الفتح", district: "الدرعية", city: "الرياض", address: "طريق الملك فيصل", capacity: 950, imam: "الشيخ صالح العمري", supervisor: "بدر الحمود", phone: "0555100112", womenSection: true, facilities: ["قسم نساء", "بث مباشر", "مواقف"], status: "نشط" },
    { id: "M-113", name: "مسجد الإخلاص", district: "العزيزية", city: "الرياض", address: "شارع السويدي العام", capacity: 350, imam: "الشيخ مشعل البلوي", supervisor: "حسن آل سعيد", phone: "0555100113", womenSection: false, facilities: [], status: "نشط" },
    { id: "M-114", name: "جامع الرياض الكبير", district: "الديرة", city: "الرياض", address: "شارع الثميري", capacity: 2000, imam: "الشيخ عبدالعزيز التميمي", supervisor: "خالد المهنا", phone: "0555100114", womenSection: true, facilities: ["قسم نساء", "بث مباشر", "مواقف", "قاعة دروس", "تكييف مركزي"], status: "نشط" }
  ];

  /* ------------------------------ الدعاة والأئمة ------------------------------ */
  var PREACHERS = [
    { id: "P-201", name: "د. عبدالرحمن السديري", title: "داعية ومحاضر", specialties: ["العقيدة", "التفسير"], phone: "0551200201", email: "a.sudairi@manabir.sa", city: "الرياض", license: "TR-4451", licenseExpiry: "2027-03-14", rating: 4.9, status: "معتمد", bio: "دكتوراه في العقيدة، له أكثر من ١٢٠ محاضرة في مساجد الرياض." },
    { id: "P-202", name: "الشيخ محمد الشمراني", title: "إمام وخطيب", specialties: ["الفقه", "خطب الجمعة"], phone: "0551200202", email: "m.shamrani@manabir.sa", city: "الرياض", license: "TR-4478", licenseExpiry: "2026-11-02", rating: 4.7, status: "معتمد", bio: "إمام جامع منذ ١٠ سنوات، متخصص في فقه المعاملات." },
    { id: "P-203", name: "د. سارة الخليفة", title: "محاضِرة", specialties: ["تربية الأبناء", "برامج نسائية"], phone: "0551200203", email: "s.khalifa@manabir.sa", city: "الرياض", license: "TR-4502", licenseExpiry: "2027-06-20", rating: 4.8, status: "معتمد", bio: "مستشارة أسرية ومحاضرة في الأقسام النسائية." },
    { id: "P-204", name: "الشيخ فهد العمري", title: "داعية", specialties: ["السيرة النبوية", "الشباب"], phone: "0551200204", email: "f.omari@manabir.sa", city: "الرياض", license: "TR-4530", licenseExpiry: "2026-09-30", rating: 4.5, status: "معتمد", bio: "برامج شبابية ودورات في السيرة." },
    { id: "P-205", name: "الشيخ يوسف الزامل", title: "إمام وخطيب", specialties: ["التجويد", "حلقات التحفيظ"], phone: "0551200205", email: "y.zamil@manabir.sa", city: "الرياض", license: "TR-4566", licenseExpiry: "2027-01-11", rating: 4.6, status: "معتمد", bio: "مجاز في القراءات العشر ومشرف حلقات." },
    { id: "P-206", name: "د. أنس الحمدان", title: "محاضر", specialties: ["الفكر المعاصر", "التوعية"], phone: "0551200206", email: "a.hamdan@manabir.sa", city: "الرياض", license: "TR-4590", licenseExpiry: "2026-08-28", rating: 4.4, status: "تحت المراجعة", bio: "أستاذ جامعي، محاضرات في القضايا المعاصرة." },
    { id: "P-207", name: "الشيخ عمر الصقعبي", title: "داعية", specialties: ["الرقائق", "الدعوة العامة"], phone: "0551200207", email: "o.saqabi@manabir.sa", city: "الرياض", license: "TR-4611", licenseExpiry: "2027-05-05", rating: 4.8, status: "معتمد", bio: "برامج دعوية في الأحياء والمجمعات." },
    { id: "P-208", name: "د. نورة العتيبي", title: "محاضِرة", specialties: ["برامج نسائية", "الفقه"], phone: "0551200208", email: "n.otaibi@manabir.sa", city: "الرياض", license: "TR-4633", licenseExpiry: "2027-02-19", rating: 4.7, status: "معتمد", bio: "محاضِرة في فقه العبادات للنساء." },
    { id: "P-209", name: "الشيخ سعود البراك", title: "إمام", specialties: ["الحديث", "دروس بعد العصر"], phone: "0551200209", email: "s.barrak@manabir.sa", city: "الرياض", license: "TR-4650", licenseExpiry: "2026-12-01", rating: 4.3, status: "معتمد", bio: "دروس يومية في صحيح البخاري." },
    { id: "P-210", name: "الشيخ ثامر الرويلي", title: "داعية", specialties: ["الدعوة العامة"], phone: "0551200210", email: "t.ruwaili@manabir.sa", city: "الرياض", license: "TR-4677", licenseExpiry: "2026-08-15", rating: 4.1, status: "موقوف", bio: "تصريحه بحاجة إلى تجديد." }
  ];

  /* ------------------------------ المستخدمون ------------------------------ */
  var USERS = [
    { id: "U-1", name: "إبراهيم القاسم", email: "admin@manabir.sa", pass: "1234", role: "admin", active: true, lastLogin: "2026-08-05T08:12:00", phone: "0500000001" },
    { id: "U-2", name: "خالد الرشيد", email: "staff@manabir.sa", pass: "1234", role: "staff", active: true, lastLogin: "2026-08-05T07:40:00", phone: "0500000002" },
    { id: "U-3", name: "منيرة السالم", email: "staff2@manabir.sa", pass: "1234", role: "staff", active: true, lastLogin: "2026-08-04T13:05:00", phone: "0500000003" },
    { id: "U-4", name: "أ. عبدالمحسن الوابل", email: "ministry@manabir.sa", pass: "1234", role: "ministry", active: true, lastLogin: "2026-08-05T09:02:00", phone: "0500000004" },
    { id: "U-5", name: "د. عبدالرحمن السديري", email: "preacher@manabir.sa", pass: "1234", role: "preacher", preacherId: "P-201", active: true, lastLogin: "2026-08-05T06:30:00", phone: "0551200201" },
    { id: "U-6", name: "د. سارة الخليفة", email: "s.khalifa@manabir.sa", pass: "1234", role: "preacher", preacherId: "P-203", active: true, lastLogin: "2026-08-03T18:20:00", phone: "0551200203" },
    { id: "U-7", name: "سعد المطيري", email: "mosque@manabir.sa", pass: "1234", role: "mosque", mosqueId: "M-101", active: true, lastLogin: "2026-08-04T20:10:00", phone: "0555100101" },
    { id: "U-8", name: "يوسف البقمي", email: "mosque2@manabir.sa", pass: "1234", role: "mosque", mosqueId: "M-106", active: true, lastLogin: "2026-08-02T16:45:00", phone: "0555100106" },
    { id: "U-9", name: "فيصل الدوسري", email: "staff3@manabir.sa", pass: "1234", role: "staff", active: false, lastLogin: "2026-06-21T10:00:00", phone: "0500000009" }
  ];

  /* ------------------------------ الطلبات ------------------------------ */
  function tl(at, by, role, action, note) {
    return { at: at, by: by, role: role, action: action, note: note || "" };
  }

  var REQUESTS = [
    {
      id: "REQ-2026-0141", preacherId: "P-201", mosqueId: "M-101", type: "lecture",
      title: "أثر التوحيد في استقامة السلوك", topic: "العقيدة",
      date: "2026-08-12", start: "20:30", end: "21:45", audience: "عام", expected: 350,
      status: "ministry", createdAt: "2026-07-28T10:12:00", approvalNo: "",
      needs: ["مكبر صوت", "شاشة عرض"], notes: "يفضّل بعد صلاة العشاء مباشرة.",
      timeline: [
        tl("2026-07-28T10:12:00", "د. عبدالرحمن السديري", "preacher", "قدّم الطلب"),
        tl("2026-07-29T09:30:00", "خالد الرشيد", "staff", "بدأ المراجعة الإدارية"),
        tl("2026-07-30T11:05:00", "خالد الرشيد", "staff", "رفع الطلب للوزارة", "المسجد متاح والتصريح ساري.")
      ]
    },
    {
      id: "REQ-2026-0142", preacherId: "P-203", mosqueId: "M-106", type: "course",
      title: "دورة: تربية الأبناء في زمن الشاشات", topic: "تربية الأبناء",
      date: "2026-08-16", start: "17:00", end: "19:00", audience: "نساء", expected: 180,
      status: "approved", createdAt: "2026-07-20T14:40:00", approvalNo: "AP-2026-0871",
      sessions: 4, needs: ["قسم نساء", "بروجكتر"], notes: "أربع جلسات أسبوعية (كل سبت).",
      timeline: [
        tl("2026-07-20T14:40:00", "د. سارة الخليفة", "preacher", "قدّمت الطلب"),
        tl("2026-07-21T08:15:00", "منيرة السالم", "staff", "بدأت المراجعة الإدارية"),
        tl("2026-07-22T12:00:00", "منيرة السالم", "staff", "رفعت الطلب للوزارة"),
        tl("2026-07-25T10:25:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0871")
      ]
    },
    {
      id: "REQ-2026-0143", preacherId: "P-204", mosqueId: "M-108", type: "workshop",
      title: "ورشة: بناء العادات النافعة للشباب", topic: "الشباب",
      date: "2026-08-09", start: "19:30", end: "21:00", audience: "شباب", expected: 120,
      status: "admin_review", createdAt: "2026-08-02T16:20:00", approvalNo: "",
      needs: ["قاعة دروس", "سبورة"], notes: "",
      timeline: [
        tl("2026-08-02T16:20:00", "الشيخ فهد العمري", "preacher", "قدّم الطلب"),
        tl("2026-08-03T09:10:00", "خالد الرشيد", "staff", "بدأ المراجعة الإدارية")
      ]
    },
    {
      id: "REQ-2026-0144", preacherId: "P-202", mosqueId: "M-102", type: "khutbah",
      title: "خطبة الجمعة: الأمانة في العمل", topic: "خطب الجمعة",
      date: "2026-08-07", start: "12:15", end: "13:00", audience: "عام", expected: 900,
      status: "approved", createdAt: "2026-07-26T09:00:00", approvalNo: "AP-2026-0868",
      needs: [], notes: "بالتنسيق مع إمام الجامع.",
      timeline: [
        tl("2026-07-26T09:00:00", "الشيخ محمد الشمراني", "preacher", "قدّم الطلب"),
        tl("2026-07-26T15:30:00", "خالد الرشيد", "staff", "بدأ المراجعة الإدارية"),
        tl("2026-07-27T08:40:00", "خالد الرشيد", "staff", "رفع الطلب للوزارة"),
        tl("2026-07-29T11:00:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0868")
      ]
    },
    {
      id: "REQ-2026-0145", preacherId: "P-207", mosqueId: "M-110", type: "lecture",
      title: "محاضرة: من أخلاق النبي ﷺ مع جيرانه", topic: "الرقائق",
      date: "2026-08-06", start: "20:00", end: "21:15", audience: "عام", expected: 400,
      status: "approved", createdAt: "2026-07-18T11:11:00", approvalNo: "AP-2026-0859",
      needs: ["مكبر صوت"], notes: "",
      timeline: [
        tl("2026-07-18T11:11:00", "الشيخ عمر الصقعبي", "preacher", "قدّم الطلب"),
        tl("2026-07-19T09:00:00", "منيرة السالم", "staff", "بدأت المراجعة الإدارية"),
        tl("2026-07-19T14:20:00", "منيرة السالم", "staff", "رفعت الطلب للوزارة"),
        tl("2026-07-22T10:05:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0859")
      ]
    },
    {
      id: "REQ-2026-0146", preacherId: "P-205", mosqueId: "M-104", type: "halaqa",
      title: "حلقة أسبوعية في أحكام التجويد", topic: "التجويد",
      date: "2026-08-10", start: "18:00", end: "19:30", audience: "عام", expected: 60,
      status: "submitted", createdAt: "2026-08-04T21:05:00", approvalNo: "",
      sessions: 8, needs: ["قاعة دروس"], notes: "ثمانية لقاءات، كل يوم اثنين.",
      timeline: [tl("2026-08-04T21:05:00", "الشيخ يوسف الزامل", "preacher", "قدّم الطلب")]
    },
    {
      id: "REQ-2026-0147", preacherId: "P-206", mosqueId: "M-114", type: "lecture",
      title: "محاضرة: وسطية الإسلام في التعامل مع المخالف", topic: "الفكر المعاصر",
      date: "2026-08-20", start: "20:30", end: "22:00", audience: "عام", expected: 700,
      status: "rejected", createdAt: "2026-07-25T13:00:00", approvalNo: "",
      needs: ["بث مباشر"], notes: "",
      timeline: [
        tl("2026-07-25T13:00:00", "د. أنس الحمدان", "preacher", "قدّم الطلب"),
        tl("2026-07-26T10:00:00", "خالد الرشيد", "staff", "بدأ المراجعة الإدارية"),
        tl("2026-07-27T12:30:00", "خالد الرشيد", "staff", "أعاد الطلب", "تصريح المحاضر تحت المراجعة، يُعاد التقديم بعد اعتماده.")
      ],
      rejectReason: "تصريح المحاضر تحت المراجعة، يُعاد التقديم بعد اعتماده."
    },
    {
      id: "REQ-2026-0148", preacherId: "P-208", mosqueId: "M-107", type: "course",
      title: "دورة: فقه العبادات للنساء", topic: "الفقه",
      date: "2026-08-18", start: "16:30", end: "18:00", audience: "نساء", expected: 90,
      status: "admin_review", createdAt: "2026-08-03T08:45:00", approvalNo: "",
      sessions: 3, needs: ["قسم نساء"], notes: "",
      timeline: [
        tl("2026-08-03T08:45:00", "د. نورة العتيبي", "preacher", "قدّمت الطلب"),
        tl("2026-08-04T09:20:00", "منيرة السالم", "staff", "بدأت المراجعة الإدارية")
      ]
    },
    {
      id: "REQ-2026-0149", preacherId: "P-209", mosqueId: "M-103", type: "halaqa",
      title: "درس بعد العصر: من صحيح البخاري", topic: "الحديث",
      date: "2026-08-08", start: "16:00", end: "17:00", audience: "عام", expected: 45,
      status: "ministry", createdAt: "2026-07-31T17:30:00", approvalNo: "",
      sessions: 12, needs: [], notes: "درس مستمر طوال الفصل.",
      timeline: [
        tl("2026-07-31T17:30:00", "الشيخ سعود البراك", "preacher", "قدّم الطلب"),
        tl("2026-08-01T10:00:00", "خالد الرشيد", "staff", "بدأ المراجعة الإدارية"),
        tl("2026-08-02T09:15:00", "خالد الرشيد", "staff", "رفع الطلب للوزارة")
      ]
    },
    {
      id: "REQ-2026-0150", preacherId: "P-201", mosqueId: "M-112", type: "lecture",
      title: "محاضرة: صناعة اليقين", topic: "العقيدة",
      date: "2026-08-25", start: "20:30", end: "21:45", audience: "عام", expected: 500,
      status: "submitted", createdAt: "2026-08-05T07:15:00", approvalNo: "",
      needs: ["مكبر صوت", "بث مباشر"], notes: "",
      timeline: [tl("2026-08-05T07:15:00", "د. عبدالرحمن السديري", "preacher", "قدّم الطلب")]
    },
    /* ----- أنشطة منفّذة (للتقارير) ----- */
    {
      id: "REQ-2026-0120", preacherId: "P-201", mosqueId: "M-101", type: "lecture",
      title: "محاضرة: الإيمان والعمل", topic: "العقيدة",
      date: "2026-07-15", start: "20:30", end: "21:45", audience: "عام", expected: 300, actual: 340,
      status: "done", createdAt: "2026-06-28T10:00:00", approvalNo: "AP-2026-0790",
      needs: [], notes: "", report: "حضور جيد وتفاعل واسع، طُلبت إعادة الموضوع في جامع آخر.",
      timeline: [
        tl("2026-06-28T10:00:00", "د. عبدالرحمن السديري", "preacher", "قدّم الطلب"),
        tl("2026-07-01T09:00:00", "خالد الرشيد", "staff", "رفع الطلب للوزارة"),
        tl("2026-07-04T10:00:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0790"),
        tl("2026-07-15T22:10:00", "د. عبدالرحمن السديري", "preacher", "رفع تقرير التنفيذ", "الحضور الفعلي ٣٤٠")
      ]
    },
    {
      id: "REQ-2026-0121", preacherId: "P-203", mosqueId: "M-106", type: "workshop",
      title: "ورشة: حوار الأمهات مع المراهقين", topic: "تربية الأبناء",
      date: "2026-07-11", start: "17:00", end: "19:00", audience: "نساء", expected: 150, actual: 165,
      status: "done", createdAt: "2026-06-20T12:00:00", approvalNo: "AP-2026-0774",
      needs: ["قسم نساء"], notes: "", report: "تم التنفيذ بالكامل، وطُلب تكرار الورشة.",
      timeline: [
        tl("2026-06-20T12:00:00", "د. سارة الخليفة", "preacher", "قدّمت الطلب"),
        tl("2026-06-24T09:00:00", "منيرة السالم", "staff", "رفعت الطلب للوزارة"),
        tl("2026-06-27T11:00:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0774"),
        tl("2026-07-11T20:00:00", "د. سارة الخليفة", "preacher", "رفعت تقرير التنفيذ", "الحضور الفعلي ١٦٥")
      ]
    },
    {
      id: "REQ-2026-0122", preacherId: "P-207", mosqueId: "M-114", type: "lecture",
      title: "محاضرة: زاد المسافر إلى الآخرة", topic: "الرقائق",
      date: "2026-07-22", start: "20:00", end: "21:20", audience: "عام", expected: 800, actual: 760,
      status: "done", createdAt: "2026-06-30T15:00:00", approvalNo: "AP-2026-0801",
      needs: ["بث مباشر"], notes: "", report: "بُثّت مباشرة وتجاوزت المشاهدات ٤٠٠٠.",
      timeline: [
        tl("2026-06-30T15:00:00", "الشيخ عمر الصقعبي", "preacher", "قدّم الطلب"),
        tl("2026-07-03T09:00:00", "خالد الرشيد", "staff", "رفع الطلب للوزارة"),
        tl("2026-07-06T10:30:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0801"),
        tl("2026-07-22T22:00:00", "الشيخ عمر الصقعبي", "preacher", "رفع تقرير التنفيذ", "الحضور الفعلي ٧٦٠")
      ]
    },
    {
      id: "REQ-2026-0123", preacherId: "P-205", mosqueId: "M-104", type: "halaqa",
      title: "حلقة: مخارج الحروف", topic: "التجويد",
      date: "2026-07-06", start: "18:00", end: "19:30", audience: "عام", expected: 50, actual: 44,
      status: "done", createdAt: "2026-06-15T10:00:00", approvalNo: "AP-2026-0752",
      needs: [], notes: "", report: "انتظام جيد للمشاركين.",
      timeline: [
        tl("2026-06-15T10:00:00", "الشيخ يوسف الزامل", "preacher", "قدّم الطلب"),
        tl("2026-06-18T09:00:00", "منيرة السالم", "staff", "رفعت الطلب للوزارة"),
        tl("2026-06-21T12:00:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0752"),
        tl("2026-07-06T20:00:00", "الشيخ يوسف الزامل", "preacher", "رفع تقرير التنفيذ", "الحضور الفعلي ٤٤")
      ]
    },
    {
      id: "REQ-2026-0124", preacherId: "P-202", mosqueId: "M-102", type: "khutbah",
      title: "خطبة الجمعة: بر الوالدين", topic: "خطب الجمعة",
      date: "2026-07-24", start: "12:15", end: "13:00", audience: "عام", expected: 900, actual: 880,
      status: "done", createdAt: "2026-07-05T08:00:00", approvalNo: "AP-2026-0812",
      needs: [], notes: "", report: "",
      timeline: [
        tl("2026-07-05T08:00:00", "الشيخ محمد الشمراني", "preacher", "قدّم الطلب"),
        tl("2026-07-08T09:00:00", "خالد الرشيد", "staff", "رفع الطلب للوزارة"),
        tl("2026-07-11T10:00:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0812"),
        tl("2026-07-24T14:00:00", "الشيخ محمد الشمراني", "preacher", "رفع تقرير التنفيذ", "الحضور الفعلي ٨٨٠")
      ]
    },
    {
      id: "REQ-2026-0125", preacherId: "P-204", mosqueId: "M-110", type: "course",
      title: "دورة: السيرة النبوية في ٥ لقاءات", topic: "السيرة النبوية",
      date: "2026-06-28", start: "19:30", end: "21:00", audience: "شباب", expected: 100, actual: 118,
      status: "done", createdAt: "2026-06-01T09:00:00", approvalNo: "AP-2026-0721",
      sessions: 5, needs: ["قاعة دروس"], notes: "", report: "أُنجزت اللقاءات الخمسة بنجاح.",
      timeline: [
        tl("2026-06-01T09:00:00", "الشيخ فهد العمري", "preacher", "قدّم الطلب"),
        tl("2026-06-05T10:00:00", "خالد الرشيد", "staff", "رفع الطلب للوزارة"),
        tl("2026-06-09T11:00:00", "أ. عبدالمحسن الوابل", "ministry", "اعتمد الطلب", "رقم الاعتماد AP-2026-0721"),
        tl("2026-06-28T21:30:00", "الشيخ فهد العمري", "preacher", "رفع تقرير التنفيذ", "الحضور الفعلي ١١٨")
      ]
    },
    {
      id: "REQ-2026-0126", preacherId: "P-210", mosqueId: "M-113", type: "lecture",
      title: "محاضرة عامة", topic: "الدعوة العامة",
      date: "2026-07-30", start: "20:00", end: "21:00", audience: "عام", expected: 200,
      status: "canceled", createdAt: "2026-07-10T10:00:00", approvalNo: "",
      needs: [], notes: "", rejectReason: "أُلغي بناءً على طلب المسجد (تعارض مع صيانة).",
      timeline: [
        tl("2026-07-10T10:00:00", "الشيخ ثامر الرويلي", "preacher", "قدّم الطلب"),
        tl("2026-07-12T09:00:00", "خالد الرشيد", "staff", "بدأ المراجعة الإدارية"),
        tl("2026-07-14T11:20:00", "خالد الرشيد", "staff", "ألغى الطلب", "تعارض مع أعمال صيانة في المسجد.")
      ]
    }
  ];

  /* ------------------------------ الإشعارات ------------------------------ */
  var NOTIFICATIONS = [
    { id: "N-1", at: "2026-08-05T07:15:00", role: "staff", text: "طلب جديد من د. عبدالرحمن السديري — جامع الفتح", ref: "REQ-2026-0150" },
    { id: "N-2", at: "2026-08-04T21:05:00", role: "staff", text: "طلب جديد من الشيخ يوسف الزامل — جامع التقوى", ref: "REQ-2026-0146" },
    { id: "N-3", at: "2026-08-04T09:20:00", role: "ministry", text: "طلبان بانتظار الاعتماد النهائي", ref: "" },
    { id: "N-4", at: "2026-08-03T10:00:00", role: "preacher", text: "تم اعتماد محاضرتك في جامع البيان — AP-2026-0859", ref: "REQ-2026-0145" },
    { id: "N-5", at: "2026-08-02T18:30:00", role: "mosque", text: "نشاط معتمد في جامع الملك خالد يوم ١٢ أغسطس", ref: "REQ-2026-0141" }
  ];

  /* ------------------------------ الإعدادات ------------------------------ */
  var SETTINGS = {
    brandName: "منابر",
    tagline: "منصة الجمعية لتنظيم الأنشطة الدعوية في المساجد",
    orgName: "جمعية الدعوة والإرشاد وتوعية الجاليات بالسلي",
    ministryName: "وزارة الشؤون الإسلامية والدعوة والإرشاد",
    city: "الرياض",
    theme: "light",
    requireMinistry: true,      /* هل يمرّ الطلب على الوزارة قبل الاعتماد */
    autoApproveKhutbah: false,  /* اعتماد خطب الجمعة تلقائياً بعد المراجعة الإدارية */
    minLeadDays: 3,             /* أقل عدد أيام بين التقديم وتاريخ النشاط */
    contactEmail: "info@manabir.sa",
    contactPhone: "0112000000"
  };

  global.SEED = {
    ROLES: ROLES,
    PERMISSIONS: PERMISSIONS,
    ACTIVITY_TYPES: ACTIVITY_TYPES,
    AUDIENCES: AUDIENCES,
    STATUS: STATUS,
    PIPELINE: PIPELINE,
    build: function () {
      return JSON.parse(JSON.stringify({
        mosques: MOSQUES,
        preachers: PREACHERS,
        users: USERS,
        requests: REQUESTS,
        notifications: NOTIFICATIONS,
        settings: SETTINGS,
        invites: []
      }));
    }
  };
})(window);
