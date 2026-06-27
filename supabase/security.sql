-- ============================================================
--  سياسات الأمان (RLS) لنظام إدارة الأعمال — إبراهيم سعود
--  شغّل هذا الملف في:  Supabase → SQL Editor → New query → Run
--  آمن لإعادة التشغيل (idempotent).
--
--  الفكرة: كل صف مملوك لمستخدم عبر العمود owner = auth.uid().
--  المستخدم المصادَق (المالك) يرى/يعدّل صفوفه فقط.
--  الفريلانسرز (غير مسجّلين) يصلون لمهامهم عبر دوال RPC بالـ token
--  فقط — لا وصول مباشر للجداول.
-- ============================================================

-- 1) app_state — حالة التطبيق (owner موجود مسبقًا)
alter table public.app_state enable row level security;
drop policy if exists app_state_owner on public.app_state;
create policy app_state_owner on public.app_state
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 2) freelancers — الفريق (owner موجود مسبقًا)
alter table public.freelancers enable row level security;
drop policy if exists freelancers_owner on public.freelancers;
create policy freelancers_owner on public.freelancers
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 3) tasks — مهام الفريلانسرز (owner موجود مسبقًا)
alter table public.tasks enable row level security;
drop policy if exists tasks_owner on public.tasks;
create policy tasks_owner on public.tasks
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 4) antar_inbox — الوارد السريع (لا يملك عمود owner بعد)
--    نضيف العمود بقيمة افتراضية auth.uid() فيُملأ تلقائيًا عند الإدخال
--    (لا حاجة لتعديل كود الواجهة)، ثم نملأ الصفوف القديمة بحساب المالك.
alter table public.antar_inbox add column if not exists owner uuid default auth.uid();
update public.antar_inbox
   set owner = (select id from auth.users where email = 'ibrahimsaud25@gmail.com')
 where owner is null;
alter table public.antar_inbox enable row level security;
drop policy if exists antar_inbox_owner on public.antar_inbox;
create policy antar_inbox_owner on public.antar_inbox
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- ============================================================
--  التحقق — شغّلها بعد ما فوق وتأكد من النتائج
-- ============================================================

-- (أ) RLS مفعّل على الجداول الأربعة؟ يجب أن تكون rowsecurity = true للجميع
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
   and tablename in ('app_state','freelancers','tasks','antar_inbox');

-- (ب) السياسات موجودة؟ يجب أن ترى صفًا لكل جدول، roles = {authenticated}
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('app_state','freelancers','tasks','antar_inbox');

-- (ج) دوال الفريلانسر يجب أن تكون SECURITY DEFINER لتبقى روابطهم تعمل
--     مع تفعيل RLS. لو ظهر security_definer = false لأي منها، نفّذ كتلة
--     الإصلاح في الأسفل.
select p.proname, p.prosecdef as security_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('get_freelancer','get_freelancer_tasks','set_task_done');

-- ============================================================
--  إصلاح (نفّذه فقط لو كان security_definer = false أعلاه)
--  عدّل أنواع المعاملات إن اختلفت لديك.
-- ============================================================
-- alter function public.get_freelancer(text)            security definer;
-- alter function public.get_freelancer_tasks(text)      security definer;
-- alter function public.set_task_done(text, uuid, bool) security definer;
