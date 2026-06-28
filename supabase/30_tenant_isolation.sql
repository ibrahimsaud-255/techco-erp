-- ============================================================
--  المرحلة ١ج — عزل البيانات حسب العميل (tenant_id)
--  آمنة لإعادة التشغيل (idempotent). تُشغَّل بعد 10_tenancy.sql
-- ============================================================

-- 1) إضافة عمود tenant_id لكل الجداول
alter table public.app_state          add column if not exists tenant_id uuid references public.tenants(id);
alter table public.freelancers        add column if not exists tenant_id uuid references public.tenants(id);
alter table public.tasks              add column if not exists tenant_id uuid references public.tenants(id);
alter table public.project_rooms      add column if not exists tenant_id uuid references public.tenants(id);
alter table public.revisions          add column if not exists tenant_id uuid references public.tenants(id);
alter table public.room_comments      add column if not exists tenant_id uuid references public.tenants(id);
-- جداول المحتوى (إضافة العمود فقط؛ سياساتها تبقى كما هي في هذه المرحلة)
alter table public.posts              add column if not exists tenant_id uuid references public.tenants(id);
alter table public.blog_settings      add column if not exists tenant_id uuid references public.tenants(id);
alter table public.prompts            add column if not exists tenant_id uuid references public.tenants(id);
alter table public.content_ideas      add column if not exists tenant_id uuid references public.tenants(id);
alter table public.pageviews          add column if not exists tenant_id uuid references public.tenants(id);
alter table public.guest_registrations add column if not exists tenant_id uuid references public.tenants(id);
alter table public.antar_inbox        add column if not exists tenant_id uuid references public.tenants(id);

-- 2) فهرس فريد لمزامنة المهام لكل عميل (يدعم upsert)
create unique index if not exists tasks_tenant_client_idx on public.tasks(tenant_id, client_id);

-- 3) سياسات RLS حسب العضوية للجداول الأساسية (بدل owner=auth.uid())
drop policy if exists app_state_owner on public.app_state;
drop policy if exists app_state_tenant on public.app_state;
create policy app_state_tenant on public.app_state for all to authenticated
  using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy if exists freelancers_owner on public.freelancers;
drop policy if exists freelancers_tenant on public.freelancers;
create policy freelancers_tenant on public.freelancers for all to authenticated
  using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy if exists tasks_owner on public.tasks;
drop policy if exists tasks_tenant on public.tasks;
create policy tasks_tenant on public.tasks for all to authenticated
  using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy if exists project_rooms_owner on public.project_rooms;
drop policy if exists project_rooms_tenant on public.project_rooms;
create policy project_rooms_tenant on public.project_rooms for all to authenticated
  using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy if exists revisions_owner on public.revisions;
drop policy if exists revisions_tenant on public.revisions;
create policy revisions_tenant on public.revisions for all to authenticated
  using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

drop policy if exists room_comments_owner on public.room_comments;
drop policy if exists room_comments_tenant on public.room_comments;
create policy room_comments_tenant on public.room_comments for all to authenticated
  using (public.is_member(tenant_id)) with check (public.is_member(tenant_id));

-- 4) تمرير tenant_id في دوال الغرفة (تنشئ صفوفاً يقرؤها المالك لاحقاً عبر RLS)
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
  insert into public.revisions(owner, tenant_id, task_id, num, body, requested_by, billable, status)
  values (r.owner, r.tenant_id, p_task, n, p_body, 'client', bill, 'pending');
  update public.tasks set approved = false, approved_at = null where id = p_task;
  return json_build_object('ok', true, 'num', n, 'billable', bill);
end $$;

create or replace function public.room_comment(p_token text, p_task uuid, p_name text, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.project_rooms;
begin
  select * into r from public.project_rooms where client_token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  if not exists (select 1 from public.tasks t where t.id = p_task and t.owner = r.owner and t.project_id = r.project_id) then
    return json_build_object('error','task'); end if;
  if coalesce(btrim(p_body),'') = '' then return json_build_object('error','empty'); end if;
  insert into public.room_comments(owner, tenant_id, task_id, author, author_name, body)
  values (r.owner, r.tenant_id, p_task, 'client', coalesce(nullif(btrim(p_name),''), r.client_name), p_body);
  return json_build_object('ok', true);
end $$;

create or replace function public.fl_comment(p_token text, p_task uuid, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare f public.freelancers;
begin
  select * into f from public.freelancers where token = p_token;
  if not found then return json_build_object('error','unauthorized'); end if;
  if not exists (select 1 from public.tasks where id = p_task and freelancer_id = f.id) then
    return json_build_object('error','task'); end if;
  if coalesce(btrim(p_body),'') = '' then return json_build_object('error','empty'); end if;
  insert into public.room_comments(owner, tenant_id, task_id, author, author_name, body)
  values ((select owner from public.tasks where id = p_task),
          (select tenant_id from public.tasks where id = p_task),
          p_task, 'freelancer', f.name, p_body);
  return json_build_object('ok', true);
end $$;

-- 5) استكمال الكتالوج بالتطبيقات الفعلية الناقصة (أساسية)
insert into public.app_catalog (app_key, name, description, category, is_core) values
  ('antar',      'عنتر',                 'مساعد ذكي سريع',              'core', true),
  ('dashboards', 'لوحات البيانات',        'نظرة عامة وإحصاءات',          'core', true),
  ('products',   'المنتجات',             'كتالوج المنتجات والأسعار',     'core', true),
  ('subs',       'الاشتراكات والمصروفات', 'إدارة الاشتراكات والمصروفات',  'core', true),
  ('contacts',   'العملاء',              'دفتر العملاء وجهات الاتصال',    'core', true),
  ('team',       'الفريق',               'إدارة الفريق/الفريلانسرز',      'core', true)
on conflict (app_key) do nothing;

-- 6) تفعيل التطبيقات: إبراهيم سعود كل التطبيقات، الشركة التقنية الأساسية
insert into public.tenant_apps (tenant_id, app_key, enabled)
  select t.id, c.app_key, true from public.tenants t cross join public.app_catalog c
  where t.slug = 'ibrahim-saud' on conflict (tenant_id, app_key) do nothing;
insert into public.tenant_apps (tenant_id, app_key, enabled)
  select t.id, c.app_key, true from public.tenants t cross join public.app_catalog c
  where t.slug = 'tech-company' and c.is_core = true on conflict (tenant_id, app_key) do nothing;

-- تحقّق
select
  (select count(*) from public.app_catalog) as apps,
  (select count(*) from public.tenant_apps where tenant_id=(select id from public.tenants where slug='ibrahim-saud')) as ibrahim_apps,
  (select count(*) from public.tenant_apps where tenant_id=(select id from public.tenants where slug='tech-company')) as tech_apps;
