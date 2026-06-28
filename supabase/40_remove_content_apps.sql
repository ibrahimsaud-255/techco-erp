-- ============================================================
--  إزالة تطبيقات المحتوى (البودكاست) من المنصّة
--  (انتقل المحتوى إلى دومين ibrahimsaud.com)
--  حذف من الكتالوج يحذف تلقائياً تفعيلها لدى العملاء (cascade).
-- ============================================================
delete from public.app_catalog
 where app_key in ('radar','guests','blog','prompts','identity');

select
  (select count(*) from public.app_catalog) as apps,
  (select count(*) from public.tenant_apps) as tenant_apps;
