-- Idempotent seed for official Aura Beta growth squad (invite BETAVN).
-- Safe if already applied via MCP.

DO $$
DECLARE
  uid uuid := '921ea80e-e671-4af4-a865-4a4e69b14c79';
  co_id uuid := '37d595bb-4688-4613-8f12-cf794af8b251';
  sid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.aura_squads WHERE slug = 'aura-beta') THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.aura_squad_members WHERE user_id = uid) THEN
    RETURN;
  END IF;

  INSERT INTO public.aura_squads (name, slug, emoji, invite_code, owner_user_id, city_id, member_count)
  VALUES ('Aura Beta', 'aura-beta', '◈', 'BETAVN', uid, 'wien', 1)
  RETURNING id INTO sid;

  INSERT INTO public.aura_squad_members (squad_id, user_id, company_id, role)
  VALUES (sid, uid, co_id, 'owner');

  INSERT INTO public.aura_squad_tasks (squad_id, created_by, title, kind, xp_reward, meta) VALUES
    (sid, uid, 'Post Quest + Squads kit on X', 'social_post', 60,
      jsonb_build_object('share_post_id', 'quest-squads', 'platform', 'x', 'href', 'https://aibusiness.fun/share')),
    (sid, uid, 'Show up on the next Aura X Space', 'space_showup', 80,
      jsonb_build_object('platform', 'x_spaces', 'href', 'https://x.com/buildingcultu3', 'honor', true)),
    (sid, uid, 'Share your Scout /lokal?ref invite', 'scout_invite', 50,
      jsonb_build_object('href', 'https://aibusiness.fun/quest', 'hint', 'Join Scouts then copy invite')),
    (sid, uid, 'Drop a world-pulse win in Discord', 'social_post', 45,
      jsonb_build_object('platform', 'discord', 'href', 'https://discord.gg/geUpHt3eSb')),
    (sid, uid, 'Publish one growth post from Channels', 'channels_publish', 70,
      jsonb_build_object('platform', 'channels', 'href', 'https://aibusiness.fun/channels'));
END $$;
