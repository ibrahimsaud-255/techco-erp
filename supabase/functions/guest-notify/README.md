# إشعارات الضيوف — guest-notify

عند تسجيل ضيف جديد في «كن ضيفاً في بودكاست سَعي»، يُرسل النظام:
1. **تأكيد للضيف** بأننا استلمنا طلبه وموعده المبدئي.
2. **تنبيه لك** (ibrahimsaud25@gmail.com) بكل تفاصيل التسجيل.

المشروع: **الضيوف** (`kcqbihxqhmbgdmovofbp`). الإرسال عبر **Resend** (مجاني 100 إيميل/يوم).
رابط الدالة: `https://kcqbihxqhmbgdmovofbp.supabase.co/functions/v1/guest-notify`

---

## الخطوات (مرة واحدة)

### 1) حساب Resend + مفتاح
- سجّل في <https://resend.com> **بإيميلك ibrahimsaud25@gmail.com**.
- API Keys ▸ Create ▸ انسخ المفتاح (يبدأ بـ `re_`).

### 2) أسرار الدالة (Supabase ▸ مشروع الضيوف ▸ Edge Functions ▸ Secrets)
| الاسم | القيمة |
|---|---|
| `RESEND_API_KEY` | مفتاحك `re_...` |
| `ADMIN_EMAIL` | `ibrahimsaud25@gmail.com` |
| `WEBHOOK_SECRET` | أي كلمة سرية طويلة تخترعها (نستخدمها بالخطوة 4) |
| `RESEND_FROM` | مبدئياً اتركه أو ضع `سَعي <onboarding@resend.dev>` |

### 3) Database Webhook (يربط التسجيل بالدالة)
Supabase ▸ Database ▸ **Webhooks** ▸ Create:
- Table: `guest_registrations` — Event: **INSERT**
- Type: **Supabase Edge Functions** ▸ اختر `guest-notify`
- HTTP Headers ▸ أضف: `Authorization` = `Bearer <نفس WEBHOOK_SECRET>`
- Save.

### 4) جرّب
سجّل ضيفاً تجريبياً من `ibrahimsaud.com/register/` → المفروض يوصلك **إيميل التنبيه فوراً**.

---

## تأكيد الضيف (يحتاج توثيق دومين)
في وضع Resend الافتراضي (`onboarding@resend.dev`) يُسمح بالإرسال **لإيميلك فقط** — فالتنبيه لك يشتغل فوراً، أما **تأكيد الضيف لأي إيميل** فيتطلّب توثيق دومينك:
1. Resend ▸ Domains ▸ Add Domain ▸ `ibrahimsaud.com`.
2. أضف سجلات DNS (SPF/DKIM) اللي يعطيك إياها Resend عند مزوّد نطاقك.
3. بعد التوثيق، غيّر السرّ `RESEND_FROM` إلى مثل: `سَعي <podcast@ibrahimsaud.com>`.
4. بكذا تأكيدات الضيوف تنرسل لأي إيميل.

> الدالة تتعامل مع كل إيميل على حدة — فلو فشل إيميل الضيف (قبل التوثيق) يظل تنبيهك يصلك.
