export type CardType = "take" | "riff";
export type Keyword =
  | "lead"
  | "react"
  | "defend"
  | "swagger"
  | "cancel"
  | "chaos"
  | "overreach";

export type CardDef = {
  id: string;
  name: string;
  type: CardType;
  energy: number;
  power: number;
  keywords: Keyword[];
  text: string;
  setId: string;
  unlock: "starter" | "pack";
  flavor?: string;
};

/** kebab-case leftovers from the first slice → snake_case bible. */
export const CARD_ID_REMAP: Record<string, string> = {
  "opening-jab": "opening_jab",
  "guarded-point": "guarded_point",
  "straight-claim": "straight_claim",
  "trap-clause": "trap_clause",
  "loud-correct": "loud_correct",
  "comeback-line": "comeback_line",
  "swagger-hook": "swagger_hook",
  "exact-count": "exact_count",
  "warm-up": "warm_up",
  "steady-breath": "steady_breath",
  "read-ahead": "read_ahead",
  amp: "amp_next",
  "sideways-cut": "sideways_cut",
  "finisher-bite": "finisher_bite",
  "bitter-balm": "bitter_balm",
  "contrarian-echo": "contrarian_echo",
  "second-thought": "second_thought",
  "raise-stakes": "raise_stakes",
  overreach: "overreach_riff",
  "door-jab": "door_jab",
  "latch-guard": "latch_guard",
  "keep-out": "keep_out",
  "floor-hook": "floor_hook",
};

export function remapCardId(id: string): string {
  return CARD_ID_REMAP[id] ?? id;
}

export const SETS = [
  {
    id: "takes-core",
    name: "Opening Arguments",
    bonus: "+1 clash Power",
  },
  {
    id: "riffs-core",
    name: "Breathwork",
    bonus: "Riffs cost 1 less (min 0)",
  },
  {
    id: "unlock-edge",
    name: "Edge Cases",
    bonus: "+1 Power on Hold (Second)",
  },
] as const;

/**
 * Locked v1 kit. The original brief named roles/keywords, not integers;
 * these energy/power values are the bible going forward.
 */
export const CARDS: CardDef[] = [
  {
    id: "opening_jab",
    name: "Opening Jab",
    type: "take",
    energy: 1,
    power: 8,
    keywords: ["lead"],
    setId: "takes-core",
    unlock: "starter",
    text: "Declare (First): +2 Power.",
  },
  {
    id: "guarded_point",
    name: "Guarded Point",
    type: "take",
    energy: 1,
    power: 6,
    keywords: ["defend"],
    setId: "takes-core",
    unlock: "starter",
    text: "Defend: if you lose the cut, take half (rounded up).",
  },
  {
    id: "straight_claim",
    name: "Straight Claim",
    type: "take",
    energy: 2,
    power: 12,
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "Clean Power. No tricks.",
  },
  {
    id: "trap_clause",
    name: "Trap Clause",
    type: "take",
    energy: 2,
    power: 7,
    keywords: ["cancel"],
    setId: "takes-core",
    unlock: "starter",
    text: "Cancel: First strips Second-first; otherwise Second-first Cancel strips First.",
  },
  {
    id: "loud_correct",
    name: "Loud Correct",
    type: "take",
    energy: 1,
    power: 8,
    keywords: ["react"],
    setId: "takes-core",
    unlock: "starter",
    text: "Hold (Second-first): +4 Power, unless First Cancelled.",
  },
  {
    id: "comeback_line",
    name: "Comeback Line",
    type: "take",
    energy: 2,
    power: 9,
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "+4 Power if Shared Pulse is below Floor Pulse.",
  },
  {
    id: "swagger_hook",
    name: "Swagger Hook",
    type: "take",
    energy: 2,
    power: 10,
    keywords: ["swagger"],
    setId: "takes-core",
    unlock: "starter",
    text: "Swagger: if you win, extra 10 cut.",
  },
  {
    id: "exact_count",
    name: "Exact Count",
    type: "take",
    energy: 2,
    power: 11,
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "Ignores Chaos. The number is the number.",
  },
  {
    id: "warm_up",
    name: "Warm-Up",
    type: "riff",
    energy: 1,
    power: 0,
    keywords: [],
    setId: "riffs-core",
    unlock: "starter",
    text: "Draw 1 (hand cap 7).",
  },
  {
    id: "steady_breath",
    name: "Steady Breath",
    type: "riff",
    energy: 1,
    power: 0,
    keywords: [],
    setId: "riffs-core",
    unlock: "starter",
    text: "Restore 10 Shared Pulse.",
  },
  {
    id: "read_ahead",
    name: "Read Ahead",
    type: "riff",
    energy: 1,
    power: 0,
    keywords: [],
    setId: "riffs-core",
    unlock: "starter",
    text: "+3 Power on your next clash.",
  },
  {
    id: "amp_next",
    name: "Amp",
    type: "riff",
    energy: 2,
    power: 0,
    keywords: [],
    setId: "riffs-core",
    unlock: "starter",
    text: "+5 Power on your next clash.",
  },
  {
    id: "deny",
    name: "Deny",
    type: "riff",
    energy: 1,
    power: 0,
    keywords: ["cancel"],
    setId: "riffs-core",
    unlock: "starter",
    text: "Cancel floor keywords on your next clash (counts as your Cancel).",
  },
  {
    id: "sideways_cut",
    name: "Sideways Cut",
    type: "take",
    energy: 1,
    power: 9,
    keywords: ["chaos"],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Chaos: both Powers jitter ±3. Exact Count ignores it.",
  },
  {
    id: "finisher_bite",
    name: "Finisher Bite",
    type: "take",
    energy: 3,
    power: 16,
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "All-in closer. Costs the whole bar.",
  },
  {
    id: "bitter_balm",
    name: "Bitter Balm",
    type: "take",
    energy: 1,
    power: 5,
    keywords: ["defend"],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Defend. After the clash, restore 8 Shared Pulse.",
  },
  {
    id: "contrarian_echo",
    name: "Contrarian Echo",
    type: "take",
    energy: 2,
    power: 8,
    keywords: ["react"],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Hold (Second-first): match their Power, then +1.",
  },
  {
    id: "second_thought",
    name: "Second Thought",
    type: "riff",
    energy: 1,
    power: 0,
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Pull the top of the Shelf back into hand.",
  },
  {
    id: "raise_stakes",
    name: "Raise Stakes",
    type: "riff",
    energy: 2,
    power: 0,
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Next clash cut uses PowerDiff × 7 instead of × 5.",
  },
  {
    id: "overreach_riff",
    name: "Overreach",
    type: "riff",
    energy: 1,
    power: 0,
    keywords: ["overreach"],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Next clash +6 Power. If you lose, take +15 extra cut.",
  },
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(
  CARDS.map((c) => [c.id, c]),
);

export const STARTER_TAKE_IDS = CARDS.filter(
  (c) => c.unlock === "starter" && c.type === "take",
).map((c) => c.id);

export const STARTER_RIFF_IDS = CARDS.filter(
  (c) => c.unlock === "starter" && c.type === "riff",
).map((c) => c.id);

export const STARTER_IDS = CARDS.filter((c) => c.unlock === "starter").map(
  (c) => c.id,
);

export const UNLOCK_IDS = CARDS.filter((c) => c.unlock === "pack").map(
  (c) => c.id,
);

export function getCard(id: string): CardDef {
  const c = CARD_BY_ID[remapCardId(id)];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function cardsInSet(setId: string): CardDef[] {
  return CARDS.filter((c) => c.setId === setId);
}

/** Floor-only takes — not collectible. */
export const FLOOR_CARDS: CardDef[] = [
  {
    id: "door_jab",
    name: "Door Jab",
    type: "take",
    energy: 0,
    power: 7,
    keywords: ["lead"],
    setId: "floor",
    unlock: "starter",
    text: "First: +2 Power if the floor is First (player Held).",
  },
  {
    id: "latch_guard",
    name: "Latch Guard",
    type: "take",
    energy: 0,
    power: 6,
    keywords: ["defend"],
    setId: "floor",
    unlock: "starter",
    text: "Defend: floor takes half cut if it loses.",
  },
  {
    id: "keep_out",
    name: "Keep Out",
    type: "take",
    energy: 0,
    power: 10,
    keywords: [],
    setId: "floor",
    unlock: "starter",
    text: "A heavy claim.",
  },
  {
    id: "floor_hook",
    name: "Threshold Hook",
    type: "take",
    energy: 0,
    power: 8,
    keywords: ["swagger"],
    setId: "floor",
    unlock: "starter",
    text: "Swagger: if the floor wins, extra 10 cut.",
  },
];

export const FLOOR_BY_ID: Record<string, CardDef> = Object.fromEntries(
  FLOOR_CARDS.map((c) => [c.id, c]),
);

export function getAnyCard(id: string): CardDef {
  const key = remapCardId(id);
  return FLOOR_BY_ID[key] ?? getCard(key);
}
