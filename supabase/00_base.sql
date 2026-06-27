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
