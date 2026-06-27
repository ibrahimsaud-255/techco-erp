-- صلاحيات جدول تسجيلات الضيوف (guest_registrations)
-- شغّل هذا مرة واحدة في Supabase ▸ SQL Editor إن ظهرت رسالة "تعذّر قراءة تسجيلات الضيوف".
--
-- مهم: عند تفعيل RLS يُرفض كل وصول لا تسمح به سياسة صريحة. لذلك نضيف هنا سياستين معاً:
--   1) سماح الإدخال للنموذج العام (anon)  → حتى لا تتوقف تسجيلات الضيوف الجديدة.
--   2) سماح القراءة للمالك المسجَّل دخوله (authenticated) → لعرضها داخل النظام.
-- الملف آمن للتشغيل أكثر من مرة (idempotent).

alter table public.guest_registrations enable row level security;

-- (1) إدخال عام من نموذج الاستبيان — anon (والمسجّل دخوله أيضاً)
drop policy if exists "public can register" on public.guest_registrations;
create policy "public can register"
  on public.guest_registrations
  for insert
  to anon, authenticated
  with check (true);

-- (2) قراءة المالك (الحساب المسجَّل دخوله) داخل النظام
drop policy if exists "owner reads guests" on public.guest_registrations;
create policy "owner reads guests"
  on public.guest_registrations
  for select
  to authenticated
  using (true);
