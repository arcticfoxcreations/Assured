// src/lib/server/notify.ts — server only. Real delivery channels.
//  • Email via Resend  (RESEND_API_KEY + ALERT_FROM_EMAIL)
//  • SMS via Twilio    (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID)
// A channel counts as "configured" only when every variable it needs is set.
// Nothing here ever reports success unless the provider accepted the message.

export type Channel = "email" | "sms";
export interface Target { name: string; email?: string; phone?: string }
export interface SendResult { sent: Channel[]; failed: Channel[] }
export interface Transport {
  email(to: string, subject: string, text: string): Promise<void>;
  sms(to: string, text: string): Promise<void>;
}

let override: Transport | null = null;
/** Test hook. */
export function setTransport(t: Transport | null) { override = t; }

export function channels(): { email: boolean; sms: boolean } {
  if (override) return { email: true, sms: true };
  const e = process.env;
  return {
    email: Boolean(e.RESEND_API_KEY && e.ALERT_FROM_EMAIL),
    sms: Boolean(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && (e.TWILIO_FROM || e.TWILIO_MESSAGING_SERVICE_SID)),
  };
}

/** Digits with a country code; a bare 10-digit Indian mobile becomes +91… */
export function normPhone(input: string): string | null {
  const raw = input.trim();
  const d = raw.replace(/[^0-9]/g, "");
  if (d.length === 10) return `+91${d}`;
  if (d.length >= 11 && d.length <= 15 && (raw.startsWith("+") || raw.startsWith("00") || d.startsWith("91"))) return `+${d.replace(/^00/, "")}`;
  return null;
}

const real: Transport = {
  async email(to, subject, text) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.ALERT_FROM_EMAIL, to: [to], subject, text }),
    });
    if (!r.ok) throw new Error(`resend_${r.status}`);
  },
  async sms(to, text) {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const body = new URLSearchParams({ To: to, Body: text });
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) body.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
    else body.set("From", process.env.TWILIO_FROM!);
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!r.ok) throw new Error(`twilio_${r.status}`);
  },
};

/** Which of the target's channels can actually be used right now. */
export function usable(t: Target | null | undefined): Channel[] {
  if (!t) return [];
  const c = channels();
  const out: Channel[] = [];
  if (t.email && c.email) out.push("email");
  if (t.phone && c.sms) out.push("sms");
  return out;
}

export async function send(t: Target, subject: string, text: string): Promise<SendResult> {
  const tr = override ?? real;
  const res: SendResult = { sent: [], failed: [] };
  for (const ch of usable(t)) {
    try {
      if (ch === "email") await tr.email(t.email!, subject, text);
      else await tr.sms(t.phone!, text.length > 600 ? `${text.slice(0, 597)}...` : text);
      res.sent.push(ch);
    } catch {
      res.failed.push(ch);
    }
  }
  return res;
}
