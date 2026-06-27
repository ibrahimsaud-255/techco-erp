-- ====== سكربت موحّد لتجهيز قاعدة بيانات الشركة الجديدة ======
-- يُشغَّل مرة واحدة في Supabase ▸ SQL Editor. آمن لإعادة التشغيل.


-- ##################################################
-- ### 00_base.sql
-- ##################################################

-- ============================================================
--  الجداول الأساسية + مخزن صور المهام
--  (مستخرجة من المشروع الأصلي — تُشغَّل قبل بقية ملفات SQL)
--  آمنة لإعادة التشغيل (idempotent).
-- ============================================================

create table if not exists public.antar_inbox (
  id uuid not null default gen_random_uuid(),
  text text not null,
  scheduled_for date,
  done boolean default false,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.app_state (
  id uuid not null default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.freelancers (
  id uuid not null default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  name text,
  email text,
  token text default encode(gen_random_bytes(12), 'hex'::text),
  created_at timestamp with time zone default now(),
  icon text default '🎬'::text,
  primary key (id)
);

create table if not exists public.guest_registrations (
  id uuid not null default gen_random_uuid(),
  full_name text not null,
  nickname text,
  email text not null,
  phone text,
  field text,
  journey text,
  value text,
  misconception text,
  turning_point text,
  dream_question text,
  avoid text,
  no_social boolean default false,
  x text,
  instagram text,
  linkedin text,
  youtube text,
  tiktok text,
  website text,
  bio_links text,
  created_at timestamp with time zone default now(),
  primary key (id)
);

create table if not exists public.tasks (
  id uuid not null default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  project_title text,
  title text,
  stage text,
  freelancer_id uuid,
  done boolean default false,
  updated_at timestamp with time zone default now(),
  client_id text,
  project_id text,
  version_url text,
  version_note text,
  approved boolean not null default false,
  approved_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- ── مخزن صور المهام/التسليمات (task-images) ──────────────────
insert into storage.buckets (id, name, public)
values ('task-images', 'task-images', true)
on conflict (id) do nothing;

drop policy if exists task_images_read on storage.objects;
create policy task_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'task-images');

drop policy if exists task_images_write on storage.objects;
create policy task_images_write on storage.objects
  for all to authenticated
  using (bucket_id = 'task-images')
  with check (bucket_id = 'task-images');

-- ##################################################
-- ### security.sql
-- ##################################################

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

-- ##################################################
-- ### production_room.sql
-- ##################################################

-- ============================================================
--  غرفة المشروع — طبقة إدارة الإنتاج والتعديلات
--  المشروع: rrerwhhxrjyzmnnjsfev (نظام الأعمال)
--  شغّله في: Supabase → SQL Editor → New query → Run
--  آمن لإعادة التشغيل (idempotent). إضافي فقط — لا يحذف شيئاً.
--
--  الفكرة: كل مهمة (task) = تسليم/فيديو. نضيف لها نسخة + تعديلات
--  مرقّمة + تعليقات. العميل والفريلانسر (بلا حسابات) يصلون عبر
--  دوال RPC (SECURITY DEFINER) بالتوكن فقط — لا وصول مباشر للجداول.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 1) أعمدة جديدة على tasks (التسليمات) ----------
alter table public.tasks add column if not exists project_id   text;
alter table public.tasks add column if not exists version_url  text;   -- رابط آخر نسخة سلّمها الفريلانسر
alter table public.tasks add column if not exists version_note text;   -- ملاحظة الفريلانسر مع التسليم
alter table public.tasks add column if not exists approved     boolean not null default false;
alter table public.tasks add column if not exists approved_at  timestamptz;
-- updated_at مطلوب لترتيب التسليمات في room_get/fl_room — غيابه يسبب «رابط غير صالح».
alter table public.tasks add column if not exists created_at   timestamptz not null default now();
alter table public.tasks add column if not exists updated_at   timestamptz not null default now();
-- تحديث updated_at تلقائياً عند أي تعديل
create or replace function public.tasks_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists tasks_touch_trg on public.tasks;
create trigger tasks_touch_trg before update on public.tasks
  for each row execute function public.tasks_touch();

-- ---------- 2) غرف العملاء (توكن العميل لكل مشروع) ----------
create table if not exists public.project_rooms (
  id                  uuid primary key default gen_random_uuid(),
  owner               uuid not null default auth.uid(),
  project_id          text not null,                         -- = id المشروع في app_state
  project_title       text,
  client_name         text,
  client_phone        text,
  client_email        text,
  revisions_included  int  not null default 2,               -- التعديلات المجانية ضمن الباقة
  client_token        text not null unique default encode(gen_random_bytes(16),'hex'),
  created_at          timestamptz not null default now(),
  unique (owner, project_id)
);

-- ---------- 3) التعديلات المرقّمة ----------
create table if not exists public.revisions (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null default auth.uid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  num          int  not null,                                -- ترقيم تسلسلي لكل تسليم
  body         text not null,
  requested_by text not null default 'client',               -- client | owner
  billable     boolean not null default false,               -- تجاوز الباقة = مدفوع
  status       text not null default 'pending',               -- pending | done
  created_at   timestamptz not null default now(),
  done_at      timestamptz
);
create index if not exists revisions_task_idx on public.revisions(task_id);

-- ---------- 4) تعليقات الغرفة (محادثة لكل تسليم) ----------
create table if not exists public.room_comments (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  author      text not null default 'client',                -- client | freelancer | owner
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists room_comments_task_idx on public.room_comments(task_id);

-- ============================================================
--  RLS — المالك يرى/يعدّل صفوفه فقط (auth.uid)
-- ============================================================
alter table public.project_rooms enable row level security;
drop policy if exists project_rooms_owner on public.project_rooms;
create policy project_rooms_owner on public.project_rooms
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

alter table public.revisions enable row level security;
drop policy if exists revisions_owner on public.revisions;
create policy revisions_owner on public.revisions
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

alter table public.room_comments enable row level security;
drop policy if exists room_comments_owner on public.room_comments;
create policy room_comments_owner on public.room_comments
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- ============================================================
--  دوال العميل (بتوكن project_rooms.client_token)
-- ============================================================

-- عرض الغرفة: معلومات المشروع + كل التسليمات مع نسخها وتعديلاتها وتعليقاتها
create or replace function public.room_get(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.project_rooms; result json;
begin
  select * into r from public.project_rooms where client_token = p_token;
  if not found then return null; end if;

  select json_build_object(
    'project_title', r.project_title,
    'client_name',   r.client_name,
    'revisions_included', r.revisions_included,
    'deliverables', coalesce((
      select json_agg(json_build_object(
        'id', t.id,
        'title', t.title,
        'stage', t.stage,
        'version_url', t.version_url,
        'version_note', t.version_note,
        'approved', t.approved,
        'rev_total', (select count(*) from public.revisions rv where rv.task_id = t.id),
        'rev_pending', (select count(*) from public.revisions rv where rv.task_id = t.id and rv.status='pending'),
        'revisions', coalesce((select json_agg(json_build_object(
              'id', rv.id,'num',rv.num,'body',rv.body,'requested_by',rv.requested_by,
              'billable',rv.billable,'status',rv.status,'created_at',rv.created_at
            ) order by rv.num) from public.revisions rv where rv.task_id = t.id), '[]'::json),
        'comments', coalesce((select json_agg(json_build_object(
              'author',c.author,'author_name',c.author_name,'body',c.body,'created_at',c.created_at
            ) order by c.created_at) from public.room_comments c where c.task_id = t.id), '[]'::json)
      ) order by t.updated_at)
      from public.tasks t where t.owner = r.owner and t.project_id = r.project_id
    ), '[]'::json)
  ) into result;
  return result;
end $$;

-- إضافة تعديل من العميل (يحسب الترقيم وعلم التكلفة تلقائياً)
create or replace function public.room_add_revision(p_token text, p_task uuid, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.project_rooms; n int; bill boolean;
begin
  select * into r from public.project_rooms where client_token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  if not exists (select 1 from public.tasks t where t.id = p_task and t.owner = r.owner and t.project_id = r.project_id) then
    return json_build_object('error','task');
  end if;
  if coalesce(btrim(p_body),'') = '' then return json_build_object('error','empty'); end if;

  select count(*)+1 into n from public.revisions where task_id = p_task;
  bill := n > r.revisions_included;
  insert into public.revisions(owner, task_id, num, body, requested_by, billable, status)
  values (r.owner, p_task, n, p_body, 'client', bill, 'pending');
  update public.tasks set approved = false, approved_at = null where id = p_task;
  return json_build_object('ok', true, 'num', n, 'billable', bill);
end $$;

-- اعتماد العميل لتسليم
create or replace function public.room_approve(p_token text, p_task uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r public.project_rooms;
begin
  select * into r from public.project_rooms where client_token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  update public.tasks set approved = true, approved_at = now()
   where id = p_task and owner = r.owner and project_id = r.project_id;
  if not found then return json_build_object('error','task'); end if;
  return json_build_object('ok', true);
end $$;

-- تعليق من العميل
create or replace function public.room_comment(p_token text, p_task uuid, p_name text, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.project_rooms;
begin
  select * into r from public.project_rooms where client_token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  if not exists (select 1 from public.tasks t where t.id = p_task and t.owner = r.owner and t.project_id = r.project_id) then
    return json_build_object('error','task'); end if;
  if coalesce(btrim(p_body),'') = '' then return json_build_object('error','empty'); end if;
  insert into public.room_comments(owner, task_id, author, author_name, body)
  values (r.owner, p_task, 'client', coalesce(nullif(btrim(p_name),''), r.client_name), p_body);
  return json_build_object('ok', true);
end $$;

-- ============================================================
--  دوال الفريلانسر (بتوكن freelancers.token الموجود)
-- ============================================================

-- غرفة الفريلانسر: مهامه مع النسخة + التعديلات المعلّقة + التعليقات
create or replace function public.fl_room(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare f public.freelancers; result json;
begin
  select * into f from public.freelancers where token = p_token;
  if not found then return null; end if;

  select json_build_object(
    'name', f.name, 'icon', f.icon,
    'deliverables', coalesce((
      select json_agg(json_build_object(
        'id', t.id, 'title', t.title, 'project_title', t.project_title, 'stage', t.stage,
        'version_url', t.version_url, 'version_note', t.version_note, 'approved', t.approved,
        'revisions', coalesce((select json_agg(json_build_object(
              'id',rv.id,'num',rv.num,'body',rv.body,'requested_by',rv.requested_by,
              'billable',rv.billable,'status',rv.status
            ) order by rv.num) from public.revisions rv where rv.task_id = t.id), '[]'::json),
        'comments', coalesce((select json_agg(json_build_object(
              'author',c.author,'author_name',c.author_name,'body',c.body,'created_at',c.created_at
            ) order by c.created_at) from public.room_comments c where c.task_id = t.id), '[]'::json)
      ) order by t.updated_at)
      from public.tasks t where t.freelancer_id = f.id
    ), '[]'::json)
  ) into result;
  return result;
end $$;

-- تسليم نسخة جديدة (رابط + ملاحظة) — يصفّر الاعتماد
create or replace function public.fl_submit_version(p_token text, p_task uuid, p_url text, p_note text)
returns json language plpgsql security definer set search_path = public as $$
declare f public.freelancers;
begin
  select * into f from public.freelancers where token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  update public.tasks set version_url = p_url, version_note = p_note, approved = false, approved_at = null
   where id = p_task and freelancer_id = f.id;
  if not found then return json_build_object('error','task'); end if;
  return json_build_object('ok', true);
end $$;

-- تعليم تعديل كمنجَز
create or replace function public.fl_revision_done(p_token text, p_rev uuid)
returns json language plpgsql security definer set search_path = public as $$
declare f public.freelancers;
begin
  select * into f from public.freelancers where token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  update public.revisions set status='done', done_at=now()
   where id = p_rev and task_id in (select id from public.tasks where freelancer_id = f.id);
  if not found then return json_build_object('error','rev'); end if;
  return json_build_object('ok', true);
end $$;

-- تعليق من الفريلانسر
create or replace function public.fl_comment(p_token text, p_task uuid, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare f public.freelancers;
begin
  select * into f from public.freelancers where token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  if not exists (select 1 from public.tasks where id = p_task and freelancer_id = f.id) then
    return json_build_object('error','task'); end if;
  if coalesce(btrim(p_body),'') = '' then return json_build_object('error','empty'); end if;
  insert into public.room_comments(owner, task_id, author, author_name, body)
  values ((select owner from public.tasks where id = p_task), p_task, 'freelancer', f.name, p_body);
  return json_build_object('ok', true);
end $$;

-- منح صلاحية تنفيذ الدوال للزوّار (anon) والمصادَقين
grant execute on function public.room_get(text)                           to anon, authenticated;
grant execute on function public.room_add_revision(text, uuid, text)      to anon, authenticated;
grant execute on function public.room_approve(text, uuid)                 to anon, authenticated;
grant execute on function public.room_comment(text, uuid, text, text)     to anon, authenticated;
grant execute on function public.fl_room(text)                            to anon, authenticated;
grant execute on function public.fl_submit_version(text, uuid, text, text) to anon, authenticated;
grant execute on function public.fl_revision_done(text, uuid)             to anon, authenticated;
grant execute on function public.fl_comment(text, uuid, text)             to anon, authenticated;

-- ##################################################
-- ### analytics.sql
-- ##################################################

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

-- ##################################################
-- ### blog.sql
-- ##################################################

-- ============================================================
--  المدونة — إبراهيم سعود
--  شغّل هذا الملف في:  Supabase → SQL Editor → New query → Run
--  آمن لإعادة التشغيل (idempotent).
--
--  الفكرة:
--   • posts          → المقالات المنشورة (يقرؤها الجميع، يكتبها المدير فقط).
--   • blog_settings  → صف واحد فيه اسم الكاتب وصورته الشخصية المشتركة،
--                      تغيّرها مرّة واحدة فتتغيّر في كل المقالات.
--   • bucket blog-images → صور المقالات والصورة الشخصية (عام للقراءة).
-- ============================================================

-- ── 1) جدول المقالات ────────────────────────────────────────
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  excerpt      text default '',
  body_html    text not null default '',
  cover_url    text default '',
  greg_date    text default '',          -- التاريخ الميلادي بالعربي (ثابت وقت النشر)
  hijri_date   text default '',          -- التاريخ الهجري بالعربي (ثابت وقت النشر)
  reading_min  int  default 1,
  status       text default 'published', -- published | draft
  published_at timestamptz default now(),
  created_at   timestamptz default now()
);
create index if not exists posts_published_idx on public.posts(published_at desc);

alter table public.posts enable row level security;

-- الجميع (anon) يقرؤون المقالات المنشورة فقط
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts
  for select to anon, authenticated
  using (status = 'published' or auth.role() = 'authenticated');

-- المدير المصادَق فقط يضيف/يعدّل/يحذف
drop policy if exists posts_write on public.posts;
create policy posts_write on public.posts
  for all to authenticated
  using (true) with check (true);

-- ── 2) إعدادات المدونة (صف واحد، id = 1) ────────────────────
create table if not exists public.blog_settings (
  id                int primary key default 1,
  author_name       text default 'إبراهيم سعود',
  author_title      text default 'تقنية أعمال وبودكاست',
  author_avatar_url text default '',
  updated_at        timestamptz default now(),
  constraint blog_settings_singleton check (id = 1)
);
insert into public.blog_settings (id) values (1) on conflict (id) do nothing;

alter table public.blog_settings enable row level security;

-- الجميع يقرؤون الإعدادات (لعرض الصورة الشخصية للقارئ)
drop policy if exists blog_settings_read on public.blog_settings;
create policy blog_settings_read on public.blog_settings
  for select to anon, authenticated using (true);

-- المدير فقط يعدّل
drop policy if exists blog_settings_write on public.blog_settings;
create policy blog_settings_write on public.blog_settings
  for all to authenticated
  using (true) with check (true);

-- ── 3) bucket صور المدونة (عام) ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- الجميع يقرؤون الصور
drop policy if exists blog_images_read on storage.objects;
create policy blog_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'blog-images');

-- المدير المصادَق فقط يرفع/يعدّل/يحذف
drop policy if exists blog_images_write on storage.objects;
create policy blog_images_write on storage.objects
  for all to authenticated
  using (bucket_id = 'blog-images')
  with check (bucket_id = 'blog-images');

-- ============================================================
--  تحقّق سريع
-- ============================================================
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' and tablename in ('posts','blog_settings');

-- ##################################################
-- ### prompts.sql
-- ##################################################

-- ============================================================
--  مكتبة البرومتات — إبراهيم سعود
--  شغّل هذا الملف في:  Supabase → SQL Editor → New query → Run
--  آمن لإعادة التشغيل (idempotent).
--
--  الفكرة:
--   • prompts → برومتات محفوظة (نص + صورة نتيجة + تصنيف) لنسخها بسهولة.
--   • خاصّة بالكامل: لا يقرؤها ولا يكتبها إلا المدير المصادَق (تسجيل الدخول).
--   • الصور تُرفع في bucket: blog-images (نفس مخزن المدونة) داخل مجلد prompts/.
--     لا حاجة لإنشاء bucket جديد — موجود مسبقاً من إعداد المدونة.
-- ============================================================

-- ── جدول البرومتات ─────────────────────────────────────────
create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text default '',          -- مثل: «دمج فوتوشوب»، «صور منتجات»…
  tool        text default '',          -- الأداة: Photoshop / Midjourney / …
  body        text not null default '', -- نص البرومت نفسه (للنسخ)
  image_url   text default '',          -- صورة نتيجة البرومت (اختياري)
  notes       text default '',          -- ملاحظات إضافية (اختياري)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists prompts_created_idx on public.prompts(created_at desc);
create index if not exists prompts_category_idx on public.prompts(category);

alter table public.prompts enable row level security;

-- خاصّ: المدير المصادَق فقط يقرأ ويضيف ويعدّل ويحذف. (anon لا يرى شيئاً)
drop policy if exists prompts_all on public.prompts;
create policy prompts_all on public.prompts
  for all to authenticated
  using (true)
  with check (true);

-- ── مخزن الصور (نفس bucket المدونة) ────────────────────────
-- آمن لإعادة التشغيل؛ يضمن وجود المخزن وسياساته حتى لو لم تُشغّل blog.sql.
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- الجميع يقرؤون الصور (روابط الصور عامّة)
drop policy if exists blog_images_read on storage.objects;
create policy blog_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'blog-images');

-- المدير المصادَق فقط يرفع/يعدّل/يحذف
drop policy if exists blog_images_write on storage.objects;
create policy blog_images_write on storage.objects
  for all to authenticated
  using (bucket_id = 'blog-images')
  with check (bucket_id = 'blog-images');

-- ##################################################
-- ### content_ideas.sql
-- ##################################################

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  نظام محتوى الاستوديو — جدول الأفكار (أخبار + قصص)             ║
-- ║  شغّل هذا الملف في Supabase ▸ SQL Editor (آمن لإعادة التشغيل). ║
-- ╚══════════════════════════════════════════════════════════════╝

create table if not exists public.content_ideas (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid,
  batch_id      uuid,
  kind          text not null default 'news',  -- news | story
  created_at    timestamptz not null default now(),

  topic         text,
  source_title  text,   -- عنوان الخبر / اسم الشخصية أو الشركة (للقصص)
  source_url    text,
  source_pub    text,

  virality      text,
  hook          text,
  script        text,   -- السكربت (أخبار) أو السرد (قصص)
  screen_title  text,
  footage       text[],
  hashtags      text[],
  service_tie   text,
  cta           text,

  status        text not null default 'new'    -- new | used | archived
);

-- إضافات لمن شغّل النسخة القديمة من قبل (آمنة):
alter table public.content_ideas add column if not exists kind text not null default 'news';
alter table public.content_ideas alter column owner drop not null;

create index if not exists content_ideas_kind_created_idx
  on public.content_ideas (kind, created_at desc);

-- ===== الوصول =====
-- الصفحة خاصة وغير معلنة، بلا تسجيل دخول — نسمح بالوصول عبر المفتاح العام.
alter table public.content_ideas enable row level security;

drop policy if exists "content_ideas owner all" on public.content_ideas;
drop policy if exists "content_ideas open"      on public.content_ideas;
create policy "content_ideas open"
  on public.content_ideas
  for all
  using (true)
  with check (true);

-- ##################################################
-- ### guests-read-policy.sql
-- ##################################################

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
