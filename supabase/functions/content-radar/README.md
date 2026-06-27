# محتوى الاستوديو — content-radar

مولّد محتوى بوضعين، **منشور وشغّال** على مشروع Supabase (`rrerwhhxrjyzmnnjsfev`):

- **📡 أخبار** — أهم أخبار مجالك من Google News RSS (مجاني) → سكربتات بلهجتك، مع رابط المصدر للتحقق.
- **📖 قصص** — قصص واقعية **مؤصّلة ببحث ويكيبيديا** (حقائق حقيقية، بلا هلوسة)، من قائمة شخصيات منسّقة في مجالك، مع رابط المصدر.

**محرّك الكتابة:** Groq (Llama 3.3 70B) — مجاني. **البحث:** RSS + ويكيبيديا — مجاني بلا مفتاح.
الصفحة بدون تسجيل دخول. التكلفة: **صفر**.

---

## الإعدادات الحالية (تمّت)
- جدول `content_ideas` + سياسة وصول مفتوحة (RLS) — منفّذ.
- الدالة `content-radar` منشورة بـ `--no-verify-jwt`.
- السرّ `GROQ_API_KEY` مضبوط في أسرار المشروع.
- الصفحة: `https://ibrahimsaud.com/app/studio.html`

## إعادة النشر بعد أي تعديل على الكود
```bash
export SUPABASE_ACCESS_TOKEN=<رمز من Supabase ▸ Account ▸ Access Tokens>
npx supabase functions deploy content-radar --project-ref rrerwhhxrjyzmnnjsfev --no-verify-jwt
```

## ضبط/تبديل المفتاح أو النموذج
```bash
npx supabase secrets set GROQ_API_KEY=gsk_...     --project-ref rrerwhhxrjyzmnnjsfev
npx supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile --project-ref rrerwhhxrjyzmnnjsfev
```

---

## ملاحظات وتخصيص
- **القصص:** عدّل قائمة `STORY_SEEDS` في `index.ts` لإضافة/حذف شخصيات (لازم لها صفحة ويكيبيديا).
- **الأخبار:** عدّل مصفوفة `FEEDS`. ملاحظة: حد Groq المجاني ≈ 12 ألف توكن/دقيقة، فالعناوين محدودة بـ 18.
- عدد العناصر/الضغطة: `count` في `studio.html` (1–8).
- القصص مؤصّلة بويكيبيديا — موثوقة، لكن راجع أي تفصيل حسّاس قبل النشر.
