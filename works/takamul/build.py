# -*- coding: utf-8 -*-
"""
مولّد موقع شركة التكامل المتحدة للخدمات اللوجستية
يبني كل صفحات الموقع HTML ثابتة + sitemap.xml + robots.txt
التشغيل:  python3 build.py
"""
import os, sys, json, html, datetime, re

HERE = os.path.dirname(os.path.abspath(__file__))
ASSET_V = "1785185612"  # كسر الكاش — يتغيّر تلقائياً مع كل بناء

# ============================================================
#  تحميل المحتوى من content.json (تُحرّره لوحة التحكم)
# ============================================================
LANG = os.environ.get("BUILD_LANG", "ar")          # ar | en
IS_EN = LANG == "en"
OUTDIR = os.path.join(HERE, "en") if IS_EN else HERE
if IS_EN:
    os.makedirs(OUTDIR, exist_ok=True)

CONTENT = json.load(open(os.path.join(HERE, "content.json"), encoding="utf-8"))
if IS_EN:
    _en = json.load(open(os.path.join(HERE, "content.en.json"), encoding="utf-8"))
    CONTENT = dict(CONTENT, **_en)                  # يستبدل المصفوفات المترجمة
    TPL = json.load(open(os.path.join(HERE, "i18n.en.json"), encoding="utf-8"))
else:
    TPL = {}
_S = CONTENT["settings"]
_TPL_KEYS = sorted(TPL.keys(), key=len, reverse=True)

SITE_URL   = _S["site_url"].rstrip("/")
BRAND      = _S["brand"]
BRAND_SHORT= _S["brand_short"]
PHONE_MAIN = _S["phone_main"]
PHONE_MOB  = _S["phone_mob"]
WA_NUMBER  = _S["wa_number"]
EMAIL      = _S["email"]
EMAIL_HR   = _S["email_hr"]
ADDRESS    = _S["address"]
# نسخة معاينة؟ تمنع أرشفة الموقع التجريبي في جوجل حتى لا ينافس موقع العميل
NOINDEX    = bool(_S.get("noindex", False))
WA_LINK    = ("https://api.whatsapp.com/send/?phone=" + WA_NUMBER + "&text="
              "%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20"
              "%D8%A3%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1"
              "%20%D8%B9%D9%86%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%D9%83%D9%85&type=phone_number&app_absent=0")


# ============================================================
#  التعريب / التدويل
# ============================================================
_AR_RE = re.compile(r"[\u0600-\u06FF]")

def localize(doc, filename):
    """يحوّل صفحة عربية مولّدة إلى نسختها الإنجليزية."""
    # 1) استبدال عبارات القوالب (الأطول أولاً حتى لا تُكسر العبارات المركّبة)
    for ar in _TPL_KEYS:
        en = TPL[ar]
        if ar in doc:
            doc = doc.replace(ar, en)
    # 2) مسارات الأصول أصبحت مستوى أعمق
    doc = doc.replace('"assets/', '"../assets/')
    doc = doc.replace("(../assets/", "(../assets/")
    # 3) اتجاه ولغة المستند
    doc = doc.replace('<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">')
    doc = doc.replace('og:locale" content="ar_SA"', 'og:locale" content="en_US"')
    doc = doc.replace('"inLanguage":"ar"', '"inLanguage":"en"')
    # 4) الروابط المطلقة تشير لمجلد /en/ — مع استثناء وسوم hreflang
    alt = alt_links(filename)
    doc = doc.replace(alt, "@@ALT@@")
    doc = doc.replace(SITE_URL + "/", SITE_URL + "/en/")
    doc = doc.replace(SITE_URL + "/en/en/", SITE_URL + "/en/")
    doc = doc.replace("@@ALT@@", alt)
    return doc

def alt_links(filename):
    """وسوم hreflang + رابط تبديل اللغة."""
    ar_url = SITE_URL + "/" + ("" if filename == "index.html" else filename)
    en_url = SITE_URL + "/en/" + ("" if filename == "index.html" else filename)
    return ('\n  <link rel="alternate" hreflang="ar" href="%s">'
            '\n  <link rel="alternate" hreflang="en" href="%s">'
            '\n  <link rel="alternate" hreflang="x-default" href="%s">' % (ar_url, en_url, ar_url))

# ============================================================
#  الأيقونات
# ============================================================
ICONS = {
 "consult":'<path d="M12 3 3 8v8l9 5 9-5V8z"/><path d="M12 12 3 8m9 4 9-4m-9 4v9"/>',
 "count":'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 "optimize":'<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
 "move":'<rect x="2" y="7" width="13" height="10" rx="2"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
 "4pl":'<path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-7h6v7"/>',
 "audit":'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M9 11h4M11 9v4"/>',
 "label":'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 "supervise":'<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 8.5a2.6 2.6 0 1 0 0-.1M21.5 20a4.6 4.6 0 0 0-4-4.5"/>',
 "phone":'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 "mail":'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
 "pin":'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
 "clock":'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 "shield":'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 "chart":'<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/>',
 "team":'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.5"/><path d="M2 20a6 6 0 0 1 12 0M15.5 14.5A5.5 5.5 0 0 1 22 20"/>',
 "gear":'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.9 19l-.1.1A2 2 0 1 1 5 16.3l.1-.1A1.6 1.6 0 0 0 4 13.5H4a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5.2 6.8l-.1-.1A2 2 0 1 1 7.9 3.9l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/>',
 "box":'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 21v-8"/>',
 "spark":'<path d="M12 2 14.5 9.5 22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
 "target":'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
 "doc":'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
}
def ico(n): return '<svg viewBox="0 0 24 24" aria-hidden="true">%s</svg>' % ICONS.get(n, ICONS["box"])

# ============================================================
#  الخدمات
# ============================================================
SERVICES = CONTENT["services"]
SVC = {x["slug"]: x for x in SERVICES}

# ============================================================
#  القائمة
# ============================================================
NAV = [
 ("index.html", "الرئيسية", None),
 ("about.html", "من نحن", [
    ("about.html", "ما الذي نقوم به"),
    ("strength.html", "قوتنا وما يميزنا"),
    ("methodology.html", "منهجية العمل"),
    ("results.html", "النتائج المتوقعة"),
 ]),
 ("services.html", "خدماتنا", [(s["slug"] + ".html", s["nav"]) for s in SERVICES]),
 ("sectors.html", "عملاؤنا", [
    ("sectors.html", "القطاعات التي نخدمها"),
    ("who-needs-us.html", "من يحتاج خدماتنا؟"),
    ("achievements.html", "الإنجازات"),
 ]),
 ("news.html", "الأحداث والأنشطة", None),
 ("blog.html", "المدونة", None),
 ("careers.html", "وظائف", None),
 ("contact.html", "اتصل بنا", None),
]

# ============================================================
#  بيانات الأحداث والإنجازات والعملاء
# ============================================================
EVENTS = CONTENT["events"]
ACHIEVEMENTS = CONTENT["achievements"]
POSTS = CONTENT.get("posts", [])

CLIENTS = [(c["file"], c["name"]) for c in CONTENT["clients"]]

# ============================================================
#  عناصر البناء
# ============================================================
NAV_SHORT_EN = {"news.html": "Events", "sectors.html": "Clients", "about.html": "About"}

def nav_html(current):
    out = []
    for href, label, sub in NAV:
        active = ""
        if href == current or (sub and any(s[0] == current for s in sub)):
            active = " is-active"
        cls = ' class="has-sub"' if sub else ""
        lbl = NAV_SHORT_EN.get(href, label) if IS_EN else label
        out.append('<li%s><a href="%s"%s>%s</a>' % (cls, href, ' class="%s"' % active.strip() if active else "", lbl))
        if sub:
            out.append('<ul class="sub">')
            for sh, sl in sub:
                out.append('<li><a href="%s">%s</a></li>' % (sh, sl))
            out.append("</ul>")
        out.append("</li>")
    return "\n".join(out)

WA_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8A13 13 0 1 0 16 3zm0 23.7c-2 0-4-.5-5.7-1.6l-.4-.2-4 1 1.1-3.9-.3-.4A10.7 10.7 0 1 1 16 26.7zm6-8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.1 2.2.9 3 1 4.1.8.7-.1 2-.8 2.2-1.6.3-.8.3-1.5.2-1.6z"/></svg>'

def header_html(current):
    LANG_HREF  = ("../" + ("" if current == "index.html" else current)) if IS_EN else ("en/" + ("" if current == "index.html" else current))
    LANG_CODE  = "ar" if IS_EN else "en"
    LANG_TEXT  = "العربية" if IS_EN else "EN"
    LANG_LABEL = "التبديل إلى العربية" if IS_EN else "Switch to English"
    return f'''<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="index.html" aria-label="{BRAND} — الصفحة الرئيسية">
      <img class="logo-white" src="assets/img/logo-white.png" alt="{BRAND}" width="822" height="155">
      <img class="logo-navy" src="assets/img/logo-navy.png" alt="{BRAND}" width="822" height="155">
    </a>
    <nav aria-label="القائمة الرئيسية">
      <ul class="nav" id="mainnav">
{nav_html(current)}
      </ul>
    </nav>
    <div class="header-cta">
      <a class="lang-switch" href="{LANG_HREF}" hreflang="{LANG_CODE}" aria-label="{LANG_LABEL}">{LANG_TEXT}</a>
      <a class="btn btn--primary btn--sm" href="contact.html">اطلب استشارة مجاناً</a>
      <button class="burger" type="button" aria-label="فتح القائمة" aria-expanded="false" aria-controls="mainnav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>'''

def footer_html():
    svc_links = "\n".join('<li><a href="%s.html">%s</a></li>' % (s["slug"], s["nav"]) for s in SERVICES[:6])
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="assets/img/logo-white.png" alt="{BRAND}" width="822" height="155" loading="lazy">
        <p>منشأة سعودية رائدة متخصصة في حلول واستشارات جرد المخزون وإدارة المستودعات وتطوير العمليات اللوجستية — الشركة الوحيدة في المملكة التي تقدم هذه الحزمة المتكاملة تحت سقف واحد.</p>
        <div class="social">
          <a href="{WA_LINK}" target="_blank" rel="noopener" aria-label="واتساب">{WA_SVG}</a>
          <a href="mailto:{EMAIL}" aria-label="البريد الإلكتروني"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg></a>
          <a href="tel:{PHONE_MOB}" aria-label="اتصال هاتفي"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1z"/></svg></a>
        </div>
      </div>
      <div>
        <h4>خدماتنا</h4>
        <ul>{svc_links}
          <li><a href="services.html">كل الخدمات</a></li>
        </ul>
      </div>
      <div>
        <h4>الشركة</h4>
        <ul>
          <li><a href="about.html">ما الذي نقوم به</a></li>
          <li><a href="strength.html">قوتنا وما يميزنا</a></li>
          <li><a href="methodology.html">منهجية العمل</a></li>
          <li><a href="results.html">النتائج المتوقعة</a></li>
          <li><a href="sectors.html">القطاعات التي نخدمها</a></li>
          <li><a href="achievements.html">الإنجازات</a></li>
          <li><a href="blog.html">المدونة</a></li>
          <li><a href="careers.html">وظائف</a></li>
        </ul>
      </div>
      <div>
        <h4>تواصل معنا</h4>
        <ul>
          <li>{ADDRESS}</li>
          <li><a href="tel:{PHONE_MOB}" dir="ltr">{PHONE_MOB}</a></li>
          <li><a href="tel:{PHONE_MAIN}" dir="ltr">{PHONE_MAIN}</a></li>
          <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
          <li><a href="{WA_LINK}" target="_blank" rel="noopener">راسلنا على واتساب</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span data-year>2026</span> {BRAND}. جميع الحقوق محفوظة.</span>
      <span>الرياض — المملكة العربية السعودية</span>
    </div>
  </div>
</footer>
<a class="wa-float" href="{WA_LINK}" target="_blank" rel="noopener" aria-label="تواصل معنا عبر واتساب">{WA_SVG}</a>'''

ORG_JSONLD = {
  "@context":"https://schema.org","@type":"ProfessionalService",
  "@id": SITE_URL + "/#organization",
  "name": BRAND, "alternateName":["United Integrated Logistics","التكامل المتحدة"],
  "url": SITE_URL + "/", "logo": SITE_URL + "/assets/img/logo-navy.png",
  "image": SITE_URL + "/assets/img/hero/hero-1.jpg",
  "description":"شركة سعودية متخصصة في استشارات وحلول جرد المخزون، إدارة وتشغيل المستودعات، وتحسين العمليات اللوجستية.",
  "email": EMAIL,
  "telephone": PHONE_MOB,
  "priceRange":"$$",
  "address":{"@type":"PostalAddress","streetAddress":"طريق الملك فهد، مبنى الصالحية، الطابق السابع",
             "addressLocality":"الرياض","addressCountry":"SA"},
  "areaServed":{"@type":"Country","name":"المملكة العربية السعودية"},
  "knowsLanguage":["ar","en"],
  "sameAs":[],
  "contactPoint":[{"@type":"ContactPoint","telephone":PHONE_MOB,"contactType":"customer service",
                   "areaServed":"SA","availableLanguage":["Arabic","English"]}],
  "hasOfferCatalog":{"@type":"OfferCatalog","name":"الخدمات اللوجستية",
     "itemListElement":[{"@type":"Offer","itemOffered":{"@type":"Service","name":s["title"],
        "url": SITE_URL + "/" + s["slug"] + ".html"}} for s in SERVICES]}
}

def crumbs_jsonld(items):
    return {"@context":"https://schema.org","@type":"BreadcrumbList",
      "itemListElement":[{"@type":"ListItem","position":i+1,"name":n,
                          "item":SITE_URL+"/"+u} for i,(n,u) in enumerate(items)]}

def page(filename, title, desc, body, current=None, extra_jsonld=None,
         og_image="assets/img/hero/hero-1.jpg", body_class="", keywords=""):
    current = current or filename
    ld = [ORG_JSONLD] + (extra_jsonld or [])
    ld_html = "\n".join(
        '<script type="application/ld+json">%s</script>' % json.dumps(x, ensure_ascii=False, separators=(",", ":"))
        for x in ld)
    canonical = SITE_URL + "/" + ("" if filename == "index.html" else filename)
    alt = alt_links(filename)
    kw = ('\n  <meta name="keywords" content="%s">' % keywords) if keywords else ""
    ROBOTS = "noindex, nofollow" if NOINDEX else "index, follow, max-image-preview:large, max-snippet:-1"
    doc = f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">{kw}
  <link rel="canonical" href="{canonical}">{alt}
  <meta name="robots" content="{ROBOTS}">
  <meta name="author" content="{BRAND}">
  <meta name="theme-color" content="#1e4d82">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ar_SA">
  <meta property="og:site_name" content="{BRAND}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{SITE_URL}/{og_image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{SITE_URL}/{og_image}">
  <link rel="icon" href="assets/img/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="assets/img/favicon.png">
  <link rel="preconnect" href="{SITE_URL}">
  <link rel="preload" href="assets/fonts/thmanyahsans-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/thmanyahserifdisplay-Bold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/css/main.css?v={ASSET_V}">
{ld_html}
</head>
<body{(' class="%s"' % body_class) if body_class else ''}>
<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
{header_html(current)}
<main id="main">
{body}
</main>
{footer_html()}
<script src="assets/js/main.js?v={ASSET_V}" defer></script>
</body>
</html>'''
    if IS_EN:
        doc = localize(doc, filename)
    with open(os.path.join(OUTDIR, filename), "w", encoding="utf-8") as f:
        f.write(doc)
    return filename

# ------- مكوّنات مشتركة -------
def page_hero(title, sub, crumbs):
    c = '<ol class="crumbs"><li><a href="index.html">الرئيسية</a></li>' + \
        "".join('<li>%s</li>' % (('<a href="%s">%s</a>' % (u, n)) if u else n) for n, u in crumbs) + "</ol>"
    return f'''<section class="page-hero">
  <div class="wrap"><div class="page-hero__in">
    {c}
    <h1>{title}</h1>
    <p>{sub}</p>
  </div></div>
</section>'''

def cta_band(title="جاهزون لرفع كفاءة مستودعك؟",
             text="احجز استشارة أولية مع فريق التكامل المتحدة — نستمع لتحدياتك، ونحدد معك أسرع طريق لخفض التكلفة ورفع الدقة."):
    return f'''<section class="section">
  <div class="wrap">
    <div class="cta" data-reveal>
      <h2>{title}</h2>
      <p>{text}</p>
      <div class="cta__actions">
        <a class="btn btn--gold" href="{WA_LINK}" target="_blank" rel="noopener">تواصل عبر واتساب</a>
        <a class="btn btn--light" href="contact.html">اطلب عرض سعر</a>
        <a class="btn btn--light" href="tel:{PHONE_MOB}" dir="ltr">{PHONE_MOB}</a>
      </div>
    </div>
  </div>
</section>'''

def band(img, alt, eyebrow, title, text, extra="", cta=""):
    return f'''<section class="band">
  <img class="band__bg" src="{img}" alt="{alt}" loading="lazy" decoding="async">
  <div class="band__in" data-reveal>
    <span class="eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <p>{text}</p>
    {extra}
    {cta}
  </div>
</section>'''

def svc_card(s, delay=0):
    return f'''<article class="card card--link" data-reveal="{delay}">
  <div class="card__ico">{ico(s["icon"])}</div>
  <h3><a href="{s["slug"]}.html">{s["title"]}</a></h3>
  <p>{s["short"]}</p>
  <span class="card__more">تفاصيل الخدمة</span>
</article>'''

USER_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>'

def chat(pairs):
    rows = []
    for q, a in pairs:
        rows.append(
          '<div class="chat__row chat__row--q">'
          '<span class="chat__ava" aria-hidden="true">' + USER_ICO + '</span>'
          '<span class="typing" aria-hidden="true"><i></i><i></i><i></i></span>'
          '<div class="bubble bubble--q">' + q + '</div></div>')
        rows.append(
          '<div class="chat__row chat__row--a">'
          '<div class="bubble bubble--a">' + a + '</div>'
          '<span class="typing" aria-hidden="true"><i></i><i></i><i></i></span>'
          '<span class="chat__ava" aria-hidden="true">'
          '<img src="assets/img/favicon.png" alt="" width="512" height="512" loading="lazy"></span></div>')
    return '<div class="chat">' + "".join(rows) + '</div>'

def li(items, cls="checks"):
    return '<ul class="%s">%s</ul>' % (cls, "".join("<li>%s</li>" % i for i in items))

# ============================================================
#  الصفحة الرئيسية
# ============================================================
HERO_SLIDES = [
 ("hero-1.jpg","مستودع منظّم بعد تطبيق حلول التكامل المتحدة"),
 ("hero-2.jpg","فريق التكامل المتحدة أثناء تحسين عمليات المستودع"),
 ("hero-3.jpg","تحليل بيانات المخزون ومؤشرات الأداء"),
 ("hero-4.jpg","فريق الجرد الميداني داخل مستودع العميل"),
]

STRENGTH_ITEMS = '\n      <article class="fgrid__item" data-reveal="0"><span class="fgrid__n">01</span><h3>الريادة والتفرّد</h3><p>الشركة الوحيدة في المملكة التي تجمع الخدمات الاستشارية والتنفيذية اللوجستية تحت سقف واحد.</p></article>\n      <article class="fgrid__item" data-reveal="50"><span class="fgrid__n">02</span><h3>خفض تكاليف مضمون</h3><p>حلول مبتكرة لخفض تكاليف التشغيل بنسبة قد تصل إلى 20% — نسبة يمكن أن نلتزم بها في العقد.</p></article>\n      <article class="fgrid__item" data-reveal="100"><span class="fgrid__n">03</span><h3>نموذج قائم على النتائج</h3><p>يمكننا ربط أتعابنا بنسبة من التوفير الذي نحققه لك — نحن نربح عندما توفّر أنت.</p></article>\n      <article class="fgrid__item" data-reveal="150"><span class="fgrid__n">04</span><h3>لسنا مجرد مستشارين</h3><p>نستمر مع العميل ونتابع تنفيذ ما قدّمناه ميدانياً حتى تتحقق جميع الأهداف المتفق عليها.</p></article>\n      <article class="fgrid__item" data-reveal="200"><span class="fgrid__n">05</span><h3>خبرة متخصصة في الجرد</h3><p>فريق مختص في تخطيط وتنفيذ والإشراف على الجرد بكافة أنواعه: السنوي، المستمر، والمفاجئ.</p></article>\n      <article class="fgrid__item" data-reveal="250"><span class="fgrid__n">06</span><h3>فريق من الخبراء</h3><p>مجموعة متميزة من المهنيين والاستشاريين المتخصصين في كل مجالات العمل بالمستودعات وإدارة المخزون.</p></article>'

RESULT_FACTS = '<div class="band__facts"><div><b>20%</b><span>خفض في تكلفة عمليات المستودعات</span></div><div><b>100%</b><span>تطابق المخزون الفعلي مع الدفتري</span></div><div><b>SOPs</b><span>إجراءات قياسية معتمدة ومستدامة</span></div></div>'

def build_index():
    slides = "".join(
      '<div class="hero__slide%s"><img src="assets/img/hero/%s" alt="%s" %s width="1600" height="900"></div>'
      % (" is-on" if i==0 else "", f, a, 'fetchpriority="high"' if i==0 else 'loading="lazy"')
      for i,(f,a) in enumerate(HERO_SLIDES))
    dots = "".join('<button type="button"%s aria-label="الشريحة %d"></button>' % (' class="is-on"' if i==0 else "", i+1)
                   for i in range(len(HERO_SLIDES)))
    cards = "\n".join(svc_card(s, i*60) for i,s in enumerate(SERVICES))
    logos = "".join('<div class="marquee__item"><img src="assets/img/clients/%s" alt="%s — من عملاء التكامل المتحدة" loading="lazy" decoding="async" width="148" height="148"></div>' % (f,n)
                    for f,n in CLIENTS)

    faq = [
      ("ما الذي يميز التكامل المتحدة عن غيرها من الشركات اللوجستية؟",
       "نحن الشركة الوحيدة في المملكة التي تقدّم هذه الحزمة المتكاملة تحت سقف واحد: استشارات، جرد، تشغيل وإدارة، إشراف، تدقيق، ترميز، ونقل مستودعات. ولا يتوقف دورنا عند التقرير الاستشاري، بل نتابع التنفيذ ميدانياً حتى تتحقق الأهداف المتفق عليها."),
      ("كم يمكن أن توفّروا من تكاليف تشغيل المستودع؟",
       "نقدّم حلولاً مبتكرة لخفض تكاليف العمليات والتشغيل بنسبة قد تصل إلى 20%، وهي نسبة يمكن أن نلتزم بها تعاقدياً. بل ولثقتنا في حلولنا، يمكننا ربط أتعابنا مباشرةً بنسبة من التوفير الذي نحققه لك."),
      ("هل تقدّمون خدمة الجرد كطرف ثالث محايد؟",
       "نعم. نعمل كطرف ثالث مستقل ومحايد لجرد البضائع والمخزون والأصول الثابتة، ونُصدر تقرير فروقات دقيقاً بين الرصيد الفعلي والرصيد الدفتري، يصلح مرجعاً تدقيقياً أمام المراجعين الداخليين والخارجيين."),
      ("ما أنواع الجرد التي تنفذونها؟",
       "الجرد السنوي الشامل (Wall-to-Wall)، والجرد المستمر الدوري (Cycle Counting) وفق تصنيف ABC، والجرد المفاجئ الرقابي (Spot Audits)، إضافة إلى حصر وجرد الأصول الثابتة."),
      ("ما القطاعات التي تخدمونها؟",
       "جميع القطاعات: المستلزمات الصيدلانية والطبية، قطع الغيار، الإلكترونيات، المواد الغذائية، التجزئة، المقاولات والصناعة وغيرها — وفي أي حجم: مستودع كبير، مخزن صغير، أو مستودع مصنع (مواد خام وسلع تامة الصنع)."),
      ("في أي مدن تعملون؟",
       "نخدم عملاءنا في جميع مناطق المملكة، ولدينا مشاريع منفّذة في الرياض، جدة، الدمام والمنطقة الشرقية، والقصيم."),
    ]
    faq_html = chat(faq)
    faq_ld = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faq]}
    site_ld = {"@context":"https://schema.org","@type":"WebSite","url":SITE_URL+"/","name":BRAND,
               "inLanguage":"ar","publisher":{"@id":SITE_URL+"/#organization"}}

    body = f'''
<section class="hero">
  <div class="hero__slides">{slides}</div>
  <div class="wrap hero__inner">
    <span class="hero__eyebrow">شركة سعودية متخصصة في تطوير وجرد المستودعات</span>
    <h1>نحوّل مستودعك من <em>مركز تكلفة</em> إلى محرّك نمو</h1>
    <p>استشارات وحلول متكاملة في جرد المخزون، وإدارة وتشغيل المستودعات، وتحسين العمليات اللوجستية — بمنهجية تبدأ من التشخيص ولا تنتهي إلا بنتائج ملموسة على أرض الواقع.</p>
    <div class="hero__actions">
      <a class="btn btn--gold" href="contact.html">اطلب استشارة مجانية</a>
      <a class="btn btn--light" href="services.html">استعرض خدماتنا</a>
    </div>
    <div class="hero__dots" role="tablist" aria-label="شرائح العرض">{dots}</div>
  </div>
  <div class="hero-strip">
    <div class="wrap">
      <div class="hero-strip__grid">
        <div class="hero-strip__cell"><b><span data-count="20">0</span><span class="suf">%</span></b><span>خفض في تكاليف التشغيل</span></div>
        <div class="hero-strip__cell"><b><span data-count="8">0</span></b><span>خدمات لوجستية متكاملة</span></div>
        <div class="hero-strip__cell"><b><span data-count="23">0</span><span class="suf">+</span></b><span>جهة تثق بنا</span></div>
        <div class="hero-strip__cell"><b><span data-count="4">0</span></b><span>مناطق تشغيل في المملكة</span></div>
      </div>
    </div>
  </div>
</section>

{band("assets/img/hero/hero-2.jpg","فريق التكامل المتحدة داخل مستودع أحد العملاء",
  "من نحن","منشأة سعودية رائدة في حلول واستشارات المستودعات",
  "نطوّر عمليات عملائنا، ونرفع الإنتاجية، ونخفض تكاليف التشغيل — بحلول مصمّمة لحالتك، لا حلول جاهزة.",
  '<ul class="band__pills"><li>إدارة وتشغيل المستودعات</li><li>الإشراف اللوجستي</li><li>تحسين العمليات</li><li>ضبط ومراقبة المخزون</li></ul>',
  '<a class="btn btn--gold" href="about.html">تعرّف علينا</a>')}

<section class="section section--tint">
  <div class="wrap">
    <div class="sec-head center">
      <span class="eyebrow">خدماتنا</span>
      <h2>حزمة متكاملة من الخدمات اللوجستية تحت سقف واحد</h2>
      <p>من الاستشارة والتشخيص، إلى التنفيذ والتشغيل والمتابعة — كل ما يحتاجه مستودعك في مكان واحد.</p>
    </div>
    <div class="grid grid--4">
{cards}
    </div>
  </div>
</section>

<section class="section section--navy">
  <img class="sec-bg" src="assets/img/hero/hero-4.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async">
  <span class="sec-veil" aria-hidden="true"></span>
  <div class="wrap">
    <div class="sec-head center">
      <span class="eyebrow">قوتنا</span>
      <h2>لماذا يختارنا كبار العملاء في السعودية؟</h2>
      <p>تكمن قوتنا الرئيسية في كوننا الشركة الوحيدة في المملكة التي تقدّم هذه الحزمة المتكاملة من الخدمات، بخبرة وتخصص عميق في كل ما يختص بعمل المستودعات.</p>
    </div>
    <div class="fgrid">{STRENGTH_ITEMS}
    </div>
    <div style="text-align:center;margin-top:44px"><a class="btn btn--gold" href="strength.html">اقرأ المزيد عن قوتنا</a></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head center">
      <span class="eyebrow">منهجية العمل</span>
      <h2>من التشخيص إلى النتائج المستدامة</h2>
      <p>لا نعالج الأعراض — بل نحدّد مصدر المشكلة ونقدّم حلولاً تحلّها من جذورها، عبر أربع مراحل متسلسلة.</p>
    </div>
    <div class="steps">
      <article class="step" data-reveal><div class="step__n">01</div><div>
        <h3>التقييم والتشخيص (Evaluation)</h3>
        <p>دراسة وتحليل شامل للوضع الحالي (As-Is) داخل المستودع: تحليل الممارسات اليومية، والمقارنة المعيارية مع أفضل الممارسات، ورصد الفجوات في تقرير مفصّل.</p></div></article>
      <article class="step" data-reveal><div class="step__n">02</div><div>
        <h3>تصميم الحلول المخصّصة (Design)</h3>
        <p>تصميم حلول تعالج جذور المشكلات، وتحديد المتطلبات اللازمة (موارد، تدريب، تقنية)، وتوضيح المخرجات والمؤشرات — ثم مناقشتها والاتفاق عليها بالكامل قبل التنفيذ.</p></div></article>
      <article class="step" data-reveal><div class="step__n">03</div><div>
        <h3>التنفيذ وإدارة التغيير (Implementation)</h3>
        <p>تنفيذ الحلول على أرض الواقع وفق خطة واضحة: جدول زمني محدّد، محطات رئيسية (Milestones)، وتوزيع دقيق للمسؤوليات.</p></div></article>
      <article class="step" data-reveal><div class="step__n">04</div><div>
        <h3>الرصد والمتابعة (Monitoring)</h3>
        <p>المرحلة الأهم: قياس الأداء للتأكد من تحقّق النتائج، ورصد أي انحراف عن المسار ومعالجته فوراً لضمان استدامة النتائج.</p></div></article>
    </div>
    <div style="text-align:center;margin-top:40px"><a class="btn btn--ghost" href="methodology.html">تفاصيل المنهجية كاملة</a></div>
  </div>
</section>

{band("assets/img/hero/hero-3.jpg","تقارير ومؤشرات أداء المستودعات",
  "النتائج المتوقعة","قيمة ملموسة تستطيع قياسها",
  "شريك متخصص بجانبك خطوة بخطوة نحو مستقبل أكثر كفاءة وربحية لأعمالك.",
  RESULT_FACTS,
  '<a class="btn btn--gold" href="results.html">اطّلع على النتائج</a>')}

<section class="section">
  <div class="wrap">
    <div class="sec-head center">
      <span class="eyebrow">من عملائنا</span>
      <h2>جهات حكومية وشركات رائدة تثق بنا</h2>
    </div>
  </div>
  <div class="marquee" data-reveal>
    <div class="marquee__track">{logos}{logos}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="sec-head center">
      <span class="eyebrow">الأسئلة الشائعة</span>
      <h2>إجابات سريعة عمّا يشغل بال مديري المستودعات</h2>
    </div>
    {faq_html}
  </div>
</section>

{cta_band()}
'''
    return page("index.html",
        "التكامل المتحدة | استشارات وجرد وإدارة المستودعات في السعودية",
        "شركة سعودية متخصصة في استشارات المستودعات، جرد المخزون والأصول، تشغيل وإدارة المستودعات (4PL)، وتحسين العمليات اللوجستية — خفض تكاليف التشغيل حتى 20%.",
        body, extra_jsonld=[site_ld, faq_ld],
        keywords="جرد مخزون, شركة جرد مستودعات, استشارات لوجستية, إدارة المستودعات, تحسين العمليات اللوجستية, جرد الأصول الثابتة, 4PL السعودية, تشغيل مستودعات, الرياض, جدة, الدمام")

ABOUT_QUOTE = '<blockquote><p>شعارنا: الفهم العميق لاحتياجات وأهداف العميل، والعمل على توفير أفضل الحلول والاستشارات المناسبة التي تضمن تحقيق تلك الأهداف.</p></blockquote>'
ABOUT_ITEMS = '\n    <article class="fgrid__item" data-reveal="0"><span class="fgrid__n">01</span><h3>الإدارة والتشغيل الكامل</h3><p>نتولّى تشغيل مستودعك بالكامل بفريقنا المتخصص وفق مؤشرات أداء متفق عليها.</p></article>\n    <article class="fgrid__item" data-reveal="50"><span class="fgrid__n">02</span><h3>الإشراف اللوجستي</h3><p>نقود فريقك الحالي ونوجّهه لرفع الإنتاجية دون تغيير في هيكل العمالة.</p></article>\n    <article class="fgrid__item" data-reveal="100"><span class="fgrid__n">03</span><h3>تطوير وتحسين العمليات</h3><p>إعادة هندسة إجراءات الاستلام والتخزين والصرف لتقليل الأخطاء وتسريع الدورة.</p></article>\n    <article class="fgrid__item" data-reveal="150"><span class="fgrid__n">04</span><h3>ضبط ومراقبة المخزون</h3><p>برامج جرد دورية وضوابط رقابية تحافظ على تطابق الفعلي مع الدفتري طوال العام.</p></article>\n    <article class="fgrid__item" data-reveal="200"><span class="fgrid__n">05</span><h3>خفض تكاليف التشغيل</h3><p>تحديد مصادر الهدر وتطبيق حلول قابلة للقياس تصل بالتوفير إلى 20%.</p></article>\n    <article class="fgrid__item" data-reveal="250"><span class="fgrid__n">06</span><h3>خبرة عابرة للقطاعات</h3><p>صيدلاني، غذائي، قطع غيار، إلكترونيات، صناعي، وجهات حكومية.</p></article>'

# ============================================================
#  صفحات الشركة
# ============================================================
def build_about():
    body = page_hero("ما الذي نقوم به",
        "«التكامل المتحدة» منشأة سعودية رائدة متخصصة في تقديم حلول واستشارات مبتكرة في مجالات جرد المخزون، إدارة المستودعات، وكافة العمليات اللوجستية.",
        [("من نحن", None)]) + f'''
{band("assets/img/hero/hero-4.jpg","عمليات الجرد الميداني لدى التكامل المتحدة",
  "من نحن","حلول لوجستية مبتكرة لتطوير العمليات وخفض التكاليف",
  "نطوّر عمليات عملائنا ونرفع إنتاجيتهم ونخفض تكاليف تشغيلهم — من المستودع الواحد إلى شبكات المستودعات المتعدّدة.",
  ABOUT_QUOTE)}

<section class="section"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">لماذا تختار «التكامل المتحدة»؟</span>
    <h2>حزمة خدمات متكاملة فريدة في السوق السعودي</h2></div>
  <div class="fgrid">{ABOUT_ITEMS}</div>
</div></section>

<section class="section section--tint">
  <div class="wrap">
    <div class="sec-head center"><span class="eyebrow">رؤيتنا ورسالتنا وقيمنا</span><h2>ما الذي يقود عملنا كل يوم</h2></div>
    <div class="grid grid--3">
      <article class="card" data-reveal><div class="card__ico">{ico("target")}</div><h3>رؤيتنا</h3>
        <p>أن نكون الشريك الأول للمنشآت في المملكة لرفع كفاءة المستودعات ودقة المخزون، ومرجعاً موثوقاً في الاستشارات اللوجستية.</p></article>
      <article class="card" data-reveal="80"><div class="card__ico">{ico("spark")}</div><h3>رسالتنا</h3>
        <p>معالجة التحديات التي تواجه عملاءنا — سواء ارتفاع التكاليف أو انخفاض الكفاءة أو الحاجة لتطوير جذري — بحلول عملية قابلة للقياس.</p></article>
      <article class="card" data-reveal="160"><div class="card__ico">{ico("shield")}</div><h3>قيمنا</h3>
        <p>الحياد والاستقلالية في التقييم، والشفافية الكاملة قبل التنفيذ، والالتزام بالنتائج لا بالتقارير فقط.</p></article>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head center"><span class="eyebrow">خدماتنا</span><h2>ثماني خدمات تغطي دورة حياة المستودع كاملة</h2></div>
    <div class="grid grid--4">{"".join(svc_card(s, i*50) for i,s in enumerate(SERVICES))}</div>
  </div>
</section>
{cta_band()}
'''
    return page("about.html","من نحن | التكامل المتحدة للخدمات اللوجستية — حلول وإدارة المستودعات",
        "تعرّف على التكامل المتحدة: منشأة سعودية متخصصة في جرد المخزون وإدارة وتشغيل المستودعات وتطوير العمليات اللوجستية، بحزمة خدمات متكاملة فريدة في السوق السعودي.",
        body, extra_jsonld=[crumbs_jsonld([("الرئيسية",""),("من نحن","about.html")])],
        og_image="assets/img/hero/hero-4.jpg")

def build_strength():
    items = [
      ("spark","الريادة والتفرّد","نحن الشركة الوحيدة في المملكة التي تقدّم هذه المجموعة المتكاملة من الخدمات اللوجستية الاستشارية والتنفيذية تحت سقف واحد — فلا تحتاج للتنسيق بين عدة مورّدين."),
      ("chart","خفض التكاليف المضمون","نقدّم حلولاً إبداعية ومبتكرة لخفض تكاليف العمليات والتشغيل بنسبة قد تصل إلى 20%، وهي نسبة يمكن أن نلتزم بها في العقد."),
      ("target","نموذج عمل قائم على النتائج","لثقتنا المطلقة في حلولنا، يمكننا ربط أتعابنا مباشرةً بنسبة من التوفير الذي نحققه للعميل — نحن نربح عندما توفّر أنت."),
      ("gear","لسنا مجرد مستشارين","لا يقتصر دورنا على تقديم حلول نظرية؛ بل نستمر مع العميل ونتابع تنفيذ ما قدّمناه (الرصد والمتابعة) حتى تتحقق جميع الأهداف المتفق عليها على أرض الواقع."),
      ("count","خبرة متخصصة في الجرد","نمتلك فريقاً مختصاً ومحترفاً في تخطيط وتنفيذ والإشراف على عمليات الجرد بكافة أنواعها: الجرد السنوي، المستمر، والمفاجئ."),
      ("team","فريق من الخبراء","مجموعة متميزة من المهنيين والخبراء والاستشاريين المتخصصين في كل مجالات العمل في المستودعات وإدارة المخزون."),
    ]
    cards = "".join(f'''<article class="card" data-reveal="{i*60}"><div class="card__ico">{ico(k)}</div><h3>{t}</h3><p>{d}</p></article>''' for i,(k,t,d) in enumerate(items))
    body = page_hero("قوتنا وما يميّزنا",
        "تكمن قوة «التكامل المتحدة» الرئيسية في كوننا الشركة الوحيدة في المملكة التي تقدّم هذه الحزمة المتكاملة من الخدمات، بخبرة وتخصص عميق في كل ما يختص بعمل المستودعات — من الإدارة والتشغيل إلى التطوير والتحسين.",
        [("من نحن","about.html"),("قوتنا",None)]) + f'''
<section class="section"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">نقاط القوة</span><h2>ستة أسباب تجعل الفارق ملموساً</h2></div>
  <div class="grid grid--3">{cards}</div>
</div></section>

<section class="section section--navy"><img class="sec-bg" src="assets/img/hero/hero-2.jpg" alt="" aria-hidden="true" loading="lazy" decoding="async"><span class="sec-veil" aria-hidden="true"></span><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">بالأرقام</span><h2>ما الذي يعنيه ذلك لأعمالك؟</h2></div>
  <div class="stats">
    <div class="stat" data-reveal><b><span data-count="20">0</span><span class="suf">%</span></b><span>خفض ممكن في تكاليف التشغيل</span></div>
    <div class="stat" data-reveal="70"><b><span data-count="100">0</span><span class="suf">%</span></b><span>حياد واستقلالية في تقارير الجرد</span></div>
    <div class="stat" data-reveal="140"><b><span data-count="4">0</span></b><span>مراحل عمل من التشخيص للمتابعة</span></div>
    <div class="stat" data-reveal="210"><b><span data-count="8">0</span></b><span>خدمات متكاملة تحت سقف واحد</span></div>
  </div>
</div></section>
{cta_band("هل ترغب بمعرفة حجم التوفير الممكن في مستودعك؟","تواصل معنا لجلسة تقييم أولية — نستعرض معك وضع مستودعك الحالي ونحدد فرص التحسين وحجم التوفير المتوقع.")}
'''
    return page("strength.html","قوتنا | لماذا تختار التكامل المتحدة لإدارة وتطوير مستودعك؟",
        "الشركة الوحيدة في المملكة التي تجمع الاستشارات والتنفيذ اللوجستي تحت سقف واحد: خفض تكاليف حتى 20%، نموذج أتعاب مرتبط بالنتائج، ومتابعة ميدانية حتى تحقيق الأهداف.",
        body, extra_jsonld=[crumbs_jsonld([("الرئيسية",""),("من نحن","about.html"),("قوتنا","strength.html")])])

def build_methodology():
    steps = [
      ("01","التقييم والتشخيص (Evaluation)",
       "هي مرحلة الفهم العميق للواقع. يقوم فريقنا بإجراء دراسة وتحليل شامل للوضع الحالي (As-Is) داخل المستودع.",
       ["تحليل الممارسات الحالية: دراسة كيفية سير العمليات اليومية.",
        "المقارنة المعيارية: مقارنة الممارسات الحالية مع لوائح وإجراءات العمل المعتمدة لديكم، ومع المعايير القياسية (Best Practices).",
        "رصد الفجوات: تحديد الانحرافات وعدم التطابق، وتقديم تقرير مفصّل بالنتائج والتوصيات الأولية."]),
      ("02","تصميم الحلول المخصّصة (Design)",
       "بناءً على نتائج مرحلة التقييم، يصمّم خبراء «التكامل المتحدة» الحلول المناسبة لحالتك تحديداً.",
       ["تصميم الحلول والاستشارات المناسبة لمعالجة جذور المشاكل التي تم رصدها.",
        "تحديد المتطلبات اللازمة (موارد، تدريب، تقنية) لتنفيذ هذه الحلول.",
        "توضيح النتائج المتوقعة والمؤشرات التي ستُقاس بعد تطبيق الحل.",
        "الشفافية أولاً: مناقشة الحلول والمتطلبات والنتائج بعمق مع العميل والاتفاق عليها بالكامل قبل التنفيذ."]),
      ("03","التنفيذ وإدارة التغيير (Implementation)",
       "بعد موافقة العميل، نبدأ بتنفيذ الحلول المقترحة على أرض الواقع وفق خطة تنفيذ موضوعة.",
       ["الجدول الزمني: تحديد بداية ونهاية العمل بدقة.",
        "مراحل التنفيذ: تقسيم العمل إلى محطات رئيسية (Project Milestones).",
        "الفريق المسؤول: تحديد المسؤوليات لكل مهمة بشكل واضح."]),
      ("04","الرصد والمتابعة (Monitoring & Follow-up)",
       "المرحلة الأهم لضمان النجاح؛ هدفها التأكد من أن الحلول وُضعت في حيّز التنفيذ الصحيح والتُزم بها وفقاً للخطة.",
       ["قياس الأداء: التأكد من تحقّق النتائج المرجوّة (خفض التكلفة، رفع الكفاءة).",
        "التصحيح الفوري: رصد ومعالجة أي انحرافات عن المسار في حينها."]),
    ]
    html_steps = "".join(f'''<article class="step" data-reveal><div class="step__n">{n}</div><div><h3>{t}</h3><p>{d}</p>{li(pts)}</div></article>''' for n,t,d,pts in steps)
    body = page_hero("منهجية العمل",
        "لا تركّز منهجيتنا على معالجة الأعراض، بل تسعى لتحديد مصدر المشاكل والثغرات وتقديم حلول تحلّها من جذورها — عبر أربع مراحل متسلسلة تضمن الانتقال من الفهم العميق للمشكلة إلى تطبيق الحلول وضمان استدامتها.",
        [("من نحن","about.html"),("المنهجية",None)]) + f'''
<section class="section"><div class="wrap">
  <div class="sec-head"><span class="eyebrow">من التشخيص إلى النتائج المستدامة</span><h2>حلول من جذورها لضمان الفعالية</h2></div>
  <div class="steps">{html_steps}</div>
  <blockquote class="prose" style="margin-top:44px"><p>هذه المنهجية تضمن لعملائنا ليس فقط الحصول على استشارة، بل شريكاً حقيقياً يضمن تنفيذ الحلول ورؤية نتائجها على أرض الواقع.</p></blockquote>
</div></section>
{cta_band("ابدأ بمرحلة التقييم والتشخيص","الخطوة الأولى دائماً هي فهم واقع مستودعك. تواصل معنا لتحديد موعد زيارة تقييمية.")}
'''
    ld = {"@context":"https://schema.org","@type":"HowTo","name":"منهجية عمل التكامل المتحدة لتطوير المستودعات",
      "description":"منهجية من أربع مراحل: التقييم والتشخيص، تصميم الحلول، التنفيذ وإدارة التغيير، والرصد والمتابعة.",
      "step":[{"@type":"HowToStep","position":i+1,"name":t,"text":d} for i,(n,t,d,p) in enumerate(steps)]}
    return page("methodology.html","منهجية العمل | من التشخيص إلى النتائج المستدامة — التكامل المتحدة",
        "منهجية التكامل المتحدة من أربع مراحل لتطوير المستودعات: التقييم والتشخيص (As-Is)، تصميم الحلول المخصّصة، التنفيذ وإدارة التغيير، ثم الرصد والمتابعة وقياس الأداء.",
        body, extra_jsonld=[ld, crumbs_jsonld([("الرئيسية",""),("من نحن","about.html"),("المنهجية","methodology.html")])])

def build_results():
    res = [
      ("chart","خفض مباشر للتكاليف","انخفاض ملموس في تكلفة عمليات المستودعات بنسبة قد تصل إلى 20%."),
      ("count","دقة مطلقة للمخزون","أرقام دقيقة وموثوقة للمخزون، وضمان تطابق المخزون الفعلي مع المخزون الدفتري."),
      ("optimize","تحسين كفاءة العمليات","تحسين شامل لجميع عمليات المستودعات ورفع واضح في أداء وإنتاجية الموظفين."),
      ("box","خفض الهدر والمخزون الراكد","تقليل مستويات المخزون غير القابل للبيع: الراكد، التالف، وبطيء الحركة."),
      ("shield","تطبيق أفضل الممارسات","مستودع جيد التنظيم ومرتّب وفقاً لأفضل الممارسات القياسية في المجال."),
      ("doc","تقارير وقنوات اتصال واضحة","تقارير أداء محدّثة ودقيقة، وقنوات اتصال فعّالة بين الأقسام."),
      ("gear","اعتماد إجراءات قياسية (SOPs)","ضمان اعتماد الممارسات القياسية في جميع العمليات لضمان الجودة والاستدامة."),
      ("target","قرارات مبنية على بيانات","تعزيز الثقة في قرارات البيع والشراء والخطط الإنتاجية بناءً على بيانات مخزون دقيقة."),
    ]
    cards = "".join(f'''<article class="card" data-reveal="{i*50}"><div class="card__ico">{ico(k)}</div><h3>{t}</h3><p>{d}</p></article>''' for i,(k,t,d) in enumerate(res))
    body = page_hero("النتائج المتوقعة",
        "التعامل مع «التكامل المتحدة» يعني التعامل مع شركة متخصصة ومحترفة، ستكون بجانبك خطوة بخطوة نحو تحقيق أهدافك وضمان مستقبل أكثر كفاءة وربحية لأعمالك.",
        [("من نحن","about.html"),("النتائج المتوقعة",None)]) + f'''
<section class="section"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">القيمة الملموسة لشراكتكم معنا</span><h2>أهم النتائج التي نحققها لعملائنا</h2>
  <p>شريك متخصص بجانبك نحو النجاح — نتائج قابلة للقياس لا وعوداً عامة.</p></div>
  <div class="grid grid--4">{cards}</div>
</div></section>
{cta_band()}
'''
    return page("results.html","النتائج المتوقعة | قيمة ملموسة وقابلة للقياس — التكامل المتحدة",
        "نتائج شراكتك مع التكامل المتحدة: خفض تكاليف المستودعات حتى 20%، دقة مطلقة للمخزون، رفع إنتاجية الموظفين، خفض المخزون الراكد، واعتماد إجراءات قياسية SOPs.",
        body, extra_jsonld=[crumbs_jsonld([("الرئيسية",""),("من نحن","about.html"),("النتائج المتوقعة","results.html")])])

# ============================================================
#  محتوى صفحات الخدمات
# ============================================================
def sec(title, inner, eyebrow=""):
    e = f'<span class="eyebrow">{eyebrow}</span>' if eyebrow else ""
    return f'<h2>{title}</h2>{inner}' if not e else f'{e}<h2>{title}</h2>{inner}'

SVC_BODY = {x["slug"]: x["body_html"] for x in SERVICES}

def build_service(s):
    others = [x for x in SERVICES if x["slug"] != s["slug"]]
    side = "".join('<li><a href="%s.html"%s>%s</a></li>' % (x["slug"], ' class="is-active"' if x["slug"]==s["slug"] else "", x["nav"]) for x in SERVICES)
    rel = "".join(svc_card(x, i*60) for i,x in enumerate(others[:4]))
    body = page_hero(s["title"], s["short"], [("خدماتنا","services.html"),(s["nav"],None)]) + f'''
<section class="section"><div class="wrap">
  <div class="layout-side">
    <div class="prose" data-reveal>{SVC_BODY[s["slug"]]}
      <p style="margin-top:34px">
        <a class="btn btn--primary" href="contact.html">اطلب عرض سعر لهذه الخدمة</a>
        <a class="btn btn--ghost" href="{WA_LINK}" target="_blank" rel="noopener" style="margin-inline-start:10px">استفسر عبر واتساب</a>
      </p>
    </div>
    <aside>
      <div class="sidebar-box" data-reveal="120">
        <h3>كل الخدمات</h3>
        <ul>{side}</ul>
        <a class="btn btn--primary btn--sm" href="contact.html" style="width:100%;margin-top:20px">تواصل معنا</a>
      </div>
    </aside>
  </div>
</div></section>

<section class="section section--tint"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">خدمات ذات صلة</span><h2>قد تهمّك أيضاً</h2></div>
  <div class="grid grid--4">{rel}</div>
</div></section>
{cta_band()}
'''
    ld = {"@context":"https://schema.org","@type":"Service","name":s["title"],
      "serviceType":s["nav"],"description":s["seo_desc"],
      "provider":{"@id":SITE_URL+"/#organization"},
      "areaServed":{"@type":"Country","name":"المملكة العربية السعودية"},
      "url":SITE_URL+"/"+s["slug"]+".html"}
    return page(s["slug"]+".html", s["seo_title"], s["seo_desc"], body,
        extra_jsonld=[ld, crumbs_jsonld([("الرئيسية",""),("خدماتنا","services.html"),(s["nav"],s["slug"]+".html")])])

START_STEPS = '<div class="band__facts"><div><b>01</b><span>تواصل معنا لفهم وضعك الحالي</span></div><div><b>02</b><span>زيارة تقييمية ميدانية لمستودعك</span></div><div><b>03</b><span>عرض بنطاق ومخرجات وسعر واضح</span></div></div>'

def build_services_hub():
    cards = "".join(svc_card(s, i*50) for i,s in enumerate(SERVICES))
    body = page_hero("خدماتنا",
        "حزمة متكاملة من الخدمات اللوجستية الاستشارية والتنفيذية تحت سقف واحد — من التشخيص والاستشارة، إلى الجرد والتشغيل والإشراف والنقل.",
        [("خدماتنا",None)]) + f'''
<section class="section"><div class="wrap">
  <div class="grid grid--3">{cards}</div>
</div></section>
{band("assets/img/hero/hero-1.jpg","مستودع منظّم وفق أفضل الممارسات",
  "كيف نبدأ؟","ثلاث خطوات تفصلك عن مستودع أكثر كفاءة",
  "من أول اتصال حتى عرض سعر واضح المعالم — بلا التزام مسبق.",
  START_STEPS,
  '<a class="btn btn--gold" href="contact.html">ابدأ الآن</a>')}
{cta_band()}
'''
    ld = {"@context":"https://schema.org","@type":"ItemList","name":"خدمات التكامل المتحدة للخدمات اللوجستية",
      "itemListElement":[{"@type":"ListItem","position":i+1,"name":s["title"],"url":SITE_URL+"/"+s["slug"]+".html"}
                         for i,s in enumerate(SERVICES)]}
    return page("services.html","خدماتنا | استشارات وجرد وتشغيل المستودعات — التكامل المتحدة",
        "ثماني خدمات لوجستية متكاملة: استشارات المستودعات، جرد المخزون والأصول، تحسين العمليات، التشغيل والإدارة 4PL، الإشراف اللوجستي، التدقيق، الترميز، ونقل المستودعات.",
        body, extra_jsonld=[ld, crumbs_jsonld([("الرئيسية",""),("خدماتنا","services.html")])])

# ============================================================
#  العملاء والقطاعات
# ============================================================
PARTNERSHIP_PILLS = '<ul class="band__pills"><li>عقود سنوية للجرد الدوري</li><li>تشغيل وإدارة كاملة</li><li>إشراف لوجستي على فرقك</li><li>مشاريع محددة النطاق</li></ul>'

def build_sectors():
    sectors = [
      ("shield","القطاع الصحي والصيدلاني","مستودعات الأدوية والمستلزمات الطبية، حيث تتطلب دقة المخزون وتتبّع تواريخ الصلاحية أعلى مستويات الانضباط."),
      ("gear","قطع الغيار والسيارات","مستودعات قطع الغيار بآلاف الأصناف المتشابهة، حيث يصنع الترميز الدقيق وتصنيف ABC فارقاً مباشراً في سرعة التجهيز."),
      ("box","الإلكترونيات والأجهزة","بضائع عالية القيمة تحتاج مواقع مؤمّنة، وجرداً رقابياً منتظماً، وضوابط صارمة على الاستلام والصرف."),
      ("count","المواد الغذائية والاستهلاكية","تطبيق صارم لمبدأ FIFO/FEFO، وإدارة دقيقة لدورة المخزون وتقليل الهدر والتالف."),
      ("chart","التجزئة وسلاسل الفروع","مستودعات مركزية تغذّي شبكة فروع، حيث تحدد دقة المخزون جودة تجربة العميل النهائي."),
      ("4pl","الصناعة والمقاولات","مستودعات المصانع (مواد خام وسلع تامة الصنع) ومخازن المشاريع، وضبط استهلاك المواد."),
      ("doc","الجهات الحكومية وشبه الحكومية","حصر وجرد الأصول الثابتة والعُهد، وتقارير محايدة تصلح مرجعاً أمام أجهزة الرقابة والمراجعة."),
      ("supervise","الشركات اللوجستية ومزودو الخدمة","تدقيق وتحسين عمليات مراكز التوزيع، ورفع كفاءة الفرق التشغيلية."),
    ]
    cards = "".join(f'''<article class="card" data-reveal="{i*50}"><div class="card__ico">{ico(k)}</div><h3>{t}</h3><p>{d}</p></article>''' for i,(k,t,d) in enumerate(sectors))
    logos = "".join('<div class="marquee__item"><img src="assets/img/clients/%s" alt="%s — من عملاء التكامل المتحدة" loading="lazy" decoding="async" width="148" height="148"></div>' % (f,n) for f,n in CLIENTS)
    body = page_hero("القطاعات التي نخدمها وعملاؤنا",
        "يمكن تقديم خدمات «التكامل المتحدة» لجميع أنواع الأعمال وجميع أنواع الشركات، وفي أي حجم: مستودع كبير، مخزن صغير، أو مستودع مصنع (مواد خام وسلع تامة الصنع).",
        [("عملاؤنا",None)]) + f'''
<section class="section section--tint"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">القطاعات</span><h2>خبرة عابرة للقطاعات، ومنهجية واحدة صارمة</h2>
  <p>تختلف طبيعة المخزون من قطاع لآخر، لكن مبادئ الدقة والكفاءة واحدة — ونحن نكيّف حلولنا مع طبيعة كل قطاع.</p></div>
  <div class="grid grid--4">{cards}</div>
</div></section>

<section class="section"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">من عملائنا</span><h2>جهات حكومية وشركات رائدة تثق بنا</h2></div>
</div>
  <div class="marquee" data-reveal><div class="marquee__track">{logos}{logos}</div></div>
</section>

{band("assets/img/achievements/honoring/1.jpg","فريق التكامل المتحدة مع فريق العميل بعد نجاح مشروع الجرد",
  "الشراكات الاستراتيجية","نعمل كامتداد لفريقك، لا كمورّد خارجي",
  "عقود مبنية على أهداف ومؤشرات قياس واضحة — ويمكن ربط جزء من أتعابنا بنسبة من التوفير الفعلي المحقق.",
  PARTNERSHIP_PILLS,
  '<a class="btn btn--gold" href="contact.html">ناقش شراكة معنا</a>')}
{cta_band()}
'''
    return page("sectors.html","القطاعات التي نخدمها وعملاؤنا | التكامل المتحدة للخدمات اللوجستية",
        "نخدم القطاع الصحي والصيدلاني، قطع الغيار، الإلكترونيات، المواد الغذائية، التجزئة، الصناعة والمقاولات، والجهات الحكومية — بحلول جرد وإدارة مستودعات مصممة لكل قطاع.",
        body, extra_jsonld=[crumbs_jsonld([("الرئيسية",""),("عملاؤنا","sectors.html")])],
        og_image="assets/img/achievements/honoring/1.jpg")

def build_who():
    roles = [
      ("team","الملّاك والشركاء","المساهمون وأصحاب المصلحة الذين يهمهم حماية الأصول ودقة القوائم المالية."),
      ("chart","المدراء التنفيذيون والعامّون","من يبحثون عن خفض التكاليف التشغيلية ورفع الإنتاجية دون التضحية بجودة الخدمة."),
      ("doc","المدراء الماليون والمدققون الداخليون","من يحتاجون مرجعاً تدقيقياً محايداً وتقرير فروقات موثوقاً لإغلاق الدفاتر."),
      ("optimize","مدراء سلاسل الإمداد والتوريد","ومدراء تطوير الأعمال الباحثون عن تحسين دورة الطلب ودقة التخطيط."),
      ("box","مدراء المستودعات والمعارض","من يواجهون يومياً تحديات المساحة، والأخطاء، وضغط تجهيز الطلبات."),
      ("shield","مسؤولو الحوكمة والالتزام","من يحتاجون ضوابط رقابية فعّالة تحدّ من مخاطر التلاعب والفاقد."),
    ]
    cards = "".join(f'''<article class="card" data-reveal="{i*50}"><div class="card__ico">{ico(k)}</div><h3>{t}</h3><p>{d}</p></article>''' for i,(k,t,d) in enumerate(roles))
    pains = [
      ("هل تظهر فروقات متكررة بين المخزون الفعلي والدفتري؟","فجوة الأرصدة أول مؤشر على خلل في ضوابط الاستلام والصرف. نبدأ بجرد تشخيصي محايد ثم نعالج جذور الفروقات."),
      ("هل تكلفة تشغيل المستودع في ارتفاع مستمر؟","نحدد مصادر الهدر ونعيد هندسة الإجراءات — بهدف خفض قد يصل إلى 20% من تكاليف التشغيل."),
      ("هل تعاني من أخطاء في تجهيز الطلبات وتأخر الشحن؟","نراجع دورة الطلب كاملة من الاستلام حتى التسليم، ونطبّق مؤشرات أداء تقيس التحسن أسبوعاً بأسبوع."),
      ("هل مساحة المستودع لا تكفي؟","قبل التفكير في استئجار مساحة إضافية، غالباً ما يكشف تحليل الـ Layout وتصنيف ABC عن مساحة مهدورة يمكن استرجاعها."),
      ("هل لديك فريق جيد لكن بلا قيادة متخصصة؟","خدمة الإشراف اللوجستي تتيح لك الاحتفاظ بفريقك مع قيادة خبيرة ترفع أداءه."),
      ("هل تنتقل إلى مستودع جديد؟","ننقل المستودع بمنهجية لوجستية تحمي المخزون وترتّبه في الموقع الجديد من اليوم الأول."),
    ]
    accs = chat(pains)
    faq_ld = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in pains]}
    body = page_hero("من يحتاج خدماتنا؟",
        "يمكن تقديم خدمات التكامل المتحدة لجميع أنواع الأعمال — المستلزمات الصيدلانية والطبية وقطع الغيار والإلكترونيات والمواد الغذائية هي مجرد أمثلة.",
        [("عملاؤنا","sectors.html"),("من يحتاج خدماتنا",None)]) + f'''
<section class="section"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">المهتمون بخدماتنا</span><h2>المجموعة الأكثر اهتماماً بخدمات التكامل المتحدة</h2></div>
  <div class="grid grid--3">{cards}</div>
</div></section>
<section class="section section--tint"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">هل تواجه أياً من هذه التحديات؟</span><h2>إن كانت إجابتك «نعم» على أي منها — فنحن نتحدث لغتك</h2></div>
  {accs}
</div></section>
{cta_band()}
'''
    return page("who-needs-us.html","من يحتاج خدماتنا؟ | التكامل المتحدة للخدمات اللوجستية",
        "خدمات التكامل المتحدة تهم الملّاك، المدراء التنفيذيين، المدراء الماليين والمدققين، مدراء سلاسل الإمداد، ومدراء المستودعات — في أي قطاع وأي حجم مستودع.",
        body, extra_jsonld=[faq_ld, crumbs_jsonld([("الرئيسية",""),("عملاؤنا","sectors.html"),("من يحتاج خدماتنا","who-needs-us.html")])])

# ============================================================
#  الأحداث والإنجازات — قوائم + صفحات تفصيلية
# ============================================================
def case_list(base, items, prefix):
    out = []
    for k, it in enumerate(items):
        url = prefix + "-" + it["slug"] + ".html"
        thumbs = "".join(
          '<a href="%s" aria-label="%s"><img src="assets/img/%s/%s/%d.jpg" alt="%s — صورة %d" loading="lazy" decoding="async"></a>'
          % (url, it["title"], base, it["slug"], i, it["title"], i)
          for i in range(2, min(it["n"], 4) + 1))
        flip = " case--flip" if k % 2 else ""
        out.append(
          '<article class="case%s" data-reveal>\n'
          '  <a class="case__main" href="%s">\n'
          '    <img src="assets/img/%s/%s/1.jpg" alt="%s — %s" loading="lazy" decoding="async">\n'
          '    <div class="case__cap">\n'
          '      <span class="case__meta">%s</span>\n'
          '      <h3>%s</h3>\n'
          '      <p>%s</p>\n'
          '    </div>\n'
          '  </a>\n'
          '  <div class="case__thumbs">%s</div>\n'
          '</article>'
          % (flip, url, base, it["slug"], it["title"], BRAND_SHORT,
             it["meta"], it["title"], it["desc"], thumbs))
    return "\n".join(out)


def case_page(base, it, items, prefix, parent_label, parent_url, kind):
    slug = it["slug"]
    gal = "".join(
      '<a href="assets/img/%s/%s/%d.jpg" data-lb data-alt="%s — صورة %d" aria-label="تكبير الصورة %d">'
      '<img src="assets/img/%s/%s/%d.jpg" alt="%s — %s" loading="lazy" decoding="async"></a>'
      % (base, slug, i, it["title"], i, i, base, slug, i, it["title"], BRAND_SHORT)
      for i in range(1, it["n"] + 1))
    facts = "".join('<div><dt>%s</dt><dd>%s</dd></div>' % (a, b) for a, b in it["facts"])
    others = [x for x in items if x["slug"] != slug][:3]
    more = "".join(
      '<a class="minicard" href="%s-%s.html">'
      '<img src="assets/img/%s/%s/1.jpg" alt="%s" loading="lazy" decoding="async">'
      '<span>%s</span></a>' % (prefix, x["slug"], base, x["slug"], x["title"], x["title"])
      for x in others)
    paras = "".join('<p>%s</p>' % t for t in it["body"])
    pts = li(it["points"]) if it.get("points") else ""

    body = (
'<section class="case-hero">\n'
'  <img class="case-hero__bg" src="assets/img/%(base)s/%(slug)s/1.jpg" alt="%(title)s" fetchpriority="high">\n'
'  <div class="wrap case-hero__in">\n'
'    <ol class="crumbs"><li><a href="index.html">الرئيسية</a></li><li><a href="%(purl)s">%(plabel)s</a></li><li>%(title)s</li></ol>\n'
'    <span class="case__meta">%(meta)s</span>\n'
'    <h1>%(title)s</h1>\n'
'    <p>%(desc)s</p>\n'
'  </div>\n'
'</section>\n'
'\n'
'<section class="section">\n'
'  <div class="wrap">\n'
'    <div class="layout-side">\n'
'      <div class="prose" data-reveal>%(paras)s%(pts)s</div>\n'
'      <aside>\n'
'        <dl class="factlist" data-reveal="100">%(facts)s</dl>\n'
'        <a class="btn btn--primary" href="contact.html" style="width:100%%;margin-top:20px">اطلب خدمة مماثلة</a>\n'
'      </aside>\n'
'    </div>\n'
'  </div>\n'
'</section>\n'
'\n'
'<section class="section section--tint">\n'
'  <div class="wrap">\n'
'    <div class="sec-head"><span class="eyebrow">معرض الصور</span><h2>لقطات من الميدان</h2></div>\n'
'    <div class="gal" data-reveal>%(gal)s</div>\n'
'  </div>\n'
'</section>\n'
'\n'
'<section class="section">\n'
'  <div class="wrap">\n'
'    <div class="sec-head"><span class="eyebrow">%(plabel)s</span><h2>اطّلع أيضاً على</h2></div>\n'
'    <div class="minicards" data-reveal>%(more)s</div>\n'
'  </div>\n'
'</section>\n'
'%(cta)s\n') % dict(base=base, slug=slug, title=it["title"], desc=it["desc"], meta=it["meta"],
                    purl=parent_url, plabel=parent_label, paras=paras, pts=pts,
                    facts=facts, gal=gal, more=more, cta=cta_band())

    imgs = [SITE_URL + "/assets/img/%s/%s/%d.jpg" % (base, slug, i) for i in range(1, it["n"] + 1)]
    ld = {"@context": "https://schema.org", "@type": kind, "name": it["title"],
          "description": it["desc"], "image": imgs}
    if kind == "Event":
        ld["location"] = {"@type": "Place", "name": it.get("city", "المملكة العربية السعودية"),
                          "address": {"@type": "PostalAddress", "addressCountry": "SA"}}
        ld["organizer"] = {"@id": SITE_URL + "/#organization"}
        ld["eventAttendanceMode"] = "https://schema.org/OfflineEventAttendanceMode"
        ld["eventStatus"] = "https://schema.org/EventScheduled"
    else:
        ld["creator"] = {"@id": SITE_URL + "/#organization"}

    return page(prefix + "-" + slug + ".html", it["seo_title"], it["seo_desc"], body,
        current=parent_url,
        extra_jsonld=[ld, crumbs_jsonld([("الرئيسية", ""), (parent_label, parent_url),
                                         (it["title"], prefix + "-" + slug + ".html")])],
        og_image="assets/img/%s/%s/1.jpg" % (base, slug))


def build_news():
    body = page_hero("الأحداث والأنشطة",
        "حضورنا في أبرز المعارض والملتقيات المتخصصة في سلاسل الإمداد والخدمات اللوجستية في المملكة.",
        [("الأحداث والأنشطة", None)]) + \
        '\n<section class="section"><div class="wrap">%s</div></section>\n%s\n' % (
          case_list("events", EVENTS, "event"),
          cta_band("هل تودّ لقاءنا في الفعالية القادمة؟",
                   "تواصل معنا لتحديد موعد لقاء، أو لحجز جلسة استشارية مع أحد خبرائنا."))
    ld = {"@context": "https://schema.org", "@type": "ItemList", "name": "الأحداث والأنشطة",
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": e["title"],
                               "url": SITE_URL + "/event-" + e["slug"] + ".html"}
                              for i, e in enumerate(EVENTS)]}
    return page("news.html",
        "الأحداث والأنشطة | مشاركات التكامل المتحدة في معارض وملتقيات سلاسل الإمداد",
        "مشاركات التكامل المتحدة في معرض سعودي ترانستك، مؤتمر سلاسل الإمداد، معرض أوتومكانيك جدة، ولقاءات قادة سلاسل الإمداد في جدة والدمام.",
        body, extra_jsonld=[ld, crumbs_jsonld([("الرئيسية", ""), ("الأحداث والأنشطة", "news.html")])],
        og_image="assets/img/events/supply-chain-conference/1.jpg")


def build_achievements():
    body = page_hero("الإنجازات",
        "مشاريع جرد وتطوير نفّذها فريق التكامل المتحدة ميدانياً في الرياض وجدة والدمام والقصيم — نتائج على أرض الواقع، لا وعوداً على الورق.",
        [("عملاؤنا", "sectors.html"), ("الإنجازات", None)]) + \
        '\n<section class="section"><div class="wrap">%s</div></section>\n%s\n' % (
          case_list("achievements", ACHIEVEMENTS, "project"),
          cta_band("مشروعك القادم قد يكون التالي",
                   "تواصل معنا اليوم لتخطيط جردك السنوي أو مشروع تطوير مستودعك."))
    ld = {"@context": "https://schema.org", "@type": "ItemList", "name": "إنجازات التكامل المتحدة",
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": a["title"],
                               "url": SITE_URL + "/project-" + a["slug"] + ".html"}
                              for i, a in enumerate(ACHIEVEMENTS)]}
    return page("achievements.html",
        "الإنجازات | مشاريع جرد وتطوير مستودعات في الرياض وجدة والدمام والقصيم",
        "مشاريع نفّذها فريق التكامل المتحدة: جرد مستودعات عملائنا في الرياض وجدة والدمام والقصيم، مع تقارير فروقات دقيقة وتوصيات لتعزيز ضوابط المخزون.",
        body, extra_jsonld=[ld, crumbs_jsonld([("الرئيسية", ""), ("عملاؤنا", "sectors.html"),
                                               ("الإنجازات", "achievements.html")])],
        og_image="assets/img/achievements/riyadh-1/1.jpg")


# ============================================================
#  المدونة
# ============================================================
AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
             "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]

def ar_date(iso):
    try:
        y, m, d = iso.split("-")
        return "%d %s %s" % (int(d), AR_MONTHS[int(m) - 1], y)
    except Exception:
        return iso

def post_card(x, delay=0, wide=False):
    tags = "".join('<span>%s</span>' % t for t in x.get("tags", [])[:2])
    return ('<article class="post%s" data-reveal="%d">'
            '<a class="post__img" href="post-%s.html">'
            '<img src="assets/img/blog/%s" alt="%s" loading="lazy" decoding="async">'
            '<div class="post__cap">'
            '<div class="post__meta">%s<time datetime="%s">%s</time></div>'
            '<h3>%s</h3>'
            '</div></a>'
            '<div class="post__body"><p>%s</p>'
            '<a class="card__more" href="post-%s.html">اقرأ المقال</a></div>'
            '</article>'
            % (" post--wide" if wide else "", delay, x["slug"], x["image"], x["title"],
               tags, x["date"], ar_date(x["date"]), x["title"],
               x["excerpt"], x["slug"]))

def build_blog():
    cards = "".join(post_card(x, i * 60, wide=(i == 0)) for i, x in enumerate(POSTS))
    empty = '<p style="text-align:center;color:var(--muted)">لا توجد مقالات منشورة بعد.</p>'
    body = page_hero("المدونة",
        "مقالات ورؤى عملية في إدارة المستودعات، دقة المخزون، وتحسين العمليات اللوجستية — مكتوبة من واقع الميدان لا من الكتب.",
        [("المدونة", None)]) + \
        '\n<section class="section"><div class="wrap"><div class="posts">%s</div></div></section>\n%s\n' % (
          cards or empty, cta_band())
    ld = {"@context": "https://schema.org", "@type": "Blog", "name": "مدونة " + BRAND_SHORT,
          "url": SITE_URL + "/blog.html", "publisher": {"@id": SITE_URL + "/#organization"},
          "blogPost": [{"@type": "BlogPosting", "headline": x["title"], "datePublished": x["date"],
                        "url": SITE_URL + "/post-" + x["slug"] + ".html"} for x in POSTS]}
    return page("blog.html", "المدونة | رؤى في إدارة المستودعات ودقة المخزون — التكامل المتحدة",
        "مقالات متخصصة في جرد المخزون، تحسين عمليات المستودعات، مؤشرات الأداء، وتصميم المستودعات — من خبرة ميدانية في السوق السعودي.",
        body, extra_jsonld=[ld, crumbs_jsonld([("الرئيسية", ""), ("المدونة", "blog.html")])],
        og_image="assets/img/blog/" + (POSTS[0]["image"] if POSTS else "insight-1.jpg"))

def build_post(x):
    tags = "".join('<span>%s</span>' % t for t in x.get("tags", []))
    others = [o for o in POSTS if o["slug"] != x["slug"]][:3]
    more = "".join(post_card(o, i * 60) for i, o in enumerate(others))
    body = ('<section class="case-hero">\n'
      '  <img class="case-hero__bg" src="assets/img/blog/%(img)s" alt="%(title)s" fetchpriority="high">\n'
      '  <div class="wrap case-hero__in">\n'
      '    <ol class="crumbs"><li><a href="index.html">الرئيسية</a></li><li><a href="blog.html">المدونة</a></li><li>%(title)s</li></ol>\n'
      '    <div class="post__meta post__meta--light">%(tags)s<time datetime="%(date)s">%(nice)s</time></div>\n'
      '    <h1>%(title)s</h1>\n'
      '    <p>%(excerpt)s</p>\n'
      '  </div>\n'
      '</section>\n'
      '<section class="section"><div class="wrap">\n'
      '  <article class="prose article" data-reveal>%(body)s\n'
      '    <p class="article__by">%(author)s</p>\n'
      '  </article>\n'
      '</div></section>\n'
      '<section class="section section--tint"><div class="wrap">\n'
      '  <div class="sec-head"><span class="eyebrow">المدونة</span><h2>مقالات ذات صلة</h2></div>\n'
      '  <div class="posts" data-reveal>%(more)s</div>\n'
      '</div></section>\n%(cta)s\n') % dict(
        img=x["image"], title=x["title"], tags=tags, date=x["date"], nice=ar_date(x["date"]),
        excerpt=x["excerpt"], body=x["body"], author=x.get("author", BRAND_SHORT),
        more=more, cta=cta_band())
    ld = {"@context": "https://schema.org", "@type": "BlogPosting",
          "headline": x["title"], "description": x["excerpt"],
          "image": SITE_URL + "/assets/img/blog/" + x["image"],
          "datePublished": x["date"], "dateModified": x["date"],
          "inLanguage": "ar",
          "author": {"@type": "Organization", "name": x.get("author", BRAND)},
          "publisher": {"@id": SITE_URL + "/#organization"},
          "mainEntityOfPage": SITE_URL + "/post-" + x["slug"] + ".html",
          "keywords": ", ".join(x.get("tags", []))}
    return page("post-" + x["slug"] + ".html", x["seo_title"], x["seo_desc"], body,
        current="blog.html",
        extra_jsonld=[ld, crumbs_jsonld([("الرئيسية", ""), ("المدونة", "blog.html"),
                                         (x["title"], "post-" + x["slug"] + ".html")])],
        og_image="assets/img/blog/" + x["image"])

# ============================================================
#  وظائف + تواصل + 404
# ============================================================
JOBS = [(j["title"], j["location"], j["type"], j["desc"]) for j in CONTENT["jobs"]]

def build_careers():
    cards = "".join(f'''<article class="card" data-reveal="{i*60}">
  <div class="card__ico">{ico("team")}</div>
  <h3>{t}</h3>
  <p style="color:var(--muted);font-size:14.5px;margin-bottom:8px">{loc} · {typ}</p>
  <p>{d}</p>
  <a class="card__more" href="mailto:{EMAIL_HR}?subject=%D8%AA%D9%82%D8%AF%D9%8A%D9%85%20%D8%B9%D9%84%D9%89%20%D9%88%D8%B8%D9%8A%D9%81%D8%A9%3A%20{t}">تقدّم لهذه الوظيفة</a>
</article>''' for i,(t,loc,typ,d) in enumerate(JOBS))
    body = page_hero("الوظائف المتاحة",
        "نبحث دائماً عن كفاءات لوجستية تؤمن بأن التفاصيل الصغيرة في المستودع تصنع فرقاً كبيراً في نتائج الأعمال.",
        [("وظائف",None)]) + f'''
<section class="section"><div class="wrap">
  <div class="sec-head center"><span class="eyebrow">انضم إلينا</span><h2>الوظائف المتاحة حالياً</h2></div>
  <div class="grid grid--2">{cards}</div>
  <div class="cta" style="margin-top:52px" data-reveal>
    <h2>لم تجد الوظيفة المناسبة؟</h2>
    <p>أرسل سيرتك الذاتية وسنتواصل معك عند توفر شاغر يناسب خبرتك.</p>
    <div class="cta__actions"><a class="btn btn--gold" href="mailto:{EMAIL_HR}">{EMAIL_HR}</a></div>
  </div>
</div></section>
'''
    ld = [{"@context":"https://schema.org","@type":"JobPosting","title":t,
           "description":d,"employmentType":"FULL_TIME",
           "hiringOrganization":{"@id":SITE_URL+"/#organization"},
           "jobLocation":{"@type":"Place","address":{"@type":"PostalAddress","addressLocality":loc,"addressCountry":"SA"}}}
          for t,loc,typ,d in JOBS]
    return page("careers.html","وظائف | انضم إلى فريق التكامل المتحدة للخدمات اللوجستية",
        "وظائف شاغرة في التكامل المتحدة: مدير خدمات لوجستية، مدير نقل، مدير إدارة التوزيع، ومشرف جرد. أرسل سيرتك الذاتية إلى careers@ilogistics.com.sa.",
        body, extra_jsonld=ld + [crumbs_jsonld([("الرئيسية",""),("وظائف","careers.html")])])

def build_contact():
    info = f'''
<div class="infolist">
  <div class="info-row" data-reveal><span class="info-row__ico">{ico("phone")}</span><div>
    <h3>الهاتف</h3><p><a href="tel:{PHONE_MAIN}" dir="ltr">{PHONE_MAIN}</a></p>
    <p><a href="tel:{PHONE_MOB}" dir="ltr">{PHONE_MOB}</a></p></div></div>
  <div class="info-row" data-reveal="60"><span class="info-row__ico">{ico("mail")}</span><div>
    <h3>البريد الإلكتروني</h3><p><a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a></p>
    <p><a href="mailto:{EMAIL_HR}" dir="ltr">{EMAIL_HR}</a></p></div></div>
  <div class="info-row" data-reveal="120"><span class="info-row__ico">{ico("pin")}</span><div>
    <h3>العنوان</h3><p>{ADDRESS}</p></div></div>
  <div class="info-row" data-reveal="180"><span class="info-row__ico">{ico("clock")}</span><div>
    <h3>أوقات العمل</h3><p>الأحد – الخميس: 8:30 ص – 5:00 م</p>
    <p>واتساب: متاح على مدار الساعة</p></div></div>
</div>'''
    svc_opts = "".join('<option>%s</option>' % s["nav"] for s in SERVICES)
    body = page_hero("اتصل بنا",
        "أخبرنا بتحدي مستودعك، وسيتواصل معك أحد خبرائنا خلال يوم عمل واحد لتحديد أنسب حل ونطاق عمل واضح.",
        [("اتصل بنا",None)]) + f'''
<section class="section"><div class="wrap">
  <div class="split split--form">
    <div data-reveal>
      <span class="eyebrow">اطلب عرض سعر</span>
      <h2>أرسل طلبك وسنعاود التواصل معك</h2>
      <p>عبّئ النموذج وسيُفتح لك واتساب برسالة جاهزة تحتوي بياناتك — أسرع طريقة للوصول إلينا.</p>
      <form class="form" data-wa novalidate>
        <div class="row">
          <div class="field"><label for="f-name">الاسم الكامل *</label>
            <input id="f-name" name="name" data-label="الاسم" required placeholder="مثال: محمد العتيبي"></div>
          <div class="field"><label for="f-company">اسم المنشأة</label>
            <input id="f-company" name="company" data-label="المنشأة" placeholder="اسم الشركة"></div>
        </div>
        <div class="row">
          <div class="field"><label for="f-phone">رقم الجوال *</label>
            <input id="f-phone" name="phone" data-label="الجوال" type="tel" required placeholder="05xxxxxxxx" dir="ltr"></div>
          <div class="field"><label for="f-email">البريد الإلكتروني</label>
            <input id="f-email" name="email" data-label="البريد" type="email" placeholder="name@company.com" dir="ltr"></div>
        </div>
        <div class="row">
          <div class="field"><label for="f-service">الخدمة المطلوبة</label>
            <select id="f-service" name="service" data-label="الخدمة"><option>غير محدد</option>{svc_opts}</select></div>
          <div class="field"><label for="f-city">المدينة</label>
            <input id="f-city" name="city" data-label="المدينة" placeholder="الرياض"></div>
        </div>
        <div class="field"><label for="f-msg">تفاصيل طلبك</label>
          <textarea id="f-msg" name="message" data-label="التفاصيل" placeholder="اشرح لنا وضع مستودعك والتحدي الذي تواجهه..."></textarea></div>
        <div class="actions">
          <button class="btn btn--primary" type="submit">إرسال الطلب عبر واتساب</button>
          <p class="form-note" style="flex:1 1 220px">سيُفتح واتساب برسالة معبّأة ببياناتك — راجعها قبل الإرسال.</p>
        </div>
        <p class="form-note form-ok" hidden style="color:#1a8f4a;font-weight:700">تم تجهيز رسالتك — أكمل الإرسال من نافذة واتساب.</p>
      </form>
    </div>
    <div data-reveal="120">{info}
      <div class="cta" style="margin-top:22px;text-align:start;padding:30px">
        <h2 style="font-size:1.3rem">تفضّل التواصل المباشر؟</h2>
        <p style="margin-bottom:18px">راسلنا على واتساب الآن وسنرد عليك في أقرب وقت.</p>
        <div class="cta__actions" style="justify-content:flex-start">
          <a class="btn btn--gold" href="{WA_LINK}" target="_blank" rel="noopener">فتح واتساب</a>
        </div>
      </div>
    </div>
  </div>
</div></section>
'''
    ld = {"@context":"https://schema.org","@type":"ContactPage","name":"اتصل بنا",
          "url":SITE_URL+"/contact.html","about":{"@id":SITE_URL+"/#organization"}}
    return page("contact.html","اتصل بنا | التكامل المتحدة للخدمات اللوجستية — الرياض",
        "تواصل مع التكامل المتحدة: هاتف 920023411، جوال وواتساب 966500010288+، بريد info@ilogistics.com.sa — طريق الملك فهد، مبنى الصالحية، الرياض.",
        body, extra_jsonld=[ld, crumbs_jsonld([("الرئيسية",""),("اتصل بنا","contact.html")])])

def build_404():
    body = f'''<section class="page-hero"><div class="wrap"><div class="page-hero__in">
  <h1>الصفحة غير موجودة</h1>
  <p>ربما اتّبعت رابطاً قديماً أو تم نقل الصفحة. يمكنك العودة للرئيسية أو تصفّح خدماتنا.</p>
</div></div></section>
<section class="section"><div class="wrap" style="text-align:center">
  <a class="btn btn--primary" href="index.html">العودة للصفحة الرئيسية</a>
  <a class="btn btn--ghost" href="services.html" style="margin-inline-start:12px">تصفّح الخدمات</a>
</div></section>'''
    p = page("404.html","الصفحة غير موجودة | التكامل المتحدة","الصفحة المطلوبة غير موجودة.", body)
    # noindex
    fp = os.path.join(HERE,"404.html")
    s = open(fp,encoding="utf-8").read().replace('content="index, follow, max-image-preview:large, max-snippet:-1"','content="noindex, follow"')
    open(fp,"w",encoding="utf-8").write(s)
    return p

# ============================================================
#  البناء + خرائط الموقع
# ============================================================
def main():
    pages = []
    pages.append((build_index(), "1.0", "weekly"))
    pages.append((build_about(), "0.9", "monthly"))
    pages.append((build_strength(), "0.8", "monthly"))
    pages.append((build_methodology(), "0.8", "monthly"))
    pages.append((build_results(), "0.8", "monthly"))
    pages.append((build_services_hub(), "0.9", "monthly"))
    for s in SERVICES:
        pages.append((build_service(s), "0.9", "monthly"))
    pages.append((build_sectors(), "0.7", "monthly"))
    pages.append((build_who(), "0.7", "monthly"))
    pages.append((build_news(), "0.6", "monthly"))
    for e in EVENTS:
        pages.append((case_page("events", e, EVENTS, "event", "الأحداث والأنشطة", "news.html", "Event"), "0.5", "yearly"))
    pages.append((build_achievements(), "0.7", "monthly"))
    for a_ in ACHIEVEMENTS:
        pages.append((case_page("achievements", a_, ACHIEVEMENTS, "project", "الإنجازات", "achievements.html", "CreativeWork"), "0.6", "yearly"))
    pages.append((build_blog(), "0.8", "weekly"))
    for x in POSTS:
        pages.append((build_post(x), "0.7", "monthly"))
    pages.append((build_careers(), "0.6", "monthly"))
    pages.append((build_contact(), "0.9", "monthly"))
    build_404()

    today = datetime.date.today().isoformat()

    # خريطة الموقع تُكتب في التمرير العربي فقط، وتشمل النسختين مع وسوم البدائل
    if not IS_EN:
        rows = []
        for f, pr, cf in pages:
            tail = "" if f == "index.html" else f
            ar_u = SITE_URL + "/" + tail
            en_u = SITE_URL + "/en/" + tail
            alts = ('<xhtml:link rel="alternate" hreflang="ar" href="%s"/>'
                    '<xhtml:link rel="alternate" hreflang="en" href="%s"/>'
                    '<xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % (ar_u, en_u, ar_u))
            for loc in (ar_u, en_u):
                rows.append("\n  <url><loc>%s</loc>%s<lastmod>%s</lastmod>"
                            "<changefreq>%s</changefreq><priority>%s</priority></url>"
                            % (loc, alts, today, cf, pr))
        open(os.path.join(HERE, "sitemap.xml"), "w", encoding="utf-8").write(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">%s\n</urlset>\n' % "".join(rows))

        open(os.path.join(HERE, "robots.txt"), "w", encoding="utf-8").write(
            ("User-agent: *\nDisallow: /\n" if NOINDEX else
             "User-agent: *\nAllow: /\nDisallow: /dashboard/\nDisallow: /offer/\n"
             "Disallow: /_backups/\n\nSitemap: %s/sitemap.xml\n" % SITE_URL))

        open(os.path.join(HERE, "site.webmanifest"), "w", encoding="utf-8").write(json.dumps({
          "name": BRAND, "short_name": BRAND_SHORT, "lang": "ar", "dir": "rtl",
          "start_url": "/", "display": "standalone", "background_color": "#ffffff",
          "theme_color": "#1e4d82",
          "icons": [{"src": "/assets/img/favicon.png", "sizes": "512x512", "type": "image/png"}]
        }, ensure_ascii=False, indent=2))

    print("✔ [%s] تم بناء %d صفحة" % (LANG, len(pages)+1))
    for f,_,_ in pages: print("  -", f)

if __name__ == "__main__":
    main()
    # بناء النسخة الإنجليزية تلقائياً بعد العربية
    if not IS_EN and os.path.exists(os.path.join(HERE, "content.en.json")):
        import subprocess
        env = dict(os.environ, BUILD_LANG="en")
        r = subprocess.run([sys.executable, __file__], cwd=HERE, env=env,
                           capture_output=True, text=True)
        print((r.stdout or "").strip().splitlines()[0] if r.stdout else (r.stderr or "").strip()[-300:])
