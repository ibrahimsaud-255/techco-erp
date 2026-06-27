// ╔══════════════════════════════════════════════════════════════╗
// ║  room-notify — Supabase Edge Function (نظام الأعمال)            ║
// ║  يُستدعى عبر Database Webhook عند:                              ║
// ║   • INSERT في revisions      → تعديل جديد من العميل.           ║
// ║   • INSERT في room_comments  → تعليق جديد في الغرفة.           ║
// ║  فيرسل تنبيهاً لإبراهيم بالبريد (Resend) بكل التفاصيل.          ║
// ║  انشرها بـ --no-verify-jwt، واضبط WEBHOOK_SECRET في الهيدر.    ║
// ╚══════════════════════════════════════════════════════════════╝
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API = "https://api.resend.com/emails";

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

function wrap(title: string, rows: string) {
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#0a0a0b;color:#f4f4f5;padding:24px;border-radius:14px;max-width:560px;margin:auto">
    <h2 style="color:#f5a623;margin:0 0 14px">${title}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
  </div>`;
}
function row(label: string, val: string) {
  return `<tr><td style="padding:6px 10px;color:#9b9ba3;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 10px;font-weight:bold">${val}</td></tr>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("RESEND_FROM") || "إبراهيم سعود <onboarding@resend.dev>";
    const ADMIN = Deno.env.get("ADMIN_EMAIL") || "ibrahimsaud25@gmail.com";
    const SECRET = Deno.env.get("WEBHOOK_SECRET");
    if (!KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY غير مضبوط" }), { status: 500 });

    if (SECRET) {
      const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (got !== SECRET) return new Response("unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const table = body.table || "";
    const rec = (body.record || {}) as Record<string, unknown>;

    // جلب عنوان التسليم والمشروع لإثراء التنبيه
    let taskTitle = "", projectTitle = "";
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      if (rec.task_id) {
        const { data } = await admin.from("tasks").select("title,project_title").eq("id", rec.task_id).single();
        if (data) { taskTitle = String(data.title || ""); projectTitle = String(data.project_title || ""); }
      }
    } catch (_) { /* تجاهل */ }

    let subject = "🚪 تحديث في غرفة المشروع", html = "";
    if (table === "revisions") {
      const who = rec.requested_by === "client" ? "العميل" : "إبراهيم";
      const bill = rec.billable ? "⚠️ تعديل إضافي (مدفوع)" : "ضمن الباقة";
      subject = `✍️ تعديل #${esc(rec.num)} على «${esc(taskTitle || "تسليم")}»`;
      html = wrap("✍️ طلب تعديل جديد", [
        row("المشروع", esc(projectTitle || "—")),
        row("التسليم", esc(taskTitle || "—")),
        row("رقم التعديل", esc(rec.num)),
        row("من", esc(who)),
        row("التكلفة", bill),
        row("التعديل المطلوب", esc(rec.body)),
      ].join(""));
    } else if (table === "room_comments") {
      const who = rec.author === "client" ? "العميل" : (rec.author === "freelancer" ? "المنتج/الفريلانسر" : "إبراهيم");
      subject = `💬 تعليق جديد على «${esc(taskTitle || "تسليم")}»`;
      html = wrap("💬 تعليق جديد في الغرفة", [
        row("المشروع", esc(projectTitle || "—")),
        row("التسليم", esc(taskTitle || "—")),
        row("من", esc(who) + (rec.author_name ? " — " + esc(rec.author_name) : "")),
        row("التعليق", esc(rec.body)),
      ].join(""));
    } else {
      return new Response(JSON.stringify({ ok: true, skipped: table }), { headers: { "Content-Type": "application/json" } });
    }

    const results: Record<string, string> = {};
    try { await sendEmail(KEY, FROM, ADMIN, subject, html); results.admin = "ok"; }
    catch (e) { results.admin = String(e instanceof Error ? e.message : e); }
    return new Response(JSON.stringify({ ok: true, results }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), { status: 500 });
  }
});
