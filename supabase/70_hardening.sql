-- ============================================================
--  تحصين أمني — 2 يوليو 2026 (idempotent)
--  1) demo_seed كان الجدول الوحيد بدون RLS: مع صلاحيات Supabase
--     الافتراضية كان بإمكان أي حامل للمفتاح العام تعديل بذرة
--     التجربة (تُزرع لكل حساب جديد). الآن: قراءة/كتابة لمدير
--     المنصّة فقط — الزرع يتم من التريغر (security definer)
--     فلا يتأثر.
-- ============================================================

alter table public.demo_seed enable row level security;

drop policy if exists demo_seed_admin on public.demo_seed;
create policy demo_seed_admin on public.demo_seed
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- سحب الصلاحيات الافتراضية من دور anon احتياطاً
revoke all on public.demo_seed from anon;

select 'hardening applied' as status;
