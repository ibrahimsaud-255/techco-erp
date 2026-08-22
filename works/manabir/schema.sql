-- ============================================================================
-- منابر — مخطط قاعدة البيانات (PostgreSQL / Supabase)
-- يُنفَّذ مرة واحدة عند ربط المنصة بحساب الجهة:
--   لوحة Supabase ← SQL Editor ← الصق هذا الملف ← Run
-- ============================================================================

-- ---------------------------------------------------------------- الأنواع --
do $$ begin
  create type manabir_role as enum ('admin','staff','ministry','preacher','mosque');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum
    ('draft','submitted','admin_review','ministry','approved','scheduled','done','rejected','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum ('lecture','course','workshop','halaqa','khutbah');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------- المساجد --
create table if not exists mosques (
  id            text primary key,
  name          text not null,
  district      text,
  city          text default 'الرياض',
  address       text,
  capacity      int  default 0,
  imam          text,
  supervisor    text,
  phone         text,
  women_section boolean default false,
  facilities    text[] default '{}',
  status        text default 'نشط',          -- نشط | تحت الصيانة | موقوف
  created_at    timestamptz default now()
);

-- ---------------------------------------------------- الدعاة والأئمة --
create table if not exists preachers (
  id             text primary key,
  name           text not null,
  title          text,
  specialties    text[] default '{}',
  phone          text,
  email          text,
  city           text default 'الرياض',
  license        text,                        -- رقم التصريح
  license_expiry date,
  rating         numeric(2,1) default 0,
  status         text default 'تحت المراجعة', -- معتمد | تحت المراجعة | موقوف
  bio            text,
  created_at     timestamptz default now()
);

-- ---------------------------------------------------------- المستخدمون --
-- مرتبط بـ auth.users في Supabase: العمود id هو نفسه معرّف المصادقة.
create table if not exists app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text unique not null,
  phone       text,
  role        manabir_role not null default 'preacher',
  preacher_id text references preachers(id) on delete set null,
  mosque_id   text references mosques(id)   on delete set null,
  active      boolean default true,
  last_login  timestamptz,
  created_at  timestamptz default now()
);

-- --------------------------------------------------------------- الطلبات --
create table if not exists requests (
  id           text primary key,             -- REQ-2026-0001
  preacher_id  text references preachers(id) on delete set null,
  mosque_id    text references mosques(id)   on delete restrict,
  type         activity_type not null default 'lecture',
  title        text not null,
  topic        text,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  audience     text default 'عام',
  expected     int default 0,
  actual       int,
  sessions     int default 0,
  needs        text[] default '{}',
  notes        text,
  status       request_status not null default 'submitted',
  approval_no  text unique,                  -- AP-2026-0001
  reject_reason text,
  mosque_ready boolean default false,
  report       text,
  created_by   uuid references app_users(id) on delete set null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists requests_date_idx    on requests(date);
create index if not exists requests_status_idx  on requests(status);
create index if not exists requests_mosque_idx  on requests(mosque_id);
create index if not exists requests_preacher_idx on requests(preacher_id);

-- منع حجز نفس المسجد في نفس اليوم بأوقات متداخلة (للطلبات القائمة فقط)
create or replace function check_mosque_conflict() returns trigger as $$
begin
  if new.status in ('rejected','canceled','draft') then return new; end if;
  if exists (
    select 1 from requests r
     where r.mosque_id = new.mosque_id
       and r.date      = new.date
       and r.id       <> new.id
       and r.status not in ('rejected','canceled','draft')
       and new.start_time < r.end_time
       and r.start_time  < new.end_time
  ) then
    raise exception 'المسجد محجوز في هذا الوقت';
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists requests_conflict_guard on requests;
create trigger requests_conflict_guard
  before insert or update on requests
  for each row execute function check_mosque_conflict();

-- ------------------------------------------------------------ سجل الطلب --
create table if not exists request_events (
  id         bigserial primary key,
  request_id text references requests(id) on delete cascade,
  actor      text,                            -- اسم من نفّذ الإجراء
  role       manabir_role,
  action     text not null,
  note       text,
  at         timestamptz default now()
);
create index if not exists request_events_req_idx on request_events(request_id);

-- ------------------------------------------------------------- الإشعارات --
create table if not exists notifications (
  id         bigserial primary key,
  role       manabir_role,                    -- فارغ = للجميع
  user_id    uuid references app_users(id) on delete cascade,
  text       text not null,
  ref        text,                            -- رقم الطلب المرتبط
  unread     boolean default true,
  at         timestamptz default now()
);

-- --------------------------------------------------------- روابط التقديم --
create table if not exists invites (
  token      text primary key,
  name       text,
  phone      text,
  mosque_id  text references mosques(id) on delete set null,
  note       text,
  created_by uuid references app_users(id) on delete set null,
  used       boolean default false,
  created_at timestamptz default now()
);

-- --------------------------------------------------------------- الإعدادات --
create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

insert into settings(key, value) values
  ('brand', '{"brandName":"منابر","tagline":"منصة الجمعية لتنظيم الأنشطة الدعوية في المساجد","orgName":"جمعية الدعوة والإرشاد وتوعية الجاليات بالسلي","ministryName":"وزارة الشؤون الإسلامية والدعوة والإرشاد","city":"الرياض"}'::jsonb),
  ('workflow', '{"requireMinistry":true,"autoApproveKhutbah":false,"minLeadDays":3}'::jsonb)
on conflict (key) do nothing;

-- ============================================================================
-- سياسات الحماية (Row Level Security)
-- ============================================================================
alter table mosques        enable row level security;
alter table preachers      enable row level security;
alter table app_users      enable row level security;
alter table requests       enable row level security;
alter table request_events enable row level security;
alter table notifications  enable row level security;
alter table invites        enable row level security;
alter table settings       enable row level security;

-- دالة مساعدة: دور المستخدم الحالي
create or replace function my_role() returns manabir_role as $$
  select role from app_users where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_preacher() returns text as $$
  select preacher_id from app_users where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_mosque() returns text as $$
  select mosque_id from app_users where id = auth.uid();
$$ language sql stable security definer;

-- الأدلة: قراءة للجميع المسجّلين، تعديل للإدارة
drop policy if exists mosques_read on mosques;
create policy mosques_read on mosques for select to authenticated using (true);
drop policy if exists mosques_write on mosques;
create policy mosques_write on mosques for all to authenticated
  using (my_role() in ('admin','staff')) with check (my_role() in ('admin','staff'));

drop policy if exists preachers_read on preachers;
create policy preachers_read on preachers for select to authenticated using (true);
drop policy if exists preachers_write on preachers;
create policy preachers_write on preachers for all to authenticated
  using (my_role() in ('admin','staff')) with check (my_role() in ('admin','staff'));

-- المستخدمون: كل شخص يرى نفسه، والمدير يرى الجميع
drop policy if exists users_read on app_users;
create policy users_read on app_users for select to authenticated
  using (id = auth.uid() or my_role() = 'admin');
drop policy if exists users_write on app_users;
create policy users_write on app_users for all to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- الطلبات: كل دور يرى نطاقه
drop policy if exists requests_read on requests;
create policy requests_read on requests for select to authenticated using (
  my_role() in ('admin','staff')
  or (my_role() = 'preacher' and preacher_id = my_preacher())
  or (my_role() = 'mosque'   and mosque_id  = my_mosque())
  or (my_role() = 'ministry' and status in ('ministry','approved','scheduled','done','rejected'))
);

drop policy if exists requests_insert on requests;
create policy requests_insert on requests for insert to authenticated with check (
  my_role() in ('admin','staff')
  or (my_role() = 'preacher' and preacher_id = my_preacher())
);

drop policy if exists requests_update on requests;
create policy requests_update on requests for update to authenticated using (
  my_role() in ('admin','staff','ministry')
  or (my_role() = 'preacher' and preacher_id = my_preacher() and status in ('submitted','admin_review','approved','scheduled'))
  or (my_role() = 'mosque'   and mosque_id  = my_mosque())
);

-- السجل والإشعارات
drop policy if exists events_read on request_events;
create policy events_read on request_events for select to authenticated using (true);
drop policy if exists events_insert on request_events;
create policy events_insert on request_events for insert to authenticated with check (true);

drop policy if exists notif_read on notifications;
create policy notif_read on notifications for select to authenticated
  using (user_id = auth.uid() or role = my_role() or (user_id is null and role is null));
drop policy if exists notif_write on notifications;
create policy notif_write on notifications for all to authenticated
  using (my_role() in ('admin','staff','ministry')) with check (true);

-- روابط التقديم
drop policy if exists invites_manage on invites;
create policy invites_manage on invites for all to authenticated
  using (my_role() in ('admin','staff')) with check (my_role() in ('admin','staff'));

-- الإعدادات
drop policy if exists settings_read on settings;
create policy settings_read on settings for select to authenticated using (true);
drop policy if exists settings_write on settings;
create policy settings_write on settings for all to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- ============================================================================
-- ملاحظة: التقديم العام (بدون حساب) يتم عبر Edge Function باستخدام
-- service_role، لا عبر المفتاح العام — حفاظاً على أمان الجدول.
-- ============================================================================
