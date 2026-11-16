/**
 * Outbound email through Resend's HTTP API (plain fetch, no SDK).
 * Active only when RESEND_API_KEY and MAIL_FROM are both set; otherwise nothing is sent and the
 * caller falls back to showing the administrator a link to copy.
 */
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export interface MailResult { sent: boolean; status: 'SENT' | 'NOT_CONFIGURED' | 'FAILED'; reason?: string }

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<MailResult> {
  if (!mailConfigured()) return { sent: false, status: 'NOT_CONFIGURED', reason: 'Email is not configured for this deployment (RESEND_API_KEY and MAIL_FROM).' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html, ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { sent: true, status: 'SENT' };
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { sent: false, status: 'FAILED', reason: `The email service refused the message (HTTP ${res.status})${body.message ? `: ${String(body.message).slice(0, 200)}` : ''}.` };
  } catch {
    return { sent: false, status: 'FAILED', reason: 'Could not reach the email service.' };
  }
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Invitation email. Brand colours only; no images, tracking or external assets. */
export function invitationEmail(o: { name: string; inviter: string; accessName: string; accessDescription: string; link: string; expiresHours: number }) {
  const subject = 'Your invitation to NEXCUST';
  const lines = [
    `Hello ${o.name},`,
    `${o.inviter} has invited you to NEXCUST, Fourth IT's connected records platform for police and prisons, as a ${o.accessName}.`,
    o.accessDescription,
    'Use the link below to choose your password and sign in. You choose your own password; none is sent by email. The link works once and expires in ' + o.expiresHours + ' hours.',
  ];
  const note = 'NEXCUST is a prototype that holds synthetic records only. It is not an official system of the Ghana Police Service or the Ghana Prisons Service. If you were not expecting this message, you can ignore it.';
  const text = `${lines.join('\n\n')}\n\n${o.link}\n\n${note}\n\nNEXCUST · Connected Institutions. Trusted Records. · Powered by Fourth IT`;
  const html = `<!doctype html><html><body style="margin:0;background:#FAFAF7;font-family:Arial,Helvetica,sans-serif;color:#252525">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E3E5DF;border-radius:10px">
<tr><td style="padding:28px 32px 8px;font-size:22px;font-weight:700;letter-spacing:.04em"><span style="color:#174D38">NEX</span><span style="color:#C5A34A">CUST</span></td></tr>
<tr><td style="padding:0 32px"><div style="height:2px;width:48px;background:#C5A34A"></div></td></tr>
<tr><td style="padding:20px 32px 0;font-size:15px;line-height:1.6">${lines.map((l) => `<p style="margin:0 0 14px">${esc(l)}</p>`).join('')}</td></tr>
<tr><td style="padding:6px 32px 24px"><a href="${esc(o.link)}" style="display:inline-block;background:#174D38;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:6px">Accept invitation</a></td></tr>
<tr><td style="padding:0 32px 24px;font-size:12px;line-height:1.5;color:#5B5F57">If the button does not work, copy this address into your browser:<br><span style="word-break:break-all">${esc(o.link)}</span></td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid #E3E5DF;font-size:12px;line-height:1.5;color:#5B5F57">${esc(note)}<br><br>NEXCUST · Connected Institutions. Trusted Records. · Powered by Fourth IT</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
