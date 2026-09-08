-- TICKPIX pit achievement — culture seat on Robinhood Chain (not a second Hood).
INSERT INTO public.achievement_definitions (id, title, description, glyph, sort_order, unlock_event, min_xp, min_rep)
VALUES
  (
    'tickpix-seat',
    'Pit seat',
    'Took a TICKPIX seat on Robinhood Chain — culture for the tape.',
    '▣',
    165,
    'tickpix:mint',
    0,
    0
  )
ON CONFLICT (id) DO NOTHING;
