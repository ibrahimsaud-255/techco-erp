# نشر الموقع على ibrahimsaud.com عبر GitHub Pages

كل شيء في الكود جاهز: تم ضبط Next.js للتصدير الثابت، وإضافة ملف `CNAME`، و workflow ينشر تلقائياً.
باقي خطوتان تحتاجان حسابك أنت.

---

## ١) رفع المشروع على GitHub

أنشئ مستودعاً جديداً فارغاً على https://github.com/new (الاسم مثلاً `ibrahimsaud-site`، عام/Public).
ثم من مجلد المشروع نفّذ:

```bash
git remote add origin https://github.com/<اسم-حسابك>/ibrahimsaud-site.git
git push -u origin main
```

> الفرع الحالي اسمه `main` وكل التعديلات مُثبّتة (committed) وجاهزة للرفع.

## ٢) تفعيل GitHub Pages

في صفحة المستودع: **Settings → Pages → Build and deployment**
اختر المصدر **Source: GitHub Actions**.

بمجرد الرفع سيعمل الـ workflow تلقائياً (تبويب **Actions**)، يبني الموقع وينشره خلال ١–٢ دقيقة.

ثم في **Settings → Pages → Custom domain** اكتب:

```
ibrahimsaud.com
```

واضغط Save. (ملف CNAME موجود أصلاً في المستودع.) بعد نجاح فحص الـ DNS فعّل **Enforce HTTPS**.

---

## ٣) ضبط الـ DNS في Hostinger

ادخل Hostinger → **Domains → ibrahimsaud.com → DNS / Nameservers (DNS Zone)**.

**احذف** أي سجلّات `A` موجودة للاسم `@` (صفحة الإيقاف الافتراضية)، ثم أضف:

### سجلّات A للنطاق الأساسي (الاسم `@`)

| Type | Name | Points to / Value | TTL |
|------|------|-------------------|-----|
| A | @ | `185.199.108.153` | 3600 |
| A | @ | `185.199.109.153` | 3600 |
| A | @ | `185.199.110.153` | 3600 |
| A | @ | `185.199.111.153` | 3600 |

### سجل CNAME لـ www

| Type | Name | Points to / Value | TTL |
|------|------|-------------------|-----|
| CNAME | www | `<اسم-حسابك>.github.io` | 3600 |

> استبدل `<اسم-حسابك>` باسم مستخدمك في GitHub (حروف صغيرة).

(اختياري) لدعم IPv6 أضف سجلّات `AAAA` للاسم `@`:
`2606:50c0:8000::153` و `2606:50c0:8001::153` و `2606:50c0:8002::153` و `2606:50c0:8003::153`.

---

## ٤) الانتظار والتحقق

- انتشار الـ DNS يأخذ من دقائق حتى ٢٤ ساعة (غالباً أقل من ساعة).
- بعدها افتح https://ibrahimsaud.com — المفروض يشتغل الموقع.
- لو ظهر تحذير في GitHub Pages عن الـ DNS، انتظر قليلاً ثم اضغط زر إعادة الفحص.

## أي تعديل مستقبلي

عدّل الملفات (مثلاً `src/lib/site.ts` للروابط والمحتوى) ثم:

```bash
git add -A && git commit -m "تحديث" && git push
```

والموقع يُحدّث نفسه تلقائياً.
