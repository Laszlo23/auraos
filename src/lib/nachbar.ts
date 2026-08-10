/** Aura Nachbar — patron earn constants (not Google-review rewards). */

export const NACHBAR_TABS = [
  { to: "/nachbar/heute", label: "Heute" },
  { to: "/nachbar/entdecken", label: "Entdecken" },
  { to: "/nachbar/verdienen", label: "Verdienen" },
  { to: "/nachbar/freunde", label: "Freunde" },
  { to: "/nachbar/ich", label: "Ich" },
] as const;

export const NACHBAR_WELCOME_GRANT = 50;
export const NACHBAR_FIRST_CHECKIN_GRANT = 40;
export const NACHBAR_REPEAT_CHECKIN_GRANT = 10;
export const NACHBAR_FRIEND_BONUS = 25;

export const NACHBAR_FRIEND_STORAGE_KEY = "aura_nachbar_friend_ref";
export const NACHBAR_SHOP_STORAGE_KEY = "aura_nachbar_shop_slug";
export const NACHBAR_CHECKIN_STORAGE_KEY = "aura_nachbar_pending_checkin";
