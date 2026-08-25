// Garix Edge Function: submit-quote
// Client-side quote INSERTs are blocked by RLS on purpose:
// submitting a quote must atomically (a) spend credits and (b) create the
// quote, or do neither. This function runs with the service role.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Browsers preflight cross-origin functions.invoke calls — without these
// headers the quote form fails in every real browser (Node clients never hit it).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const auth = req.headers.get('Authorization') ?? '';
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const asUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'UNAUTHENTICATED' }, 401);

  const body = await req.json();
  const { requestId, garageId, labourCost, partsCost, isPriority,
          estimatedDurationHours, warrantyInfo, notes, items } = body;

  // 1. Caller must own the garage, and garage must be active
  const { data: garage } = await admin
    .from('garages').select('id, status, owner_id')
    .eq('id', garageId).single();
  if (!garage || garage.owner_id !== user.id) return json({ error: 'FORBIDDEN' }, 403);
  if (garage.status !== 'active') return json({ error: 'GARAGE_NOT_ACTIVE' }, 403);

  // 2. Request must be open
  const { data: request } = await admin
    .from('service_requests').select('id, status')
    .eq('id', requestId).single();
  if (!request || !['open', 'quoted'].includes(request.status)) {
    return json({ error: 'REQUEST_NOT_OPEN' }, 409);
  }

  // 3-4. Plan-aware charge: Pro → free/unlimited; Basic → daily cap + credits.
  // charge_for_quote centralises the plan rules and returns the credits taken
  // (0 for Pro). When plans are disabled it behaves like the old credit flow.
  const { data: charged, error: spendErr } = await admin.rpc('charge_for_quote', {
    p_garage_id: garageId,
    p_is_priority: !!isPriority,
    p_request_id: requestId,
  });
  if (spendErr) {
    const code = spendErr.message.includes('INSUFFICIENT_CREDITS')
      ? 402
      : spendErr.message.includes('QUOTE_DAILY_LIMIT')
        ? 429
        : 500;
    return json({ error: spendErr.message }, code);
  }
  const cost: number = charged ?? 0;

  // 5. Create the quote (+ items); refund credits if it fails
  const { data: quote, error: quoteErr } = await admin
    .from('quotes')
    .insert({
      request_id: requestId, garage_id: garageId,
      labour_cost: labourCost, parts_cost: partsCost,
      is_priority: !!isPriority, credits_charged: cost,
      estimated_duration_hours: estimatedDurationHours,
      warranty_info: warrantyInfo, notes,
    })
    .select().single();

  if (quoteErr) {
    if (cost > 0) {
      await admin.rpc('add_credits', {
        p_garage_id: garageId, p_amount: cost, p_type: 'refund',
        p_description: `Refund: quote creation failed on ${requestId}`,
      });
    }
    return json({ error: quoteErr.message }, 409);
  }

  if (Array.isArray(items) && items.length) {
    await admin.from('quote_items').insert(
      items.map((i: Record<string, unknown>) => ({ ...i, quote_id: quote.id })),
    );
  }

  await admin.from('service_requests')
    .update({ status: 'quoted' }).eq('id', requestId).eq('status', 'open');

  // 6. Notify the customer (in-app row; email/SMS fan-out picks this up)
  const { data: sr } = await admin
    .from('service_requests').select('customer_id, title').eq('id', requestId).single();
  if (sr) {
    await admin.from('notifications').insert({
      user_id: sr.customer_id, type: 'new_quote',
      title: 'New quote received',
      body: `A garage has quoted on “${sr.title}”.`,
      data: { request_id: requestId, quote_id: quote.id },
    });
  }

  return json({ quote });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
