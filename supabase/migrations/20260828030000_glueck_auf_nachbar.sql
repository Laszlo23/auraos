-- Glück auf, Nachbar: in-app peer notes with Aura card links (not Google stars).

ALTER TABLE public.nachbar_feedback
  ADD COLUMN IF NOT EXISTS from_company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS nachbar_feedback_from_company_idx
  ON public.nachbar_feedback (from_company_id)
  WHERE from_company_id IS NOT NULL;

DROP POLICY IF EXISTS "public nachbar feedback" ON public.nachbar_feedback;
CREATE POLICY "public nachbar feedback"
  ON public.nachbar_feedback FOR SELECT TO anon, authenticated
  USING (char_length(note) >= 8);

GRANT SELECT ON public.nachbar_feedback TO anon;

CREATE OR REPLACE FUNCTION public.nachbar_leave_feedback(_checkin_id uuid, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  checkin public.nachbar_checkins;
  note text;
  done boolean;
  peer boolean := false;
  from_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  note := trim(COALESCE(_note, ''));
  IF char_length(note) < 8 OR char_length(note) > 400 THEN
    RAISE EXCEPTION 'note_invalid';
  END IF;
  SELECT * INTO checkin FROM public.nachbar_checkins WHERE id = _checkin_id AND user_id = uid;
  IF checkin.id IS NULL OR checkin.status <> 'confirmed' THEN
    RAISE EXCEPTION 'visit_required';
  END IF;

  SELECT c.id INTO from_id
  FROM public.companies c
  WHERE c.owner_id = uid
    AND COALESCE(c.is_local_business, false) = true
    AND c.id <> checkin.company_id
  ORDER BY c.local_seat_paid_at DESC NULLS LAST, c.created_at
  LIMIT 1;

  INSERT INTO public.nachbar_feedback (user_id, company_id, checkin_id, note, from_company_id)
  VALUES (uid, checkin.company_id, checkin.id, note, from_id)
  ON CONFLICT (user_id, checkin_id) DO UPDATE
    SET note = EXCLUDED.note,
        from_company_id = COALESCE(EXCLUDED.from_company_id, public.nachbar_feedback.from_company_id);

  done := public._nachbar_complete_mission(uid, 'wien-feedback', checkin.id);
  IF from_id IS NOT NULL THEN
    peer := public._nachbar_complete_mission(uid, 'wien-glueck-auf', checkin.id);
  END IF;
  RETURN jsonb_build_object('ok', true, 'granted', done OR peer, 'peer', from_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.nachbar_leave_feedback(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nachbar_leave_feedback(uuid, text) TO authenticated;

INSERT INTO public.nachbar_missions (slug, kind, title, body, grant_amount, sort_order)
VALUES (
  'wien-glueck-auf',
  'feedback',
  'Glück auf, Nachbar',
  'Als Betrieb: echten Besuch bei einem anderen Wiener Laden, dann eine kurze Nachbar-Notiz mit deiner Aura-Karte. Kein Google-Stern.',
  25,
  8
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  grant_amount = EXCLUDED.grant_amount,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
