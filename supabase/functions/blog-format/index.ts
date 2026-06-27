// ╔══════════════════════════════════════════════════════════════╗
// ║  blog-format — Supabase Edge Function                          ║
// ║  الهدف الوحيد: تنسيق وترتيب مقال إبراهيم (عناوين / فقرات /     ║
// ║  قوائم) دون أي تغيير في كلماته أو معناه. يُعيد HTML + عنوان    ║
// ║  مقترح + مقتطف قصير.                                            ║
// ║  يستخدم Groq (نفس مفتاح GROQ_API_KEY الموجود).                 ║
// ║  انشرها بدون تحقّق JWT:  supabase functions deploy blog-format \
// ║                          --no-verify-jwt                        ║
// ╚══════════════════════════════════════════════════════════════╝

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

const SYSTEM = `أنت محرّر تنسيق عربي. مهمتك الوحيدة هي ترتيب وتنسيق نصّ الكاتب فقط — لا غير.

القواعد الصارمة:
1) لا تُغيّر كلمات الكاتب إطلاقاً: ممنوع الإضافة أو الحذف أو إعادة الصياغة أو التصحيح أو الترجمة. كل كلمة في مخرجاتك يجب أن تكون موجودة حرفياً في نص الكاتب.
2) دورك فقط: تقسيم النص إلى فقرات منطقية، واستخراج عناوين فرعية من جُمَل موجودة فعلاً في النص (لا تخترع عنواناً)، وتحويل التعدادات الموجودة إلى قوائم، وترتيب التسلسل إن لزم.
3) أعد المحتوى كـ HTML باستخدام هذه الوسوم فقط: <h2> <h3> <p> <ul> <li> <ol> <blockquote> <strong>. ممنوع أي وسم آخر، وممنوع أي خصائص (attributes) أو سكربت أو تنسيق inline.
4) "title" = عنوان رئيسي قصير مأخوذ حرفياً من كلمات الكاتب (أول جملة دالّة) — لا تخترعه.
5) "excerpt" = مقتطف ≤ 160 حرفاً منسوخ حرفياً من بداية النص.

أعد JSON فقط بالشكل: {"title": "...", "excerpt": "...", "html": "..."}`;

async function callGroq(text: string, key: string) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: "نسّق ورتّب هذا المقال دون تغيير أي كلمة:\n\n" + text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!r.ok) throw new Error("groq " + r.status + ": " + (await r.text()).slice(0, 800));
  const data = await r.json();
  const txt = data?.choices?.[0]?.message?.content;
  if (!txt) throw new Error("رد فارغ من Groq");
  return JSON.parse(txt) as { title?: string; excerpt?: string; html?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) return json({ error: "مفتاح Groq غير مضبوط (GROQ_API_KEY)." }, 500);

    const { text } = await req.json().catch(() => ({ text: "" }));
    const clean = (text || "").toString().trim();
    if (clean.length < 10) return json({ error: "النص قصير جداً." }, 400);

    const out = await callGroq(clean, key);
    if (!out.html) throw new Error("لم يُرجِع النموذج تنسيقاً.");
    return json({ title: out.title || "", excerpt: out.excerpt || "", html: out.html });
  } catch (e) {
    return json({ error: (e as Error).message || "خطأ غير متوقع" }, 500);
  }
});
