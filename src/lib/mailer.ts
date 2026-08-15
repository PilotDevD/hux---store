import "server-only";

/**
 * Sends an email via Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without a key it's a no-op (returns skipped) so the app works in demos.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  const from = process.env.RESEND_FROM || "HUX <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "erro" };
  }
}

export function backInStockEmail(productName: string, url: string): { subject: string; html: string } {
  return {
    subject: `${productName} voltou ao estoque! · HUX`,
    html: `<div style="font-family:Arial,sans-serif;background:#14161A;color:#F4F5F7;padding:32px;border-radius:12px">
      <div style="font-size:28px;font-weight:800">HU<span style="color:#C6FF00">X</span></div>
      <h1 style="font-size:22px;margin:24px 0 8px">Voltou! 🎉</h1>
      <p style="color:#C3C8D1">O produto <strong>${productName}</strong> que você queria está disponível de novo. Corre que pode esgotar rápido.</p>
      <a href="${url}" style="display:inline-block;margin-top:16px;background:#C6FF00;color:#0E1013;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">Ver produto</a>
      <p style="color:#5B616C;font-size:12px;margin-top:24px">HUX · Performance · Street · Run</p>
    </div>`,
  };
}
