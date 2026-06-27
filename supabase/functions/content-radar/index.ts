// ╔══════════════════════════════════════════════════════════════╗
// ║  content-radar — Supabase Edge Function                        ║
// ║  وضعان:                                                        ║
// ║   • news  → أهم أخبار مجال إبراهيم من RSS مجاني → سكربتات.     ║
// ║   • story → قصص واقعية مختصرة (عربي ثم عالمي) للسرد.           ║
// ║  الكتابة عبر Google Gemini (طبقة مجانية). بلا تسجيل دخول.      ║
// ║  انشرها بدون تحقّق JWT:  --no-verify-jwt                       ║
// ╚══════════════════════════════════════════════════════════════╝
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVICES = [
  "كتابة النص الإعلاني",
  "التصوير الاحترافي",
  "تصوير درون",
  "التعليق الصوتي",
  "المونتاج والإخراج",
  "إنتاج بودكاست في استوديو سَعي",
];

// مصادر أخبار مجانية بخلاصات غنية بالمحتوى (نص المقال داخل <description>)
// تعطي ملخصاً وأرقاماً حقيقية — لا مجرد عناوين.
const FEEDS = [
  { topic: "أعمال", pub: "MENAbytes", url: "https://www.menabytes.com/feed/" },     // شركات ناشئة خليجية/سعودية + أرقام
  { topic: "أعمال", pub: "Wamda", url: "https://www.wamda.com/feed" },              // ريادة أعمال MENA
  { topic: "تقنية", pub: "عالم التقنية", url: "https://www.tech-wd.com/wd/feed/" }, // تقنية بالعربية
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

type NewsItem = { topic: string; title: string; url: string; pub: string; date: string; desc: string };

// تنظيف وصف HTML إلى نص عادي
function stripHtml(s: string) {
  return decode(s).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

function parseFeed(xml: string, topic: string, pub: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const b of xml.split(/<item[>\s]/i).slice(1)) {
    const t = b.match(/<title>(.*?)<\/title>/s);
    const l = b.match(/<link>(.*?)<\/link>/s);
    const d = b.match(/<pubDate>(.*?)<\/pubDate>/s);
    const de = b.match(/<description>(.*?)<\/description>/s);
    if (!t) continue;
    const title = decode(t[1]);
    let url = l ? decode(l[1]) : "";
    if (!url) { const g = b.match(/<guid[^>]*>(.*?)<\/guid>/s); if (g) url = decode(g[1]); }
    const desc = de ? stripHtml(de[1]).slice(0, 500) : "";
    items.push({ topic, title, url, pub, date: d ? decode(d[1]) : "", desc });
  }
  return items;
}

async function gatherNews(): Promise<NewsItem[]> {
  let all: NewsItem[] = [];
  for (let attempt = 0; attempt < 2 && all.length === 0; attempt++) {
    if (attempt) await new Promise((res) => setTimeout(res, 1500));
    const got: NewsItem[] = [];
    await Promise.all(FEEDS.map(async (f) => {
      try {
        const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentRadar/1.0)" } });
        if (r.ok) got.push(...parseFeed(await r.text(), f.topic, f.pub).slice(0, 14));
      } catch (_) { /* تجاهل */ }
    }));
    all = got;
  }
  const seen = new Set<string>();
  const uniq = all.filter((i) => {
    if (i.desc.length < 60) return false; // نريد أخباراً لها محتوى نقرأه
    const k = i.title.toLowerCase().slice(0, 60);
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  uniq.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  return uniq.slice(0, 14);
}

const IDEA_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      topic: { type: "STRING" },
      source_title: { type: "STRING" },
      source_url: { type: "STRING" },
      source_pub: { type: "STRING" },
      virality: { type: "STRING" },
      hook: { type: "STRING" },
      script: { type: "STRING" },
      screen_title: { type: "STRING" },
      footage: { type: "ARRAY", items: { type: "STRING" } },
      hashtags: { type: "ARRAY", items: { type: "STRING" } },
      service_tie: { type: "STRING" },
      cta: { type: "STRING" },
    },
    required: ["topic", "source_title", "hook", "script", "screen_title", "footage", "hashtags", "service_tie", "cta"],
  },
};

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

async function callLLM(prompt: string, key: string, temperature = 0.85) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature,
    }),
  });
  if (!r.ok) throw new Error("groq " + r.status + ": " + (await r.text()).slice(0, 1200));
  const data = await r.json();
  const txt = data?.choices?.[0]?.message?.content;
  if (!txt) throw new Error("رد فارغ من Groq");
  const parsed = JSON.parse(txt);
  const arr = Array.isArray(parsed)
    ? parsed
    : (Object.values(parsed).find((v) => Array.isArray(v)) as unknown[] | undefined) || [];
  if (!Array.isArray(arr) || !arr.length) throw new Error("تنسيق رد غير متوقع من النموذج");
  return arr as Record<string, unknown>[];
}

// ===== بحث حقيقي من ويكيبيديا (مجاني، بلا مفتاح) لتأصيل القصص =====
async function wikiSearch(query: string, lang: string): Promise<string | null> {
  try {
    const u = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
    const r = await fetch(u, { headers: { "User-Agent": "ibrahimsaud-site/1.0" } });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.query?.search?.[0]?.title || null;
  } catch (_) { return null; }
}
async function wikiSummary(title: string, lang: string) {
  try {
    const u = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const r = await fetch(u, { headers: { "User-Agent": "ibrahimsaud-site/1.0" } });
    if (!r.ok) return null;
    const d = await r.json();
    if ((d.type || "").includes("disambiguation") || !d.extract) return null;
    return {
      extract: d.extract as string,
      url: d?.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch (_) { return null; }
}
async function research(query: string) {
  for (const lang of ["ar", "en"]) {
    const title = await wikiSearch(query, lang);
    if (!title) continue;
    const s = await wikiSummary(title, lang);
    if (s && s.extract.length > 120) return s;
  }
  return null;
}

function newsPrompt(news: NewsItem[], count: number) {
  const articles = news.map((n, i) =>
    `[${i + 1}] العنوان: ${n.title}\nالناشر: ${n.pub}\nنص الخبر: ${n.desc}`).join("\n\n");
  return `أنت معدّ محتوى لحساب «إبراهيم سعود | تقنية · أعمال · بودكاست». الجمهور سعودي/خليجي.
المطلوب: من الأخبار التالية اختر أقوى ${count} أخبار عن: **الشركات، ريادة الأعمال، الشركات الناشئة، التقنية والمنتجات، التسويق والحملات، البودكاست وصناعة المحتوى**. ⛔ تجاهل تماماً: السلع (ذهب/نفط/عملات)، المؤشرات الكلية، الرياضة، السياسة، الفن، الحوادث — إلا إذا ارتبطت مباشرة بشركة أو منتج أو ريادة أعمال.
الهدف: يقرأ إبراهيم الملخص ويصوّر مقطعاً بفهمه — فاكتب **تلخيصاً وأهم النقاط والأرقام**، لا سكربت حرفي.
خدمات إبراهيم: ${SERVICES.join("، ")}.

الأخبار (مع نص كل خبر):
${articles}

لكل خبر مختار أنتج عنصراً فيه:
- topic: المجال (تقنية/أعمال/تسويق/بودكاست).
- source_title: عنوان الخبر حرفياً بدون أقواس.
- source_pub: الناشر.
- virality: سطر يشرح ليش الخبر مهم/قابل للانتشار.
- hook: زاوية افتتاحية قوية يبدأ بها إبراهيم المقطع، لهجة سعودية بيضاء. إن وُجد رقم لافت ضعه فيها.
- script: **ملخص الخبر + أهم النقاط + الأرقام**، مع أسطر منفصلة فعلية (سطر جديد بعد كل عنصر) بهذا الشكل:
  «ملخص: (جملتان يلخّصان الخبر).

أهم النقاط:
- نقطة
- نقطة
- نقطة

أرقام مهمة: (كل الأرقام والنسب والمبالغ والتواريخ الواردة في نص الخبر، خاصة ما يخص السعودية/الخليج).»
  **استخرج الأرقام من نص الخبر المرفق فقط — ممنوع اختراع أي رقم غير موجود في النص.** إن لم يذكر النص أرقاماً فاكتب «لا أرقام في الخبر».
- screen_title: 3–6 كلمات للشاشة.
- footage: 3–5 كلمات بحث إنجليزية للقطات (B-roll).
- hashtags: 5–7 هاشتاقات.
- service_tie: أنسب خدمة من خدماته.
- cta: جملة ختام تدعو لطلب خدمته بسلاسة.
اكتب كل النصوص بالعربية فقط (عدا footage). أرجِع كائن JSON فقط: {"ideas":[ ... ]}.`;
}

// قائمة مرشّحين منسّقة يدوياً — كلهم حقيقيون في مجالات إبراهيم ولهم صفحة ويكيبيديا.
// النموذج لا يختار الأشخاص؛ يكتب فقط من نص ويكيبيديا (يمنع الخروج عن المجال والهلوسة).
const STORY_SEEDS: { name: string; topic: string }[] = [
  // عربي
  { name: "محمد العبار", topic: "أعمال" },
  { name: "فادي غندور", topic: "أعمال" },
  { name: "نجيب ساويرس", topic: "أعمال" },
  { name: "طلال أبو غزالة", topic: "أعمال" },
  { name: "صالح كامل", topic: "أعمال" },
  { name: "لبنى العليان", topic: "أعمال" },
  { name: "الوليد بن طلال", topic: "أعمال" },
  { name: "أحمد الشقيري", topic: "بودكاست" },
  { name: "محمد بن عبد الملك آل الشيخ", topic: "تقنية" },
  // عالمي
  { name: "ستيف جوبز", topic: "تقنية" },
  { name: "إيلون ماسك", topic: "تقنية" },
  { name: "جيف بيزوس", topic: "أعمال" },
  { name: "بيل غيتس", topic: "تقنية" },
  { name: "مارك زوكربيرغ", topic: "تقنية" },
  { name: "سام ألتمان", topic: "تقنية" },
  { name: "جاك ما", topic: "أعمال" },
  { name: "وارن بافيت", topic: "أعمال" },
  { name: "هوارد شولتز", topic: "أعمال" },
  { name: "ريتشارد برانسون", topic: "أعمال" },
  { name: "ساتيا ناديلا", topic: "تقنية" },
  { name: "سوندار بيتشاي", topic: "تقنية" },
  { name: "جو روغان", topic: "بودكاست" },
  { name: "أوبرا وينفري", topic: "بودكاست" },
  { name: "غاري فاينرتشوك", topic: "تسويق" },
];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// كتب تسويق مشهورة + المبدأ الأساسي لكل كتاب (مُعطى مباشرة = تأصيل قوي بلا هلوسة)
const MARKETING_BOOKS: { book: string; author: string; principle: string }[] = [
  { book: "التأثير", author: "روبرت تشالديني", principle: "ستة مبادئ للإقناع: المعاملة بالمثل، الالتزام والاتساق، الدليل الاجتماعي، السلطة، الإعجاب، الندرة." },
  { book: "البقرة البنفسجية", author: "سيث جودين", principle: "كن مختلفاً بشكل ملحوظ (Remarkable) وإلا ستكون غير مرئي؛ المنتج العادي لا يُسوّق نفسه." },
  { book: "التموضع Positioning", author: "آل رايز وجاك تراوت", principle: "التسويق معركة في ذهن العميل؛ احتل كلمة أو مكانة واضحة في عقله قبل المنافس." },
  { book: "مُعدٍ Contagious", author: "جونا بيرغر", principle: "ما ينتشر يحقّق عناصر STEPPS: عملة اجتماعية، محفّزات، مشاعر، علني، قيمة عملية، قصص." },
  { book: "هذا هو التسويق", author: "سيث جودين", principle: "سوّق لأصغر جمهور ممكن تخدمه بصدق؛ التسويق تغيير يستحق الانتشار، لا إزعاج." },
  { book: "ابنِ علامة بقصة", author: "دونالد ميلر", principle: "اجعل العميل هو البطل وعلامتك هي المرشد؛ وضّح المشكلة والخطة والنتيجة." },
  { book: "عروض بـ100 مليون", author: "أليكس هورموزي", principle: "اصنع عرضاً لا يُرفض: قيمة عالية، حلم واضح، ضمان، ندرة، واستعجال." },
  { book: "Made to Stick", author: "تشيب ودان هيث", principle: "الأفكار التي تلتصق: بسيطة، غير متوقعة، ملموسة، موثوقة، عاطفية، وقصصية (SUCCESs)." },
  { book: "ابدأ بالـ«لماذا»", author: "سايمون سينك", principle: "الناس لا تشتري ما تفعله بل لماذا تفعله؛ ابدأ رسالتك بالسبب والقيمة." },
  { book: "أوغلفي عن الإعلان", author: "ديفيد أوغلفي", principle: "العنوان يقرأه 5 أضعاف النص؛ بِع بالمنفعة والحقائق لا بالذكاء الفارغ." },
  { book: "Jab, Jab, Jab, Right Hook", author: "غاري فاينرتشوك", principle: "قدّم قيمة مجانية مراراً (Jab) قبل أن تطلب البيع (Right Hook)؛ احترم سياق كل منصة." },
  { book: "Hooked", author: "نير إيال", principle: "نموذج الخطّاف لبناء العادة: محفّز، فعل، مكافأة متغيّرة، استثمار." },
  { book: "استراتيجية المحيط الأزرق", author: "كيم وموبورن", principle: "بدل المنافسة الدموية، اخلق سوقاً جديدة بلا منافسين عبر قيمة مبتكرة." },
  { book: "تسويق الإذن", author: "سيث جودين", principle: "اكسب إذن العميل ليصلك (متوقَّع، شخصي، ملائم) بدل مقاطعته بالإعلانات." },
  { book: "خطة تسويق من صفحة", author: "آلان ديب", principle: "قبل/أثناء/بعد: استهدف سوقاً، اجذب عميلاً محتملاً، حوّله، ثم اخلق ولاءً وإحالات." },
];

function marketingPrompt(books: typeof MARKETING_BOOKS) {
  const blocks = books.map((b, i) => `[${i + 1}] «${b.book}» — ${b.author}\nالمبدأ: ${b.principle}`).join("\n\n");
  return `أنت معدّ محتوى تسويقي لحساب «إبراهيم سعود». إبراهيم بدأ في التسويق واشتهر فيه، وعنده خدمة **إنتاج فيديوهات إعلانية للشركات**. المنصّة: تيك توك/ريلز، جمهور سعودي/خليجي.

لكل كتاب أدناه، اصنع فكرة فيديو قصير (30–45 ثانية) تشرح مبدأه التسويقي بأسلوب عملي وحماسي:

${blocks}

أنتج لكل واحد عنصراً فيه:
- topic: "تسويق".
- source_title: اسم الكتاب ومؤلفه.
- source_pub: "كتاب تسويق".
- virality: سطر يبيّن قيمة المبدأ ولماذا يهم صاحب أي مشروع.
- hook: جملة افتتاحية قوية توقف التمرير، لهجة سعودية بيضاء.
- script: اشرح المبدأ ببساطة **معتمداً على المبدأ المرفق فقط** (لا تختلق نسبة الكتاب لشيء غير مذكور)، ثم **اربطه بتطبيق عملي للسوق السعودي/الخليجي** (مثال: كيف تستخدمه شركة محلية في إعلانها)، بلهجة محكية. ممنوع كلمات إنجليزية في النص.
- screen_title: 3–6 كلمات للشاشة.
- footage: 3–5 كلمات بحث إنجليزية للقطات (B-roll).
- hashtags: 5–7 هاشتاقات تسويقية.
- service_tie: "إنتاج فيديوهات إعلانية للشركات".
- cta: جملة تربط المبدأ بخدمة إبراهيم (نصوّر لك إعلاناً يطبّق هذا المبدأ).
أرجِع كائن JSON فقط: {"ideas":[ ... ]}.`;
}

// وضع «إعلان»: يأخذ بريف المنتج من المستخدم ويكتب بإطار إبراهيم (احتياج→تضخيم→حل / Hook→محتوى→تفاعل)
function adPrompt(brief: { client: string; field: string; goal: string }, count: number) {
  return `أنت كاتب نصوص إعلانية محترف لـ«إبراهيم سعود» (خدمة: إنتاج فيديوهات إعلانية للشركات). المنصّة: تيك توك/ريلز/سناب. الجمهور سعودي/خليجي. اكتب بلهجة سعودية بيضاء حيّة.

الإعلان (المنتج/الجهة): ${brief.client}
المجال: ${brief.field || "—"}
هدف الإعلان / الجمهور المستهدف: ${brief.goal || "تعريف بالمنتج وجذب عملاء"}

اكتب ${count} نسخاً إعلانية **مختلفة الزاوية** لنفس المنتج (فيديو قصير ٢٠–٤٠ ثانية)، كل نسخة تلتزم بهذا الإطار بدقّة:
【البنية الإعلانية】 ١) خلق احتياج (المشكلة)  ٢) تضخيم الاحتياج (الألم/الكلفة لو ما حلّها)  ٣) عرض الحل = المنتج.
【بنية الفيديو】
• Hook (أول ٣ ثواني): يوقف التمرير. أساليب: تساؤل تشويقي يُجاب آخر المقطع · رقم أو مفارقة صادمة · تحدٍّ · صيغة تفضيل (أكبر/أفضل/أسرع). ⛔ ممنوع يبدأ بترحيب أو مقدمة أو شعار — ادخل بالصدمة مباشرة.
• المحتوى: صلب الرسالة — نقاط أو خطوات أو «ليش هذا المنتج يفرق».
• التفاعل (CTA): اختم بسؤال للجمهور أو دعوة واضحة للطلب/التواصل.

لكل نسخة أنتج عنصراً فيه:
- topic: "إعلان".
- source_title: اسم المنتج/الجهة (${brief.client}).
- source_pub: "نص إعلاني".
- virality: سطر يوضّح زاوية هذه النسخة وعلى أي شريحة من الجمهور تشتغل.
- hook: **ثلاثة هوكات بديلة** للاختبار (A/B)، كل واحد بسطر مرقّم: "١) ...\\n٢) ...\\n٣) ..." — كلها أقل من ٣ ثواني نطقاً.
- script: النص الكامل بأسطر فعلية (سطر جديد فعلي) بهذا الشكل:
  «🎣 الهوك: (أقوى هوك من الثلاثة)

🎯 المحتوى:
(خلق الاحتياج ← تضخيمه ← عرض الحل=المنتج، بنقاط أو سرد محكي)

🔁 التفاعل:
(سؤال للجمهور أو دعوة للطلب)»
- screen_title: ٣–٦ كلمات للشاشة.
- footage: ٣–٥ كلمات بحث إنجليزية للقطات (B-roll).
- hashtags: ٥–٧ هاشتاقات ملائمة للمنتج والمجال.
- service_tie: "إنتاج فيديوهات إعلانية للشركات".
- cta: جملة تربط بخدمة إبراهيم (نصوّر ونكتب لك إعلانك).
اكتب كل النصوص بالعربية فقط (عدا footage). ⛔ ممنوع اختراع أرقام أو ادعاءات غير مؤكَّدة عن المنتج — لو ما عندك رقم فاكتب فائدة لا رقماً. أرجِع كائن JSON فقط: {"ideas":[ ... ]}.`;
}

// المرحلة 3: كتابة القصص معتمداً **حصرياً** على نصوص ويكيبيديا المرفقة
function storyWritePrompt(sources: { name: string; topic: string; extract: string }[]) {
  const blocks = sources.map((s, i) => `[${i + 1}] ${s.name} (${s.topic}):\n${s.extract}`).join("\n\n");
  return `أنت كاتب قصص لحساب «إبراهيم سعود | تقنية · أعمال · بودكاست». إبراهيم سرّاد يقف أمام الكاميرا ويروي بحماس. المنصّة: تيك توك/ريلز.
خدمات إبراهيم: ${SERVICES.join("، ")}.

التزم بقاعدتين صارمتين:
1) **اكتب كل قصة معتمداً حصرياً على المعلومات المرفقة أدناه من ويكيبيديا.** ممنوع منعاً باتاً إضافة أي اسم أو رقم أو تاريخ أو حدث غير موجود في النص المرفق. إذا كانت المعلومات قليلة، اكتب قصة أقصر بدل أن تختلق.
2) **اكتب بالعربية الفصيحة المبسّطة فقط — ممنوع أي كلمة إنجليزية داخل الهوك أو السرد** (حقل footage فقط يكون إنجليزياً).

المصادر:
${blocks}

لكل مصدر أنتج عنصراً فيه:
- topic: المجال.
- source_title: اسم الشخصية/الشركة كما هو.
- source_pub: "عربي" إن كانت الشخصية/الشركة من دولة عربية، وإلا "عالمي".
- virality: سطر يلخّص ليش القصة ملهمة.
- hook: جملة صادمة أو سؤال مثير أو مفارقة تشدّ المشاهد فوراً، لهجة سعودية بيضاء. ⛔ ممنوع تبدأ بـ«إليك قصة» أو «تعرف على» أو «هذا هو». مثال للأسلوب: «واحد بدأ من تحت الصفر… واليوم اسمه يتردّد في كل مكان».
- script: **سرد قصصي حماسي** (مو تعريف موسوعي!) بلهجة سعودية/خليجية محكية (30–60 ثانية): ابدأ بموقف أو تحدٍّ، ثم التحوّل، ثم درس مؤثّر في النهاية. استخدم الحقائق المرفقة فقط لكن احكها كقصة فيها مشاعر وإيقاع — لا تسرد سيرة جافة.
- screen_title: 3–6 كلمات.
- footage: 3–5 كلمات بحث إنجليزية للقطات (B-roll).
- hashtags: 5–7 هاشتاقات.
- service_tie: أنسب خدمة من خدمات إبراهيم.
- cta: جملة ختام تربط القصة بخدمته.
أرجِع كائن JSON فقط: {"ideas":[ ... ]}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_KEY) return json({ error: "مفتاح Groq غير مضبوط (GROQ_API_KEY)." }, 500);

    const body = await req.json().catch(() => ({}));
    const mode = ["story", "marketing", "ad"].includes(body.mode) ? body.mode : "news";
    const count = Math.min(Math.max(Number(body.count) || 5, 1), 8);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let ideas: Record<string, unknown>[];
    if (mode === "story") {
      // تجنّب تكرار القصص الأخيرة
      const { data: recent } = await admin
        .from("content_ideas").select("source_title")
        .eq("kind", "story").order("created_at", { ascending: false }).limit(40);
      const avoid = (recent || []).map((r) => String(r.source_title)).filter(Boolean);

      // قائمة منسّقة → بحث ويكيبيديا حقيقي → كتابة من المصدر فقط
      const pool = shuffle(STORY_SEEDS.filter((s) => !avoid.includes(s.name)));
      const sources: { name: string; topic: string; extract: string; url: string }[] = [];
      for (const c of (pool.length ? pool : shuffle(STORY_SEEDS))) {
        if (sources.length >= count) break;
        const info = await research(c.name);
        if (info) sources.push({ name: c.name, topic: c.topic, extract: info.extract.slice(0, 650), url: info.url });
      }
      if (!sources.length) return json({ error: "تعذّر العثور على مصادر موثوقة الآن، حاول مرة أخرى." }, 502);

      ideas = await callLLM(storyWritePrompt(sources), GROQ_KEY, 0.7);
      // اربط رابط ويكيبيديا الحقيقي بالاسم
      const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
      for (const x of ideas) {
        const hit = sources.find((s) => norm(s.name) === norm(String(x.source_title)) ||
          norm(s.name).includes(norm(String(x.source_title)).slice(0, 10)));
        if (hit) x.source_url = hit.url;
      }
    } else if (mode === "marketing") {
      // تجنّب تكرار الكتب الأخيرة
      const { data: recent } = await admin
        .from("content_ideas").select("source_title")
        .eq("kind", "marketing").order("created_at", { ascending: false }).limit(30);
      const recentStr = (recent || []).map((r) => String(r.source_title)).join(" ");
      const pool = shuffle(MARKETING_BOOKS.filter((b) => !recentStr.includes(b.book)));
      const pick = (pool.length >= count ? pool : shuffle(MARKETING_BOOKS)).slice(0, count);
      ideas = await callLLM(marketingPrompt(pick), GROQ_KEY, 0.75);
    } else if (mode === "ad") {
      const brief = (body.brief || {}) as Record<string, string>;
      const client = String(brief.client || "").trim();
      if (!client) return json({ error: "اكتب اسم المنتج أو الجهة في خانة الإعلان." }, 400);
      ideas = await callLLM(
        adPrompt({ client, field: String(brief.field || ""), goal: String(brief.goal || "") }, count),
        GROQ_KEY,
        0.85,
      );
      for (const x of ideas) { if (!x.source_title) x.source_title = client; if (!x.topic) x.topic = "إعلان"; }
    } else {
      const news = await gatherNews();
      if (!news.length) return json({ error: "تعذّر جلب الأخبار الآن، حاول بعد قليل." }, 502);
      ideas = await callLLM(newsPrompt(news, count), GROQ_KEY, 0.7);
      // ربط الرابط الحقيقي بمطابقة العنوان (النموذج لا يرى الروابط لتوفير التوكنات)
      const norm = (s: string) => (s || "").replace(/^\s*\[[^\]]*\]\s*/, "").toLowerCase().replace(/\s+/g, " ").trim();
      for (const x of ideas) {
        x.source_title = String(x.source_title || "").replace(/^\s*\[[^\]]*\]\s*/, "").trim();
        const t = norm(String(x.source_title));
        const hit = news.find((n) => {
          const nt = norm(n.title);
          return t.length > 8 && (nt.includes(t.slice(0, 20)) || t.includes(nt.slice(0, 20)));
        });
        if (hit) { x.source_url = hit.url; x.source_pub = hit.pub || x.source_pub; }
      }
    }

    const batch_id = crypto.randomUUID();
    const rows = ideas.map((x) => ({
      owner: null,
      batch_id,
      kind: mode,
      topic: x.topic ?? null,
      source_title: x.source_title ?? null,
      source_url: x.source_url ?? null,
      source_pub: x.source_pub ?? null,
      virality: x.virality ?? null,
      hook: x.hook ?? null,
      script: x.script ?? null,
      screen_title: x.screen_title ?? null,
      footage: Array.isArray(x.footage) ? x.footage : null,
      hashtags: Array.isArray(x.hashtags) ? x.hashtags : null,
      service_tie: x.service_tie ?? null,
      cta: x.cta ?? null,
      status: "new",
    }));
    const { data: inserted, error } = await admin.from("content_ideas").insert(rows).select();
    if (error) return json({ error: "تعذّر الحفظ: " + error.message }, 500);

    return json({ batch_id, mode, count: inserted.length, ideas: inserted });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
