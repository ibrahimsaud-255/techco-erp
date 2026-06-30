-- ============================================================
--  الصلاحيات والأدوار + إدارة المستخدمين  (idempotent)
--  الأدوار: owner | admin | member | viewer | platform_admin
-- ============================================================

alter table public.memberships add column if not exists allowed_apps jsonb;

-- جدول الدعوات (لمن لم ينشئ حساباً بعد)
create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  email        text not null,
  role         text not null default 'member',
  allowed_apps jsonb,
  invited_by   uuid,
  created_at   timestamptz not null default now(),
  unique (tenant_id, email)
);
alter table public.invitations enable row level security;

-- ── دوال مساعدة ──────────────────────────────────────────────
create or replace function public.my_role(p_tenant uuid)
returns text language sql security definer set search_path=public stable as $$
  select role from public.memberships where user_id=auth.uid() and tenant_id=p_tenant limit 1;
$$;

create or replace function public.is_tenant_admin(p_tenant uuid)
returns boolean language sql security definer set search_path=public stable as $$
  select exists(select 1 from public.memberships m
    where m.user_id=auth.uid() and m.tenant_id=p_tenant
      and m.role in ('owner','admin','platform_admin'));
$$;

create or replace function public.is_editor(p_tenant uuid)
returns boolean language sql security definer set search_path=public stable as $$
  select exists(select 1 from public.memberships m
    where m.user_id=auth.uid() and m.tenant_id=p_tenant
      and m.role in ('owner','admin','member','platform_admin'));
$$;

-- ── سياسات invitations ───────────────────────────────────────
drop policy if exists invitations_admin on public.invitations;
create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_platform_admin() or public.is_tenant_admin(tenant_id))
  with check (public.is_platform_admin() or public.is_tenant_admin(tenant_id));

-- ── سياسات memberships: مدير العميل يدير أعضاء عميله ─────────
drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships for select to authenticated
  using (user_id=auth.uid() or public.is_platform_admin() or public.is_tenant_admin(tenant_id));
drop policy if exists memberships_admin on public.memberships;
create policy memberships_admin on public.memberships for all to authenticated
  using (public.is_platform_admin() or public.is_tenant_admin(tenant_id))
  with check (public.is_platform_admin() or public.is_tenant_admin(tenant_id));

-- ── RLS: فصل القراءة (كل عضو) عن الكتابة (محرّر فقط؛ المشاهد للقراءة) ──
do $$
declare t text;
begin
  foreach t in array array['app_state','freelancers','tasks','project_rooms','revisions','room_comments']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_tenant', t);
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(tenant_id))', t||'_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_editor(tenant_id)) with check (public.is_editor(tenant_id))', t||'_write', t);
  end loop;
end $$;

-- ── ترقية الشركاء + استهلاك الدعوات عند التسجيل ──────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if lower(new.email) in ('ibrahimsaud25@gmail.com','turky305yt@gmail.com') then
    insert into public.memberships(user_id, tenant_id, role)
      select new.id, t.id, 'platform_admin' from public.tenants t
    on conflict (user_id, tenant_id) do nothing;
  end if;
  -- استهلاك أي دعوات بنفس البريد
  insert into public.memberships(user_id, tenant_id, role, allowed_apps)
    select new.id, i.tenant_id, i.role, i.allowed_apps
    from public.invitations i where lower(i.email)=lower(new.email)
  on conflict (user_id, tenant_id) do nothing;
  delete from public.invitations where lower(email)=lower(new.email);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── دوال إدارة الأعضاء (للمدراء فقط) ─────────────────────────
create or replace function public.tenant_members(p_tenant uuid)
returns table(user_id uuid, email text, role text, allowed_apps jsonb, created_at timestamptz)
language plpgsql security definer set search_path=public stable as $$
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then return; end if;
  return query
    select m.user_id, u.email::text, m.role, m.allowed_apps, m.created_at
    from public.memberships m join auth.users u on u.id=m.user_id
    where m.tenant_id=p_tenant order by m.created_at;
end $$;

create or replace function public.list_invites(p_tenant uuid)
returns table(email text, role text, created_at timestamptz)
language plpgsql security definer set search_path=public stable as $$
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then return; end if;
  return query select i.email, i.role, i.created_at from public.invitations i
    where i.tenant_id=p_tenant order by i.created_at;
end $$;

create or replace function public.invite_member(p_tenant uuid, p_email text, p_role text)
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid; r text := lower(coalesce(p_role,'member'));
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then
    return json_build_object('error','unauthorized'); end if;
  if r not in ('owner','admin','member','viewer') then r:='member'; end if;
  if coalesce(btrim(p_email),'')='' then return json_build_object('error','empty'); end if;
  select id into uid from auth.users where lower(email)=lower(btrim(p_email)) limit 1;
  if uid is not null then
    insert into public.memberships(user_id,tenant_id,role) values(uid,p_tenant,r)
    on conflict (user_id,tenant_id) do update set role=excluded.role;
    return json_build_object('ok',true,'status','added');
  else
    insert into public.invitations(tenant_id,email,role,invited_by)
      values(p_tenant,lower(btrim(p_email)),r,auth.uid())
    on conflict (tenant_id,email) do update set role=excluded.role;
    return json_build_object('ok',true,'status','invited');
  end if;
end $$;

create or replace function public.set_member_role(p_tenant uuid, p_user uuid, p_role text)
returns json language plpgsql security definer set search_path=public as $$
declare r text := lower(coalesce(p_role,'member'));
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then
    return json_build_object('error','unauthorized'); end if;
  if r not in ('owner','admin','member','viewer') then return json_build_object('error','role'); end if;
  update public.memberships set role=r where tenant_id=p_tenant and user_id=p_user and role<>'platform_admin';
  return json_build_object('ok',true);
end $$;

create or replace function public.remove_member(p_tenant uuid, p_user uuid)
returns json language plpgsql security definer set search_path=public as $$
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then
    return json_build_object('error','unauthorized'); end if;
  delete from public.memberships where tenant_id=p_tenant and user_id=p_user and role<>'platform_admin';
  return json_build_object('ok',true);
end $$;

create or replace function public.revoke_invite(p_tenant uuid, p_email text)
returns json language plpgsql security definer set search_path=public as $$
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then
    return json_build_object('error','unauthorized'); end if;
  delete from public.invitations where tenant_id=p_tenant and lower(email)=lower(p_email);
  return json_build_object('ok',true);
end $$;

grant execute on function public.my_role(uuid)                         to authenticated;
grant execute on function public.is_tenant_admin(uuid)                 to authenticated;
grant execute on function public.is_editor(uuid)                       to authenticated;
grant execute on function public.tenant_members(uuid)                  to authenticated;
grant execute on function public.list_invites(uuid)                    to authenticated;
grant execute on function public.invite_member(uuid,text,text)         to authenticated;
grant execute on function public.set_member_role(uuid,uuid,text)       to authenticated;
grant execute on function public.remove_member(uuid,uuid)              to authenticated;
grant execute on function public.revoke_invite(uuid,text)              to authenticated;

select 'roles & permissions ready' as status;
