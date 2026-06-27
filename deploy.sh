#!/usr/bin/env bash
# نشر نظام الشركة التقنية (مشروع static — بدون خطوة build)
# الاستخدام:  ./deploy.sh "رسالة التحديث"
set -e
cd "$(dirname "$0")"

MSG="${1:-تحديث النظام $(date '+%Y-%m-%d %H:%M')}"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "⚠ لم يُضبط مستودع بعيد بعد. أضِفه أولاً:"
  echo "   git remote add origin <رابط مستودع GitHub الجديد>"
  exit 1
fi

echo "▶ رفع التغييرات إلى GitHub..."
git add -A
if git diff --cached --quiet; then
  echo "لا توجد تغييرات جديدة."
else
  git commit -m "$MSG"
fi
git pull --rebase origin main 2>/dev/null || true
git push origin main
echo "✅ تم الدفع. حدّث الاستضافة (GitHub Pages / Netlify / Vercel) إن لزم."
