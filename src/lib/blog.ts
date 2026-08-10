/** Public brand blog — short essays. Not investment advice. */

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "nfts-as-keys",
    title: "Your NFT is a hotel key, not a lottery ticket",
    description:
      "A funny field guide to Genesis Passports as wallet keys — private sale, not floor-price theater.",
    date: "2026-08-09",
    readingMinutes: 5,
    body: [
      "Once upon a time, someone bought a JPEG of a rock and called it a business plan. The rock did not open doors. The rock did not pay rent. The rock mainly opened group chats.",
      "Aura OS is doing something less glamorous and more useful: treating a Genesis Passport like a **hotel key** for your company wallet — proof you belong in the room, not a promise that the lobby chandelier will 100×.",
      "## The joke that became a security lesson",
      "Imagine your front door used a sticky note that said “PASSWORD123”. That is roughly how a lot of crypto UX feels: one leaked seed phrase and the whole building moves out without you.",
      "A passport NFT does not replace your seed. It is not magic armor. What it *can* do is act as an **onchain membership key**: the app checks “does this wallet hold the key?” before unlocking founder perks, mint gates, or private-sale rooms. Steal the sticky note and you still need the door. Hold the key and the door recognizes you.",
      "## Keys vs casino chips",
      "Casino chips are for gambling. Keys are for access. We are shipping keys.",
      "That means honesty in the copy: utility membership for founding companies, buyable with **Stripe** (fiat) or USDC when you are seated — **not** an investment product, **not** the token launch, **not** “number go up because monkey.”",
      "## Private sale, public manners",
      "We are building community first (waitlist), then opening doors in waves. The private sale is invitation-shaped on purpose: slower spam, clearer accountability, and a chance to explain the key metaphor before someone tries to flip a door handle on OpenSea for clout.",
      "If you only remember one line: **the NFT proves access; your wallet still holds the funds; approvals still sit with the founder.** Agents work. You keep the keys to the vault — and now you have a passport that says you checked into the hotel.",
      "## What to do next",
      "1. Join the waitlist on aibusiness.fun so we know you exist.\n2. When invited, buy a founding seat.\n3. When ready, buy the Genesis Passport with Stripe from Wallet — claim mint to your smart wallet.\n4. Read the pitch if you like slides more than jokes.",
      "Still confused? Good. Confusion means you asked the right question. Keys open doors. Rocks… stay rocks.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
