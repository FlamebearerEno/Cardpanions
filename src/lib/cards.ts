export type CardType = "take" | "riff";
export type Keyword =
  | "swagger"
  | "defend"
  | "cancel"
  | "chaos"
  | "overreach";

export type CardDef = {
  id: string;
  name: string;
  type: CardType;
  energy: number;
  power: number;
  swagger: number;
  defend: number;
  chaosMin?: number;
  chaosMax?: number;
  stance: "declare" | "hold" | null;
  keywords: Keyword[];
  text: string;
  setId: string;
  unlock: "starter" | "pack";
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
 * Locked bible table. Do not invent new costs/Power.
 */
export const CARDS: CardDef[] = [
  {
    id: "opening_jab",
    name: "Opening Jab",
    type: "take",
    energy: 1,
    power: 5,
    swagger: 1,
    defend: 0,
    stance: null,
    keywords: ["swagger"],
    setId: "takes-core",
    unlock: "starter",
    text: "Swagger +1 (Declare face-up, if uncancelled).",
  },
  {
    id: "guarded_point",
    name: "Guarded Point",
    type: "take",
    energy: 1,
    power: 4,
    swagger: 0,
    defend: 3,
    stance: "hold",
    keywords: ["defend"],
    setId: "takes-core",
    unlock: "starter",
    text: "Hold bias. Flip: Defend 3 (reduce incoming cut by 3).",
  },
  {
    id: "straight_claim",
    name: "Straight Claim",
    type: "take",
    energy: 1,
    power: 8,
    swagger: 0,
    defend: 0,
    stance: "declare",
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "Declare baseline. Clean 8.",
  },
  {
    id: "trap_clause",
    name: "Trap Clause",
    type: "take",
    energy: 1,
    power: 5,
    swagger: 0,
    defend: 0,
    stance: "hold",
    keywords: ["cancel"],
    setId: "takes-core",
    unlock: "starter",
    text: "Hold. Flip: Cancel enemy Swagger.",
  },
  {
    id: "loud_correct",
    name: "Loud Correct",
    type: "take",
    energy: 1,
    power: 10,
    swagger: 0,
    defend: 0,
    stance: "declare",
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "Declare. No Swagger.",
  },
  {
    id: "comeback_line",
    name: "Comeback Line",
    type: "take",
    energy: 1,
    power: 6,
    swagger: 0,
    defend: 0,
    stance: "hold",
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "Hold. +4 Power if Shared Pulse < 50%.",
  },
  {
    id: "swagger_hook",
    name: "Swagger Hook",
    type: "take",
    energy: 1,
    power: 7,
    swagger: 3,
    defend: 0,
    stance: "declare",
    keywords: ["swagger"],
    setId: "takes-core",
    unlock: "starter",
    text: "Declare. Swagger +3.",
  },
  {
    id: "exact_count",
    name: "Exact Count",
    type: "take",
    energy: 1,
    power: 7,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "takes-core",
    unlock: "starter",
    text: "+3 Power if Floor Pulse is 40–60%.",
  },
  {
    id: "sideways_cut",
    name: "Sideways Cut",
    type: "take",
    energy: 1,
    power: 0,
    swagger: 0,
    defend: 0,
    chaosMin: 6,
    chaosMax: 9,
    stance: null,
    keywords: ["chaos"],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Chaos 6–9 (bounded RNG).",
  },
  {
    id: "finisher_bite",
    name: "Finisher Bite",
    type: "take",
    energy: 2,
    power: 12,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "−4 Power if Floor Pulse > 70%.",
  },
  {
    id: "bitter_balm",
    name: "Bitter Balm",
    type: "take",
    energy: 1,
    power: 4,
    swagger: 0,
    defend: 0,
    stance: "hold",
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Flip: heal 8. Otherwise fight at Power 4.",
  },
  {
    id: "contrarian_echo",
    name: "Contrarian Echo",
    type: "take",
    energy: 1,
    power: 7,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "+4 Power if the enemy Declared last clash.",
  },
  {
    id: "warm_up",
    name: "Warm-Up",
    type: "riff",
    energy: 0,
    power: 0,
    swagger: 0,
    defend: 0,
    stance: null,
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
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "riffs-core",
    unlock: "starter",
    text: "Heal 10 Pulse. Max 1/turn.",
  },
  {
    id: "read_ahead",
    name: "Read Ahead",
    type: "riff",
    energy: 1,
    power: 0,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "riffs-core",
    unlock: "starter",
    text: "Peek enemy Intent (scripted floor Take).",
  },
  {
    id: "amp_next",
    name: "Amp",
    type: "riff",
    energy: 1,
    power: 0,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "riffs-core",
    unlock: "starter",
    text: "Next Take +3 Power.",
  },
  {
    id: "deny",
    name: "Deny",
    type: "riff",
    energy: 2,
    power: 0,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: ["cancel"],
    setId: "riffs-core",
    unlock: "starter",
    text: "Cancel Swagger or the next trigger.",
  },
  {
    id: "second_thought",
    name: "Second Thought",
    type: "riff",
    energy: 1,
    power: 0,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Shelf → hand (1).",
  },
  {
    id: "raise_stakes",
    name: "Raise Stakes",
    type: "riff",
    energy: 1,
    power: 0,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "unlock-edge",
    unlock: "pack",
    text: "Next Clash cut ×1.25 (both pools).",
  },
  {
    id: "overreach_riff",
    name: "Overreach",
    type: "riff",
    energy: 0,
    power: 0,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: ["overreach"],
    setId: "unlock-edge",
    unlock: "pack",
    text: "+1 Energy this turn. Pay 8 Shared Pulse.",
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

function floorTake(
  id: string,
  name: string,
  power: number,
  extra: Partial<CardDef> = {},
): CardDef {
  return {
    id,
    name,
    type: "take",
    energy: 0,
    power,
    swagger: 0,
    defend: 0,
    stance: null,
    keywords: [],
    setId: "floor",
    unlock: "starter",
    text: name,
    ...extra,
  };
}

/** Floor-only takes — not collectible. Greybox Door kit using bible keywords. */
export const FLOOR_CARDS: CardDef[] = [
  floorTake("door_jab", "Door Jab", 7, {
    swagger: 1,
    keywords: ["swagger"],
    stance: "declare",
    text: "Declare. Swagger +1.",
  }),
  floorTake("latch_guard", "Latch Guard", 6, {
    defend: 3,
    keywords: ["defend"],
    stance: "hold",
    text: "Hold. Flip: Defend 3.",
  }),
  floorTake("keep_out", "Keep Out", 10, {
    stance: "declare",
    text: "Declare baseline. Clean 10.",
  }),
  floorTake("floor_hook", "Threshold Hook", 8, {
    swagger: 3,
    keywords: ["swagger"],
    stance: "declare",
    text: "Declare. Swagger +3.",
  }),
];

export const FLOOR_BY_ID: Record<string, CardDef> = Object.fromEntries(
  FLOOR_CARDS.map((c) => [c.id, c]),
);

export function getAnyCard(id: string): CardDef {
  const key = remapCardId(id);
  return FLOOR_BY_ID[key] ?? getCard(key);
}
