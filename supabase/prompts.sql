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
