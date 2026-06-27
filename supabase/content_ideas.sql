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
