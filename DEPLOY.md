# النشر — GitHub Pages + sa3ypodcast.com

المشروع static بالكامل (HTML + JS + Supabase) — لا يحتاج خطوة build.
المستودع: <https://github.com/ibrahimsaud-255/techco-erp> (عام) — الفرع `main`.

## 1) أول رفع للكود (من جهاز إبراهيم)
```bash
cd "/Users/ibrahimsaud/التقنية_نظام"
git remote add origin https://github.com/ibrahimsaud-255/techco-erp.git
git push -u origin main
```

## 2) تفعيل GitHub Pages (بعد الرفع)
في صفحة المستودع: **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: **main** / **/ (root)** → Save
- بعد لحظات سيلتقط الدومين المخصص تلقائياً من ملف `CNAME` (= `sa3ypodcast.com`).
- فعّل **Enforce HTTPS** بعد نجاح فحص الـ DNS.

## 3) ضبط DNS لـ sa3ypodcast.com (عند مسجّل الدومين)
**سجلّات A للنطاق الأساسي (الاسم `@`):**
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```
**سجل CNAME للـ www:** الاسم `www` → القيمة `ibrahimsaud-255.github.io`

(اختياري IPv6 — سجلّات AAAA للاسم `@`):
`2606:50c0:8000::153`، `2606:50c0:8001::153`، `2606:50c0:8002::153`، `2606:50c0:8003::153`

> الانتشار يأخذ من دقائق حتى ساعة غالباً. بعدها: `https://sa3ypodcast.com` يفتح النظام (يحوّل تلقائياً إلى `/app/`).

## 4) قاعدة البيانات
`SUPA_URL` و `SUPA_KEY` في `app/index.html` يشيران لمشروع Supabase `techco-erp` (مضبوطة).

## التحديث لاحقاً
```bash
./deploy.sh "وصف التحديث"
```
أو يدوياً: `git add -A && git commit -m "..." && git push` — والموقع يتحدّث تلقائياً.
