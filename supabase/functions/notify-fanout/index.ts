// Garix Edge Function: notify-fanout
// Called by the trg_notifications_fanout database trigger (pg_net) for every
// notifications INSERT. Sends email (Resend) and/or SMS (Twilio) according to
// the recipient's notification_preferences, then stamps sent_at and records
// per-channel outcomes in notifications.data.fanout for auditability.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EMAIL_FROM = Deno.env.get('FANOUT_EMAIL_FROM') ?? 'Garix <onboarding@resend.dev>';

async function sendEmail(to: string, subject: string, text: string): Promise<string> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return 'skipped:no-key';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text }),
  });
  if (res.ok) return 'sent';
  return `error:${res.status}:${(await res.text()).slice(0, 200)}`;
}

async function sendSms(to: string, body: string): Promise<string> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!sid || !token || !from) return 'skipped:no-key';
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (res.ok) return 'sent';
  return `error:${res.status}:${(await res.text()).slice(0, 200)}`;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-fanout-secret') !== Deno.env.get('NOTIFY_FANOUT_SECRET')) {
    return json({ error: 'FORBIDDEN' }, 403);
  }

  const { notification_id } = await req.json().catch(() => ({}));
  if (!notification_id) return json({ error: 'MISSING_NOTIFICATION_ID' }, 400);

  const { data: n } = await admin
    .from('notifications')
    .select('*, user_profiles!notifications_user_id_fkey(email, mobile_number, full_name)')
    .eq('id', notification_id)
    .single();
  if (!n) return json({ error: 'NOT_FOUND' }, 404);
  if (n.sent_at) return json({ skipped: 'already-processed' });

  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', n.user_id)
    .maybeSingle();

  const profile = n.user_profiles as { email: string; mobile_number: string | null; full_name: string } | null;
  const text = `${n.body ?? n.title}\n\nOpen Garix to view: ${Deno.env.get('APP_URL') ?? 'https://garix.ie'}/dashboard`;

  const fanout: Record<string, string> = {};
  fanout.email =
    prefs?.email_enabled && profile?.email
      ? await sendEmail(profile.email, `Garix — ${n.title}`, text)
      : 'skipped:prefs';
  fanout.sms =
    prefs?.sms_enabled && profile?.mobile_number
      ? await sendSms(profile.mobile_number, `Garix: ${n.title}`)
      : 'skipped:prefs';

  await admin
    .from('notifications')
    .update({
      sent_at: new Date().toISOString(),
      data: { ...(n.data as Record<string, unknown>), fanout },
    })
    .eq('id', notification_id);

  return json({ ok: true, fanout });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
