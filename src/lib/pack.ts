import { getCompanion } from "./companions";
import { UNLOCK_IDS, STARTER_IDS, getCard } from "./cards";
import { DUST_PER_DUPE, PACK_SIZE } from "./formulas";
import { SeededRng } from "./rng";

export type PackGrant = {
  cardId: string;
  name: string;
  text: string;
  type: string;
  isNew: boolean;
  dust: number;
};

export function rollPack(args: {
  seed: number;
  pullIndex: number;
  ownedIds: string[];
  companionId: string | null;
}): PackGrant[] {
  const rng = new SeededRng(args.seed);
  const owned = new Set(args.ownedIds);
  const bias = args.companionId
    ? getCompanion(args.companionId).packBias.filter((id) =>
        UNLOCK_IDS.includes(id),
      )
    : [];

  if (args.pullIndex === 0) {
    const pool = rng.shuffle(UNLOCK_IDS);
    return pool.slice(0, PACK_SIZE).map((cardId) => grant(cardId, owned));
  }

  const grants: PackGrant[] = [];
  const usedThisPack = new Set<string>();
  for (let i = 0; i < PACK_SIZE; i++) {
    const pool = weightedPool(bias, usedThisPack);
    const cardId = rng.pick(pool);
    usedThisPack.add(cardId);
    grants.push(grant(cardId, owned));
    if (grants[i]!.isNew) owned.add(cardId);
  }
  return grants;
}

function weightedPool(bias: string[], used: Set<string>): string[] {
  const base = [...UNLOCK_IDS, ...UNLOCK_IDS, ...STARTER_IDS];
  const extra = bias.flatMap((id) => [id, id]);
  const pool = [...base, ...extra].filter((id) => !used.has(id));
  return pool.length > 0 ? pool : [...UNLOCK_IDS];
}

function grant(cardId: string, owned: Set<string>): PackGrant {
  const def = getCard(cardId);
  const isNew = !owned.has(cardId);
  return {
    cardId,
    name: def.name,
    text: def.text,
    type: def.type,
    isNew,
    dust: isNew ? 0 : DUST_PER_DUPE,
  };
}
