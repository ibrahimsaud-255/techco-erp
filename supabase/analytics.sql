-- ============================================================
--  تحليلات الزيارات — عدّاد زيارات الموقع العام
--  المشروع: rrerwhhxrjyzmnnjsfev (نظام الأعمال)
--  شغّله في: Supabase → SQL Editor → New query → Run
--  آمن لإعادة التشغيل (idempotent).
--
--  الفكرة: كل فتح لصفحة في الموقع يضيف صفّاً هنا (دون حساب).
--  لوحة البيانات تقرأ العدد (للمالك المسجَّل فقط).
-- ============================================================

create table if not exists public.pageviews (
  id         bigint generated always as identity primary key,
  path       text,                         -- المسار الذي زاره الزائر
  ref        text,                         -- مصدر الزيارة (referrer)
  created_at timestamptz not null default now()
);

create index if not exists pageviews_created_idx on public.pageviews(created_at);

alter table public.pageviews enable row level security;

-- الزوّار (anon) يضيفون زيارة فقط — لا يقرؤون أي صفوف
drop policy if exists pv_insert on public.pageviews;
create policy pv_insert on public.pageviews
  for insert to anon, authenticated
  with check (true);

-- القراءة/العدّ للمالك المسجَّل فقط (لوحة التحكم)
drop policy if exists pv_select on public.pageviews;
create policy pv_select on public.pageviews
  for select to authenticated
  using (true);
