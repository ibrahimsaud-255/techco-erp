# إعداد تخزين صور المهام (مرة واحدة)

محرّر المهام (أسلوب نوشن) يرفع الصور إلى **Supabase Storage**. سوِّ هذا مرة وحدة:

## ١) أنشئ الـ Bucket

Supabase Dashboard → **Storage** → **New bucket**
- الاسم بالضبط: `task-images`
- **Public bucket: مفعّل** (عشان تظهر الصور في المتصفح)
- اضغط **Create bucket**

## ٢) أضف صلاحية الرفع

Supabase Dashboard → **SQL Editor** → الصق ونفّذ:

```sql
-- السماح للمستخدم المسجّل برفع/تعديل/حذف صور المهام
create policy "task-images insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-images');
create policy "task-images update" on storage.objects
  for update to authenticated using (bucket_id = 'task-images');
create policy "task-images delete" on storage.objects
  for delete to authenticated using (bucket_id = 'task-images');
```

(القراءة عامة تلقائياً لأن الـ bucket عام.)

## خلاص

افتح أي مهمة → اكتب `/` واختر «صورة»، أو اضغط 🖼️ في الشريط → ارفع الصورة وتنحفظ في المهمة.
لو ظهر خطأ رفع، معناه الـ bucket مو منشأ أو الاسم مختلف عن `task-images`.
