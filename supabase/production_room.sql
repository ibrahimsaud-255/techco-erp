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
