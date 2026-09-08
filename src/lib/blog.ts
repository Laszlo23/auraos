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
    slug: "make-it-up-by-building",
    title: "We make it up by building",
    description:
      "After Culture Coin was rugged by a former partner — how Aura OS and TICKPIX rebuild trust with receipts, not theater.",
    date: "2026-09-08",
    readingMinutes: 6,
    body: [
      "Some chapters you don’t get to rewrite. Building Culture’s Culture Coin was rugged by a former partner. People got hurt. Screenshots circulated. Trust left the room.",
      "We can’t un-rug a past. What we *can* do is refuse to repeat the pattern — and leave a trail of work you can verify without trusting a DM.",
      "## Two keys, one standard",
      "**Hood** on Base is the OS founding passport: desk utility for the first circle. **TICKPIX** on Robinhood Chain is culture membership for the tape: a seat you mint, a badge you earn in Aura, Quest XP for showing up — not equity, not a fund, not a second founding collection.",
      "If a project needs two “founding” JPEGs to keep the story going, the story is the product. Ours isn’t.",
      "## The boring rules that matter",
      "1. Official contract addresses and mint URLs live only on **aibusiness.fun** and **nft.aibusiness.fun**.\n2. Changelog, `/proof`, and `/live` stay public — quiet weeks stay honest zeros.\n3. Fair-launch timing is announced on official channels **48 hours** ahead — never by DM, never as a surprise CA.\n4. NFTs are **keys**, not lottery tickets.",
      "That’s the [community covenant](/trust). Six promises. Hold us to them.",
      "## What to do if you’re still angry (fair)",
      "Anger is data. Don’t buy a story. Mint only after you read the CA on Blockscout. Link the same wallet in Aura OS if you want Pit belonging. Share the covenant if someone asks “are these the Culture Coin people?” — yes, same lineage of builders; no, not the same playbook.",
      "## Links that aren’t vibes",
      "- Covenant: [aibusiness.fun/trust](/trust)\n- TICKPIX pit: [aibusiness.fun/pit](/pit)\n- Mint: [nft.aibusiness.fun](https://nft.aibusiness.fun)\n- Proof: [/proof](/proof) · Changelog: [/changelog](/changelog)\n- Hood: [/hood](/hood)",
      "We make it up by building. Every week. In public.",
    ],
  },
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
