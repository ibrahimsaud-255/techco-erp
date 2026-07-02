-- ============================================================
--  لوحة التحكم المركزية v2 — 2 يوليو 2026 (idempotent)
--  1) سجل التدقيق (Audit log) لكل إجراءات الإدارة
--  2) إصلاح تسلسل الأدوار: مدير العميل لا يحذف/يغيّر المالك
--  3) حذف عميل بالكامل (لمدير المنصّة) + زرع بيانات تجريبية
-- ============================================================

-- ── 1) سجل التدقيق ──────────────────────────────────────────
create table if not exists public.admin_audit (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid,
  actor_email text,
  action      text not null,          -- app_toggle | tenant_create | tenant_delete | member_invite | member_role | member_remove | seed_demo ...
  tenant_id   uuid,
  tenant_name text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
drop policy if exists admin_audit_read on public.admin_audit;
create policy admin_audit_read on public.admin_audit
  for select to authenticated using (public.is_platform_admin());
-- لا سياسة كتابة مباشرة: الإدخال حصراً عبر الدالة أدناه (تلتقط الفاعل من الجلسة)
revoke all on public.admin_audit from anon;

create or replace function public.log_admin(p_action text, p_tenant uuid, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_email text; v_tname text;
begin
  if not public.is_platform_admin() then return; end if;
  select email into v_email from auth.users where id = auth.uid();
  if p_tenant is not null then
    select name into v_tname from public.tenants where id = p_tenant;
  end if;
  insert into public.admin_audit(actor, actor_email, action, tenant_id, tenant_name, details)
    values (auth.uid(), v_email, p_action, p_tenant, v_tname, coalesce(p_details,'{}'::jsonb));
end $$;
grant execute on function public.log_admin(text, uuid, jsonb) to authenticated;

-- ── 2) تسلسل الأدوار: حماية «المالك» من مدراء العميل ─────────
create or replace function public.set_member_role(p_tenant uuid, p_user uuid, p_role text)
returns json language plpgsql security definer set search_path=public as $$
declare r text := lower(coalesce(p_role,'member')); cur text;
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then
    return json_build_object('error','unauthorized'); end if;
  if r not in ('owner','admin','member','viewer') then return json_build_object('error','role'); end if;
  select role into cur from public.memberships where tenant_id=p_tenant and user_id=p_user;
  if cur is null then return json_build_object('error','not_found'); end if;
  -- تعيين «مالك» أو تعديل دور المالك الحالي: لمدير المنصّة فقط
  if (r='owner' or cur='owner') and not public.is_platform_admin() then
    return json_build_object('error','owner_protected'); end if;
  update public.memberships set role=r
    where tenant_id=p_tenant and user_id=p_user and role<>'platform_admin';
  return json_build_object('ok',true);
end $$;

create or replace function public.remove_member(p_tenant uuid, p_user uuid)
returns json language plpgsql security definer set search_path=public as $$
declare cur text;
begin
  if not (public.is_platform_admin() or public.is_tenant_admin(p_tenant)) then
    return json_build_object('error','unauthorized'); end if;
  select role into cur from public.memberships where tenant_id=p_tenant and user_id=p_user;
  if cur is null then return json_build_object('error','not_found'); end if;
  -- حذف المالك: لمدير المنصّة فقط
  if cur='owner' and not public.is_platform_admin() then
    return json_build_object('error','owner_protected'); end if;
  delete from public.memberships
    where tenant_id=p_tenant and user_id=p_user and role<>'platform_admin';
  return json_build_object('ok',true);
end $$;

-- ── 3) حذف عميل بالكامل (مدير المنصّة فقط) ───────────────────
-- يحذف بيانات العميل من كل الجداول ثم العميل نفسه (memberships
-- و tenant_apps تُحذف تلقائياً عبر cascade). حسابات المستخدمين
-- في auth لا تُمسّ — قد يكونون أعضاء عند عملاء آخرين.
create or replace function public.admin_delete_tenant(p_tenant uuid)
returns json language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
  if not public.is_platform_admin() then return json_build_object('error','unauthorized'); end if;
  select name into v_name from public.tenants where id=p_tenant;
  if v_name is null then return json_build_object('error','not_found'); end if;
  delete from public.room_comments  where tenant_id=p_tenant;
  delete from public.revisions      where tenant_id=p_tenant;
  delete from public.tasks          where tenant_id=p_tenant;
  delete from public.project_rooms  where tenant_id=p_tenant;
  delete from public.freelancers    where tenant_id=p_tenant;
  delete from public.app_state      where tenant_id=p_tenant;
  delete from public.invitations    where tenant_id=p_tenant;
  delete from public.tenants        where id=p_tenant;
  perform public.log_admin('tenant_delete', null, json_build_object('name',v_name,'id',p_tenant)::jsonb);
  return json_build_object('ok',true,'name',v_name);
end $$;
grant execute on function public.admin_delete_tenant(uuid) to authenticated;

-- ── 4) زرع بيانات تجريبية لعميل (مدير المنصّة فقط) ───────────
create or replace function public.admin_seed_demo(p_tenant uuid)
returns json language plpgsql security definer set search_path=public as $$
declare v_data jsonb;
begin
  if not public.is_platform_admin() then return json_build_object('error','unauthorized'); end if;
  select data into v_data from public.demo_seed where id=1;
  if v_data is null then return json_build_object('error','no_seed'); end if;
  if exists(select 1 from public.app_state where tenant_id=p_tenant) then
    update public.app_state set data=v_data, updated_at=now() where tenant_id=p_tenant;
  else
    insert into public.app_state(tenant_id, owner, data) values (p_tenant, auth.uid(), v_data);
  end if;
  perform public.log_admin('seed_demo', p_tenant, '{}'::jsonb);
  return json_build_object('ok',true);
end $$;
grant execute on function public.admin_seed_demo(uuid) to authenticated;

select 'admin v2 ready' as status;
