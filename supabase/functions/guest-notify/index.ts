// ╔══════════════════════════════════════════════════════════════╗
// ║  guest-notify — Supabase Edge Function (مشروع الضيوف)          ║
// ║  يُستدعى عبر Database Webhook عند تسجيل ضيف جديد في            ║
// ║  guest_registrations، فيرسل:                                   ║
// ║   1) تأكيد للضيف بأننا استلمنا طلبه وموعده المبدئي.            ║
// ║   2) تنبيه لإبراهيم بكل تفاصيل التسجيل.                        ║
// ║  الإرسال عبر Resend. انشرها بـ --no-verify-jwt.                ║
// ╚══════════════════════════════════════════════════════════════╝

const RESEND_API = "https://api.resend.com/emails";

// حقول النموذج بترتيب وتسميات عربية لإيميل التنبيه
const FIELDS: [string, string][] = [
  ["full_name", "الاسم الكامل"],
  ["nickname", "نناديه بـ"],
  ["email", "البريد"],
  ["phone", "الجوال/واتساب"],
  ["field", "المجال"],
  ["value", "الفائدة للمستمع"],
  ["journey", "السعي/الرحلة"],
  ["turning_point", "موقف/تحوّل"],
  ["misconception", "مفهوم يُبسّطه"],
  ["dream_question", "سؤال يتمناه"],
  ["avoid", "أشياء يتجنّبها"],
  ["website", "موقع/بودكاست"],
  ["x", "X"], ["instagram", "إنستقرام"], ["linkedin", "لينكدإن"],
  ["youtube", "يوتيوب"], ["tiktok", "تيك توك"], ["bio_links", "نبذة/روابط"],
];

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

async function sendEmail(key: string, from: string, to: string, subject: string, html: string) {
  const r = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) throw new Error("resend " + r.status + ": " + (await r.text()).slice(0, 300));
  return r.json();
}

function guestEmail(rec: Record<string, unknown>) {
  const name = esc(rec.nickname || rec.full_name || "ضيفنا الكريم");
  return `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#0a0a0b;color:#f4f4f5;padding:28px;border-radius:14px;max-width:560px;margin:auto">
    <div style="font-size:40px;text-align:center">🎙️</div>
    <h2 style="color:#f5a623;text-align:center;margin:6px 0 16px">وصلنا طلبك للمشاركة في بودكاست سَعي</h2>
    <p>أهلاً ${name}،</p>
    <p>شكراً لتسجيلك للمشاركة كضيف في <b>بودكاست سَعي</b> — استلمنا طلبك بنجاح.</p>
    <p>فريقنا بيتواصل معك قريباً لتحديد <b>موعد التصوير</b> حسب جدولك وجدول الأستديو، ومناقشة تفاصيل الحلقة. لو عندك أي استفسار، رد على هذا الإيميل.</p>
    <p style="margin-top:22px;color:#9b9ba3">نشوفك على خير 🤍<br>فريق سَعي — إبراهيم سعود</p>
  </div>`;
}

function hostEmail(rec: Record<string, unknown>) {
  const rows = FIELDS
    .filter(([k]) => rec[k] !== null && rec[k] !== undefined && String(rec[k]).trim() !== "")
    .map(([k, label]) => `<tr><td style="padding:6px 10px;color:#9b9ba3;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 10px;font-weight:bold">${esc(rec[k])}</td></tr>`)
    .join("");
  return `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#0a0a0b;color:#f4f4f5;padding:24px;border-radius:14px;max-width:620px;margin:auto">
    <h2 style="color:#f5a623;margin:0 0 14px">🎙️ ضيف جديد سجّل في سَعي</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
  </div>`;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_CORS = { ...CORS, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("ok", { headers: CORS });
  try {
    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("RESEND_FROM") || "سَعي <onboarding@resend.dev>";
    const ADMIN = Deno.env.get("ADMIN_EMAIL") || "ibrahimsaud25@gmail.com";
    const SECRET = Deno.env.get("WEBHOOK_SECRET");
    if (!KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY غير مضبوط" }), { status: 500, headers: JSON_CORS });

    // تحقّق بسيط من سرّ الويب هوك (إن ضُبط)
    if (SECRET) {
      const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (got !== SECRET) return new Response("unauthorized", { status: 401, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const rec = (body.record || body) as Record<string, unknown>;
    const guestTo = String(rec.email || "").trim();

    const results: Record<string, string> = {};
    // تنبيه إبراهيم (يعمل فوراً حتى بدون دومين موثّق)
    try { await sendEmail(KEY, FROM, ADMIN, `🎙️ ضيف جديد: ${esc(rec.full_name || "")}`, hostEmail(rec)); results.host = "ok"; }
    catch (e) { results.host = String(e instanceof Error ? e.message : e); }
    // تأكيد الضيف (يتطلّب دومين موثّق في Resend)
    if (guestTo) {
      try { await sendEmail(KEY, FROM, guestTo, "وصلنا طلبك للمشاركة في بودكاست سَعي 🎙️", guestEmail(rec)); results.guest = "ok"; }
      catch (e) { results.guest = String(e instanceof Error ? e.message : e); }
    }
    return new Response(JSON.stringify({ ok: true, results }), { headers: JSON_CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), { status: 500, headers: JSON_CORS });
  }
});
