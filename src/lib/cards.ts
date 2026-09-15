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

export const SETS = [
  {
    id: "takes-core",
    name: "Opening Arguments",
    bonus: "+1 clash Power",
  },
  {
    id: "riffs-core",
    name: "Breathwork",
    bonus: "+4 Shared Pulse cap",
  },
  {
    id: "unlock-edge",
    name: "Edge Cases",
    bonus: "+3 Shared Pulse cap",
  },
] as const;

export const CARDS: CardDef[] = [
  // --- Starter Takes (8) ---
  {
    id: "opening-jab",
    name: "Opening Jab",
    type: "take",
    energy: 1,
    power: 8,
    keywords: ["lead"],
    setId: "takes-core",
    unlock: "starter",
    text: "Lead: +2 Power.",
  },
  {
    id: "guarded-point",
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
    id: "straight-claim",
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
    id: "trap-clause",
    name: "Trap Clause",
    type: "take",
    energy: 2,
    power: 7,
    keywords: ["cancel"],
    setId: "takes-core",
    unlock: "starter",
    text: "Cancel: strip the floor's keywords this clash.",
  },
  {
    id: "loud-correct",
    name: "Loud Correct",
    type: "take",
    energy: 1,
    power: 8,
    keywords: ["react"],
    setId: "takes-core",
    unlock: "starter",
    text: "React (Hold): +4 Power.",
  },
  {
    id: "comeback-line",
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
    id: "swagger-hook",
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
    id: "exact-count",
    name: "Exact Count",
    type: "take",
    energy: 2,
    power: 11,
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "Ignores Chaos. The number is the number.",
  },
  // --- Starter Riffs (5) ---
  {
    id: "warm-up",
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
    id: "steady-breath",
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
    id: "read-ahead",
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
    id: "amp",
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
    text: "Cancel floor keywords on your next clash.",
  },
  // --- Unlocks: Takes ---
  {
    id: "sideways-cut",
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
    id: "finisher-bite",
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
    id: "bitter-balm",
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
    id: "contrarian-echo",
    name: "Contrarian Echo",
    type: "take",
    energy: 2,
    power: 8,
    keywords: ["react"],
    setId: "unlock-edge",
    unlock: "pack",
    text: "React: match their Power, then +1.",
  },
  // --- Unlocks: Riffs ---
  {
    id: "second-thought",
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
    id: "raise-stakes",
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
    id: "overreach",
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
  const c = CARD_BY_ID[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function cardsInSet(setId: string): CardDef[] {
  return CARDS.filter((c) => c.setId === setId);
}

/** Floor-only takes — not collectible. */
export const FLOOR_CARDS: CardDef[] = [
  {
    id: "door-jab",
    name: "Door Jab",
    type: "take",
    energy: 0,
    power: 7,
    keywords: ["lead"],
    setId: "floor",
    unlock: "starter",
    text: "The door talks first.",
  },
  {
    id: "latch-guard",
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
    id: "keep-out",
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
    id: "floor-hook",
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
  return FLOOR_BY_ID[id] ?? getCard(id);
}
