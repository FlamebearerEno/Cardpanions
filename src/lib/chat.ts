import { getCompanion } from "./companions";
import { hashSeed } from "./rng";
import { BOND_PER_MESSAGE, FRAGMENTS_PER_MESSAGE } from "./formulas";

const MERCY = /\b(sorry|please\s*forgive|mercy|go easy|i give up|i quit)\b/i;
const CRUEL = /\b(hate|kill|stupid|shut up|worthless)\b/i;
const QUIT = /\b(i quit|i'm done|give up|whatever)\b/i;

export function replyToChat(args: {
  companionId: string;
  playerText: string;
  bond: number;
  messageIndex: number;
}): { reply: string; bond: number; fragments: number; rejected: boolean } {
  const companion = getCompanion(args.companionId);
  const text = args.playerText.trim();
  let rejected = false;
  let pool = companion.lines;

  if (companion.traits.reject === "Mercy" && MERCY.test(text)) {
    pool = companion.rejectLines;
    rejected = true;
  } else if (companion.traits.reject === "Cruelty" && CRUEL.test(text)) {
    pool = companion.rejectLines;
    rejected = true;
  } else if (companion.traits.reject === "Quit" && QUIT.test(text)) {
    pool = companion.rejectLines;
    rejected = true;
  }

  const idx =
    hashSeed(text.toLowerCase(), args.bond, args.messageIndex) % pool.length;
  return {
    reply: pool[idx]!,
    bond: BOND_PER_MESSAGE,
    fragments: FRAGMENTS_PER_MESSAGE,
    rejected,
  };
}
