#!/usr/bin/env bash
# نشر الموقع على ibrahimsaud.com
# الاستخدام:  ./deploy.sh "رسالة التحديث"
# أو بدون رسالة:  ./deploy.sh   (يستخدم رسالة افتراضية بالتاريخ)

set -e  # توقّف عند أي خطأ

cd "$(dirname "$0")"  # اعمل داخل مجلد المشروع

# رسالة الكومِت (من أول وسيط، وإلا رسالة افتراضية)
MSG="${1:-تحديث الموقع $(date '+%Y-%m-%d %H:%M')}"

echo "▶ فحص سريع للبناء..."
npm run build

echo "▶ رفع التغييرات إلى GitHub..."
git add -A
# لا تسوِّ كومِت لو ما فيه تغييرات
if git diff --cached --quiet; then
  echo "لا توجد تغييرات جديدة لرفعها."
else
  git commit -m "$MSG"
fi

# زامن مع أي تغييرات بعيدة ثم ادفع
git pull --rebase origin main
git push origin main

echo ""
echo "✅ تم الدفع. GitHub Actions يبني وينشر الآن."
echo "   تابع الحالة: https://github.com/ibrahimsaud-255/ibrahimsaud-site/actions"
echo "   الموقع يتحدّث خلال 1–3 دقائق: https://ibrahimsaud.com"
