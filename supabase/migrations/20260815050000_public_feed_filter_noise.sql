-- Hide reply-approval spam and simulated x402 from the public proof strip.
CREATE OR REPLACE VIEW public.public_feed AS
 SELECT 'act:'::text || a.id::text AS id,
    'activity'::text AS source,
    a.kind,
    h.handle,
    a.message AS title,
    NULL::text AS detail,
    a.value AS amount,
    NULL::text AS tx_hash,
    a.created_at
   FROM activity_events a
     LEFT JOIN handles h ON h.company_id = a.company_id AND h.is_public
  WHERE a.created_at > (now() - '30 days'::interval)
    AND a.message IS NOT NULL
    AND a.message !~* 'social-reply'
    AND a.message !~* 'approve.{0,40}reply'
    AND a.message !~* '^draft:'
UNION ALL
 SELECT 'x402:'::text || c.id::text AS id,
    'x402'::text AS source,
    c.slug AS kind,
    h.handle,
    'Machine API call paid — '::text || c.slug AS title,
    c.payer AS detail,
    c.amount_usdc AS amount,
    c.tx_hash,
    c.created_at
   FROM x402_calls c
     LEFT JOIN handles h ON h.company_id = c.company_id AND h.is_public
  WHERE c.status = 'settled'
    AND c.created_at > (now() - '30 days'::interval)
UNION ALL
 SELECT 'spin:'::text || w.id::text AS id,
    'wheel'::text AS source,
    w.prize_kind AS kind,
    h.handle,
    'Daily drop — '::text || w.label AS title,
    w.chain_status AS detail,
    w.amount::numeric AS amount,
    w.tx_hash,
    w.created_at
   FROM wheel_spins w
     LEFT JOIN handles h ON h.company_id = w.company_id AND h.is_public
  WHERE w.created_at > (now() - '30 days'::interval)
UNION ALL
 SELECT 'ms:'::text || m.id::text AS id,
    'milestone'::text AS source,
    m.kind,
    h.handle,
    m.title,
    m.metric AS detail,
    m.cheers::numeric AS amount,
    NULL::text AS tx_hash,
    m.created_at
   FROM milestones m
     LEFT JOIN handles h ON h.company_id = m.company_id AND h.is_public
  WHERE m.created_at > (now() - '30 days'::interval);

GRANT SELECT ON public.public_feed TO anon, authenticated;
