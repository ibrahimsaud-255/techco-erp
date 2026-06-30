-- ============================================================
--  العملاء المحتملون (Leads) + بذرة العرض التجريبي + توفير تجربة تلقائي
--  idempotent
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text, company text, email text, phone text, needs text,
  source text default 'trial', status text default 'new',
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to anon, authenticated with check (true);
drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select to authenticated using (public.is_platform_admin());
drop policy if exists leads_admin on public.leads;
create policy leads_admin on public.leads for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create table if not exists public.demo_seed (
  id int primary key default 1, data jsonb not null,
  constraint demo_seed_singleton check (id=1)
);
insert into public.demo_seed(id,data) values (1, $json${"settings": {"brand": "شركة الواحة للتجارة", "owner": "مدير التجربة", "salesperson": "مدير التجربة", "vat": {"enabled": true, "rate": 15, "sellerName": "شركة الواحة للتجارة", "number": "", "address": "الرياض، السعودية", "cr": ""}}, "products": [{"id": "p1", "name": "باقة تأسيس متجر إلكتروني", "price": 4500, "unit": "باقة", "desc": "متجر متكامل + ربط دفع + تدريب"}, {"id": "p2", "name": "تصميم هوية بصرية", "price": 2500, "unit": "", "desc": "شعار + دليل هوية + قوالب"}, {"id": "p3", "name": "إدارة حسابات التواصل (شهري)", "price": 1800, "unit": "شهر", "desc": ""}, {"id": "p4", "name": "استشارة تقنية", "price": 350, "unit": "ساعة", "desc": ""}, {"id": "p5", "name": "صيانة ودعم سنوي", "price": 1200, "unit": "سنة", "desc": ""}], "contacts": [{"id": "c1", "name": "نورة العتيبي", "type": "عميل", "phone": "0551234567", "email": "noura@diya.sa", "company": "مؤسسة ضياء", "vat": "", "address": "", "city": "الرياض", "website": "", "logo": "", "notes": ""}, {"id": "c2", "name": "خالد الزهراني", "type": "عميل", "phone": "0537654321", "email": "khalid@rfof.sa", "company": "متجر رفوف", "vat": "", "address": "", "city": "جدة", "website": "", "logo": "", "notes": ""}, {"id": "c3", "name": "سارة القحطاني", "type": "عميل", "phone": "0569988776", "email": "sara@lamsa.sa", "company": "عيادة لمسة", "vat": "", "address": "", "city": "الدمام", "website": "", "logo": "", "notes": ""}, {"id": "c4", "name": "عبدالله الشمري", "type": "عميل", "phone": "0501122334", "email": "a@nakha.sa", "company": "مطعم نكهة", "vat": "", "address": "", "city": "الرياض", "website": "", "logo": "", "notes": ""}, {"id": "c5", "name": "شركة بناء الحديثة", "type": "عميل", "phone": "0590011223", "email": "info@bina.sa", "company": "بناء الحديثة", "vat": "", "address": "", "city": "الرياض", "website": "", "logo": "", "notes": ""}], "crm": [{"id": "k1", "title": "متابعة عرض سعر متجر ضياء", "priority": "high", "due": "2026-07-03", "stageKey": "doing", "notes": "", "clientName": "مؤسسة ضياء", "value": 4500, "contactId": "c1", "date": "2026-06-28"}, {"id": "k2", "title": "تجهيز هوية متجر رفوف", "priority": "med", "due": "", "stageKey": "todo", "notes": "", "clientName": "متجر رفوف", "value": 2500, "contactId": "c2", "date": "2026-06-27"}, {"id": "k3", "title": "تسليم لوحة تحكم عيادة لمسة", "priority": "none", "due": "", "stageKey": "done", "notes": "", "clientName": "عيادة لمسة", "value": 0, "contactId": "c3", "date": "2026-06-20"}, {"id": "k4", "title": "مكالمة تعريفية مع مطعم نكهة", "priority": "low", "due": "2026-07-01", "stageKey": "todo", "notes": "", "clientName": "مطعم نكهة", "value": 0, "contactId": "c4", "date": "2026-06-29"}], "projects": [{"id": "pr1", "title": "متجر إلكتروني — ضياء", "contactId": "c1", "client": "مؤسسة ضياء", "podcast": "", "stageKey": "s2", "emoji": "shopping-bag", "tasks": [{"id": "t1", "title": "تحليل المتطلبات", "stageKey": "done", "done": true, "assignee": "", "blocks": []}, {"id": "t2", "title": "تصميم الواجهات", "stageKey": "doing", "done": false, "assignee": "", "blocks": []}, {"id": "t3", "title": "الربط والدفع", "stageKey": "todo", "done": false, "assignee": "", "blocks": []}], "taskStages": [{"key": "todo", "label": "قيد الانتظار"}, {"key": "doing", "label": "قيد التنفيذ"}, {"key": "review", "label": "مراجعة"}, {"key": "done", "label": "منجز"}]}, {"id": "pr2", "title": "هوية بصرية — رفوف", "contactId": "c2", "client": "متجر رفوف", "podcast": "", "stageKey": "s3", "emoji": "palette", "tasks": [{"id": "t4", "title": "تصميم الشعار", "stageKey": "review", "done": false, "assignee": "", "blocks": []}, {"id": "t5", "title": "دليل الهوية", "stageKey": "todo", "done": false, "assignee": "", "blocks": []}], "taskStages": [{"key": "todo", "label": "قيد الانتظار"}, {"key": "doing", "label": "قيد التنفيذ"}, {"key": "review", "label": "مراجعة"}, {"key": "done", "label": "منجز"}]}], "invoices": [{"id": "i1", "number": 1001, "client": "مؤسسة ضياء", "contactId": "c1", "clientVat": "", "date": "2026-06-10", "items": [{"desc": "باقة تأسيس متجر إلكتروني", "qty": 1, "price": 4500, "discount": 0}], "discType": "none", "discVal": 0, "notes": "", "status": "paid", "vat": true, "vatRate": 15, "paidDate": "2026-06-12"}, {"id": "i2", "number": 1002, "client": "عيادة لمسة", "contactId": "c3", "clientVat": "", "date": "2026-06-18", "items": [{"desc": "تصميم هوية بصرية", "qty": 1, "price": 2500, "discount": 10}], "discType": "none", "discVal": 0, "notes": "", "status": "paid", "vat": true, "vatRate": 15, "paidDate": "2026-06-20"}, {"id": "i3", "number": 1003, "client": "متجر رفوف", "contactId": "c2", "clientVat": "", "date": "2026-06-22", "items": [{"desc": "إدارة حسابات التواصل (شهري)", "qty": 3, "price": 1800, "discount": 0}], "discType": "none", "discVal": 0, "notes": "", "status": "unpaid", "vat": true, "vatRate": 15, "paidDate": ""}, {"id": "i4", "number": 1004, "client": "مطعم نكهة", "contactId": "c4", "clientVat": "", "date": "2026-06-25", "items": [{"desc": "استشارة تقنية", "qty": 2, "price": 350, "discount": 0}, {"desc": "صيانة ودعم سنوي", "qty": 1, "price": 1200, "discount": 0}], "discType": "none", "discVal": 0, "notes": "", "status": "unpaid", "vat": true, "vatRate": 15, "paidDate": ""}], "sales": [{"id": "s1", "number": 1001, "client": "مطعم نكهة", "contactId": "c4", "clientVat": "", "date": "2026-06-26", "items": [{"desc": "باقة تأسيس متجر إلكتروني", "qty": 1, "price": 4500, "discount": 5}], "discType": "none", "discVal": 0, "notes": "عرض سعر مبدئي", "status": "unpaid"}], "appointments": [{"id": "a1", "title": "اجتماع تسليم متجر ضياء", "contact": "مؤسسة ضياء", "contactId": "c1", "datetime": "2026-07-05T11:00", "duration": 60, "status": "scheduled", "notes": ""}, {"id": "a2", "title": "مكالمة مع متجر رفوف", "contact": "متجر رفوف", "contactId": "c2", "datetime": "2026-07-02T14:00", "duration": 30, "status": "scheduled", "notes": ""}, {"id": "a3", "title": "ورشة هوية بصرية", "contact": "عيادة لمسة", "contactId": "c3", "datetime": "2026-07-08T10:00", "duration": 90, "status": "scheduled", "notes": ""}], "subscriptions": [{"id": "e1", "name": "استضافة وخوادم", "usd": 0, "sar": 300, "cycle": "monthly", "date": "", "url": "", "note": "استضافة المتاجر والأنظمة", "active": true}, {"id": "e2", "name": "أدوات تصميم", "usd": 0, "sar": 120, "cycle": "monthly", "date": "", "url": "", "note": "", "active": true}, {"id": "e3", "name": "بريد احترافي", "usd": 0, "sar": 45, "cycle": "monthly", "date": "", "url": "", "note": "", "active": true}], "counters": {"sale": 1001, "invoice": 1004, "credit": 1000}}$json$::jsonb)
on conflict (id) do update set data=excluded.data;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $fn$
declare v_tenant uuid; v_founder boolean;
begin
  v_founder := lower(new.email) in ('ibrahimsaud25@gmail.com','turky305yt@gmail.com');
  if v_founder then
    insert into public.memberships(user_id, tenant_id, role)
      select new.id, t.id, 'platform_admin' from public.tenants t
    on conflict (user_id, tenant_id) do nothing;
  end if;
  insert into public.memberships(user_id, tenant_id, role, allowed_apps)
    select new.id, i.tenant_id, i.role, i.allowed_apps
    from public.invitations i where lower(i.email)=lower(new.email)
  on conflict (user_id, tenant_id) do nothing;
  delete from public.invitations where lower(email)=lower(new.email);
  -- تجربة تلقائية لمن ليس شريكاً ولا مدعوّاً
  if not v_founder and not exists(select 1 from public.memberships where user_id=new.id) then
    insert into public.tenants(slug,name,plan)
      values('trial-'||substr(md5(new.id::text),1,10),'تجربة — '||split_part(new.email,'@',1),'trial')
      returning id into v_tenant;
    insert into public.memberships(user_id,tenant_id,role) values(new.id,v_tenant,'owner');
    insert into public.tenant_apps(tenant_id,app_key,enabled)
      select v_tenant,app_key,true from public.app_catalog where is_core
    on conflict (tenant_id,app_key) do nothing;
    insert into public.app_state(tenant_id,owner,data)
      select v_tenant,new.id,coalesce((select data from public.demo_seed where id=1),'{}'::jsonb);
  end if;
  return new;
end $fn$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

select (select count(*) from public.demo_seed) as seed, (select count(*) from public.leads) as leads;
