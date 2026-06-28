-- ============================================================
--  المرحلة ١أ — طبقة تعدّد العملاء (Multi-tenant)
--  إضافية وغير كاسرة: لا تلمس جداول البيانات الحالية ولا سياساتها.
--  آمنة لإعادة التشغيل (idempotent).
-- ============================================================

-- ── 1) الجداول ──────────────────────────────────────────────
create table if not exists public.tenants (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  branding   jsonb not null default '{}'::jsonb,   -- شعار/ألوان/اسم العرض
  domain     text,
  plan       text not null default 'internal',     -- internal | client | trial
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  role       text not null default 'member',        -- platform_admin | tenant_admin | member
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id)
);

create table if not exists public.app_catalog (
  app_key     text primary key,
  name        text not null,
  description text default '',
  category    text default '',                      -- core | content | custom
  is_core     boolean not null default false,
  version     text not null default '1.0.0',
  created_at  timestamptz not null default now()
);

create table if not exists public.tenant_apps (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  app_key   text not null references public.app_catalog(app_key) on delete cascade,
  enabled   boolean not null default true,
  settings  jsonb not null default '{}'::jsonb,
  version   text,
  unique (tenant_id, app_key)
);

-- ── 2) دوال مساعدة (SECURITY DEFINER لتفادي تكرار RLS) ───────
create or replace function public.is_platform_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.memberships m
                 where m.user_id = auth.uid() and m.role = 'platform_admin');
$$;

create or replace function public.is_member(p_tenant uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.memberships m
                 where m.user_id = auth.uid() and m.tenant_id = p_tenant);
$$;

-- قائمة عملاء المستخدم الحالي (للاستخدام من الواجهة)
create or replace function public.my_tenants()
returns table(tenant_id uuid, slug text, name text, role text, branding jsonb)
language sql security definer set search_path = public stable as $$
  select t.id, t.slug, t.name, m.role, t.branding
  from public.memberships m join public.tenants t on t.id = m.tenant_id
  where m.user_id = auth.uid()
  order by t.name;
$$;

-- ── 3) RLS ──────────────────────────────────────────────────
alter table public.tenants     enable row level security;
alter table public.memberships enable row level security;
alter table public.app_catalog enable row level security;
alter table public.tenant_apps enable row level security;

-- tenants: العضو يقرأ عملاءه، مدير المنصّة يقرأ/يكتب الكل
drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants
  for select to authenticated
  using (public.is_platform_admin() or public.is_member(id));
drop policy if exists tenants_admin on public.tenants;
create policy tenants_admin on public.tenants
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- memberships: المستخدم يرى صفوفه، مدير المنصّة يدير الكل
drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists memberships_admin on public.memberships;
create policy memberships_admin on public.memberships
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- app_catalog: يقرؤه كل مصادَق، يديره مدير المنصّة
drop policy if exists app_catalog_read on public.app_catalog;
create policy app_catalog_read on public.app_catalog
  for select to authenticated using (true);
drop policy if exists app_catalog_admin on public.app_catalog;
create policy app_catalog_admin on public.app_catalog
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- tenant_apps: العضو يقرأ تطبيقات عملائه، مدير المنصّة يدير الكل
drop policy if exists tenant_apps_read on public.tenant_apps;
create policy tenant_apps_read on public.tenant_apps
  for select to authenticated
  using (public.is_platform_admin() or public.is_member(tenant_id));
drop policy if exists tenant_apps_admin on public.tenant_apps;
create policy tenant_apps_admin on public.tenant_apps
  for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── 4) ترقية الشركاء تلقائياً لمدير منصّة عند التسجيل ─────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) in ('ibrahimsaud25@gmail.com','turky305yt@gmail.com') then
    insert into public.memberships(user_id, tenant_id, role)
      select new.id, t.id, 'platform_admin' from public.tenants t
    on conflict (user_id, tenant_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 5) التعبئة: العملاء ─────────────────────────────────────
insert into public.tenants (slug, name, plan) values
  ('ibrahim-saud', 'إبراهيم سعود',  'internal'),
  ('tech-company', 'الشركة التقنية', 'internal')
on conflict (slug) do nothing;

-- ── 6) التعبئة: كتالوج التطبيقات ────────────────────────────
insert into public.app_catalog (app_key, name, description, category, is_core) values
  ('home',        'الرئيسية',        'لوحة البداية والتركيز',            'core',    true),
  ('desktop',     'المكتب',          'سطح التطبيقات (Launchpad)',         'core',    true),
  ('sales',       'المبيعات',        'تسجيل المبيعات والإيرادات',         'core',    true),
  ('invoicing',   'الفوترة',         'إنشاء وإدارة الفواتير',             'core',    true),
  ('crm',         'المهام',          'إدارة المهام والعملاء المحتملين',   'core',    true),
  ('appointments','المواعيد',        'حجز وإدارة المواعيد',               'core',    true),
  ('calendar',    'التقويم',         'تقويم موحّد للمواعيد والمهام',       'core',    true),
  ('projects',    'المشروع',         'غرفة الإنتاج والتسليمات والتعديلات', 'core',    true),
  ('settings',    'الإعدادات',       'إعدادات الحساب والهوية',            'core',    true),
  ('radar',       'رادار المحتوى',   'رصد أفكار المحتوى والأخبار',        'content', false),
  ('guests',      'ضيوف سَعي',       'تسجيلات ضيوف البودكاست',            'content', false),
  ('blog',        'المدونة',         'كتابة ونشر المقالات',              'content', false),
  ('prompts',     'مكتبة البرومتات', 'حفظ ونسخ برومتات الذكاء',           'content', false),
  ('identity',    'الهوية البصرية',  'دليل الهوية والألوان',             'content', false)
on conflict (app_key) do nothing;

-- ── 7) التعبئة: تفعيل التطبيقات لكل عميل ─────────────────────
-- إبراهيم سعود: كل التطبيقات
insert into public.tenant_apps (tenant_id, app_key, enabled)
  select t.id, c.app_key, true
  from public.tenants t cross join public.app_catalog c
  where t.slug = 'ibrahim-saud'
on conflict (tenant_id, app_key) do nothing;

-- الشركة التقنية: التطبيقات الأساسية فقط
insert into public.tenant_apps (tenant_id, app_key, enabled)
  select t.id, c.app_key, true
  from public.tenants t cross join public.app_catalog c
  where t.slug = 'tech-company' and c.is_core = true
on conflict (tenant_id, app_key) do nothing;

-- ── تحقّق ───────────────────────────────────────────────────
select
  (select count(*) from public.tenants)     as tenants,
  (select count(*) from public.app_catalog) as apps,
  (select count(*) from public.tenant_apps) as tenant_apps;
