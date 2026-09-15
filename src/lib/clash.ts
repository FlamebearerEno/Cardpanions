import { cardsInSet, getAnyCard, getCard, STARTER_IDS, SETS } from "./cards";
import { SeededRng } from "./rng";
import {
  BOND_PER_MESSAGE,
  bondAuraPower,
  clashCut,
  CLASH_CUT_MULT,
  defendPartial,
  DRAW_PER_TURN,
  ENERGY_MAX,
  ENRAGE_POWER_PER_TURN,
  ENRAGE_START_TURN,
  FLOOR1_PULSE,
  HAND_CAP,
  OVERREACH_LOSE_CUT,
  OVERREACH_POWER,
  RAISE_STAKES_MULT,
  rankPowerBonus,
  sharedPulseMax,
  SILENCE_PRESS,
  SWAGGER_BONUS_CUT,
} from "./formulas";

export type CardInst = { iid: string; cardId: string };

export type ClashAction =
  | { type: "riff"; iid: string }
  | { type: "declare"; iid: string }
  | { type: "hold"; iid: string }
  | { type: "shelf"; iid: string }
  | { type: "end" };

export type LastClash = {
  playerCard: string | null;
  playerCardName: string;
  floorCard: string;
  floorCardName: string;
  playerPower: number;
  floorPower: number;
  cut: number;
  multiplier: number;
  playerLeads: boolean;
  sharedDelta: number;
  floorDelta: number;
  note: string;
};

export type ClashState = {
  id: string;
  playerId: string;
  floorId: "door-1";
  floorName: string;
  turn: number;
  energy: number;
  energyMax: number;
  sharedPulse: number;
  sharedPulseMax: number;
  playerSegment: number;
  companionSegment: number;
  floorPulse: number;
  floorPulseMax: number;
  hand: CardInst[];
  draw: CardInst[];
  shelf: CardInst[];
  clashUsed: boolean;
  riffBonus: number;
  nextClashBonus: number;
  overreachArmed: boolean;
  denyArmed: boolean;
  raiseStakes: boolean;
  status: "active" | "won" | "lost";
  log: string[];
  lastClash: LastClash | null;
  rngSeed: number;
  rngCount: number;
  nextIid: number;
};

export type OwnedCard = { cardId: string; rank: number };

export type ClashContext = {
  playerId: string;
  playerLevel: number;
  companionLevel: number;
  bond: number;
  owned: OwnedCard[];
};

const FLOOR_ROTATION = [
  "door-jab",
  "latch-guard",
  "keep-out",
  "door-jab",
  "floor-hook",
] as const;

export function setBonuses(ownedIds: string[]): {
  power: number;
  pulse: number;
  complete: Record<string, boolean>;
} {
  const owned = new Set(ownedIds);
  const complete: Record<string, boolean> = {};
  let power = 0;
  let pulse = 0;
  for (const set of SETS) {
    const cards = cardsInSet(set.id);
    const done = cards.every((c) => owned.has(c.id));
    complete[set.id] = done;
    if (!done) continue;
    if (set.id === "takes-core") power += 1;
    if (set.id === "riffs-core") pulse += 4;
    if (set.id === "unlock-edge") pulse += 3;
  }
  return { power, pulse, complete };
}

export function buildDeck(owned: OwnedCard[], rng: SeededRng): CardInst[] {
  const ids = new Set(owned.map((o) => o.cardId));
  for (const id of STARTER_IDS) ids.add(id);
  const insts: CardInst[] = [...ids].map((cardId, i) => ({
    iid: `d${i + 1}`,
    cardId,
  }));
  return rng.shuffle(insts);
}

function takeFromDraw(state: ClashState, rng: SeededRng, n: number): CardInst[] {
  const drawn: CardInst[] = [];
  for (let i = 0; i < n; i++) {
    if (state.draw.length === 0) {
      if (state.shelf.length === 0) break;
      state.draw = rng.shuffle(state.shelf);
      state.shelf = [];
      state.log.push("Shelf reshuffled into the draw (StS-style).");
    }
    const card = state.draw.shift();
    if (card) drawn.push(card);
  }
  return drawn;
}

export function drawUpTo(state: ClashState, rng: SeededRng, n: number): void {
  const room = HAND_CAP - state.hand.length;
  const want = Math.min(n, Math.max(0, room));
  if (want <= 0) return;
  state.hand.push(...takeFromDraw(state, rng, want));
}

function persistRng(state: ClashState, rng: SeededRng): void {
  state.rngCount = rng.count;
}

export function createClashState(
  ctx: ClashContext,
  seed: number,
  clashId: string,
): ClashState {
  const rng = new SeededRng(seed);
  const bonuses = setBonuses(ctx.owned.map((o) => o.cardId));
  const pulse = sharedPulseMax(
    ctx.playerLevel,
    ctx.companionLevel,
    ctx.bond,
    bonuses.pulse,
  );
  const deck = buildDeck(ctx.owned, rng);
  const state: ClashState = {
    id: clashId,
    playerId: ctx.playerId,
    floorId: "door-1",
    floorName: "The Door",
    turn: 1,
    energy: ENERGY_MAX,
    energyMax: ENERGY_MAX,
    sharedPulse: pulse.max,
    sharedPulseMax: pulse.max,
    playerSegment: pulse.playerSegment,
    companionSegment: pulse.companionSegment,
    floorPulse: FLOOR1_PULSE,
    floorPulseMax: FLOOR1_PULSE,
    hand: [],
    draw: deck,
    shelf: [],
    clashUsed: false,
    riffBonus: 0,
    nextClashBonus: 0,
    overreachArmed: false,
    denyArmed: false,
    raiseStakes: false,
    status: "active",
    log: [
      "Floor 1 — The Door. Shared Pulse vs Floor Pulse.",
      "1 clash/turn. Lead (Declare) or React (Hold). Leftover energy → Riffs. Shelf = discard.",
    ],
    lastClash: null,
    rngSeed: seed,
    rngCount: 0,
    nextIid: 100,
  };
  drawUpTo(state, rng, DRAW_PER_TURN);
  persistRng(state, rng);
  return state;
}

function findInHand(state: ClashState, iid: string): CardInst | undefined {
  return state.hand.find((c) => c.iid === iid);
}

function spendFromHand(state: ClashState, iid: string): CardInst {
  const idx = state.hand.findIndex((c) => c.iid === iid);
  if (idx < 0) throw new Error("Card is not in hand.");
  const [card] = state.hand.splice(idx, 1);
  return card!;
}

function rankOf(ctx: ClashContext, cardId: string): number {
  return ctx.owned.find((o) => o.cardId === cardId)?.rank ?? 1;
}

function addClashPower(state: ClashState, n: number): void {
  if (state.clashUsed) state.nextClashBonus += n;
  else state.riffBonus += n;
}

function floorTakeId(state: ClashState, rng: SeededRng): string {
  const base = FLOOR_ROTATION[(state.turn - 1) % FLOOR_ROTATION.length]!;
  if (rng.next() < 0.18) return rng.pick([...FLOOR_ROTATION]);
  return base;
}

export function enragePower(turn: number): number {
  if (turn < ENRAGE_START_TURN) return 0;
  return (turn - (ENRAGE_START_TURN - 1)) * ENRAGE_POWER_PER_TURN;
}

export type ClashComputeInput = {
  playerCardId: string | null;
  floorCardId: string;
  playerLeads: boolean;
  playerRank: number;
  riffBonus: number;
  nextClashBonus: number;
  setPower: number;
  bondPower: number;
  overreachArmed: boolean;
  denyArmed: boolean;
  raiseStakes: boolean;
  sharedPulse: number;
  floorPulse: number;
  turn: number;
  rng: SeededRng;
};

export type ClashComputeResult = {
  playerPower: number;
  floorPower: number;
  cut: number;
  multiplier: number;
  sharedDelta: number;
  floorDelta: number;
  heal: number;
  note: string;
};

export function computeClash(input: ClashComputeInput): ClashComputeResult {
  const playerDef = input.playerCardId ? getAnyCard(input.playerCardId) : null;
  const floorDef = getAnyCard(input.floorCardId);
  const playerLeads = input.playerLeads;
  const playerReacts = Boolean(playerDef) && !playerLeads;

  let pPower = playerDef
    ? playerDef.power + rankPowerBonus(input.playerRank)
    : 0;
  let fPower = floorDef.power + enragePower(input.turn);

  const cancelFloor =
    input.denyArmed || (playerDef?.keywords.includes("cancel") ?? false);
  const pKeys = playerDef?.keywords ?? [];
  const fKeys = cancelFloor ? [] : [...floorDef.keywords];

  if (pKeys.includes("lead") && playerLeads) pPower += 2;
  if (pKeys.includes("react") && playerReacts) pPower += 4;
  if (playerDef?.id === "comeback-line" && input.sharedPulse < input.floorPulse) {
    pPower += 4;
  }
  if (playerDef?.id === "contrarian-echo" && playerReacts) {
    pPower = Math.max(pPower, fPower) + 1;
  }

  pPower +=
    input.riffBonus + input.nextClashBonus + input.setPower + input.bondPower;
  if (input.overreachArmed) pPower += OVERREACH_POWER;

  const chaos = pKeys.includes("chaos") || fKeys.includes("chaos");
  if (chaos) {
    if (playerDef?.id !== "exact-count") {
      pPower += input.rng.int(-3, 3);
    }
    fPower += input.rng.int(-3, 3);
  }

  const multiplier = input.raiseStakes ? RAISE_STAKES_MULT : CLASH_CUT_MULT;
  const cut = clashCut(pPower - fPower, multiplier);

  let sharedDelta = 0;
  let floorDelta = 0;
  const notes: string[] = [];

  if (pPower < fPower) {
    let dmg = cut;
    if (pKeys.includes("defend")) {
      dmg = defendPartial(dmg);
      notes.push("Defend halved the cut.");
    }
    if (input.overreachArmed) {
      dmg += OVERREACH_LOSE_CUT;
      notes.push(`Overreach tax +${OVERREACH_LOSE_CUT}.`);
    }
    if (fKeys.includes("swagger")) {
      dmg += SWAGGER_BONUS_CUT;
      notes.push("Floor Swagger +10.");
    }
    sharedDelta = -dmg;
  } else if (pPower > fPower) {
    let dmg = cut;
    if (fKeys.includes("defend")) {
      dmg = defendPartial(dmg);
      notes.push("Floor Defend halved the cut.");
    }
    if (pKeys.includes("swagger")) {
      dmg += SWAGGER_BONUS_CUT;
      notes.push("Swagger +10.");
    }
    floorDelta = -dmg;
  } else {
    notes.push("Powers tied. No cut.");
  }

  let heal = 0;
  if (playerDef?.id === "bitter-balm") {
    heal = 8;
    notes.push("Bitter Balm restores 8.");
  }

  return {
    playerPower: pPower,
    floorPower: fPower,
    cut,
    multiplier,
    sharedDelta,
    floorDelta,
    heal,
    note: notes.join(" "),
  };
}

function applyPulse(
  state: ClashState,
  sharedDelta: number,
  floorDelta: number,
  heal: number,
) {
  state.sharedPulse = Math.max(
    0,
    Math.min(state.sharedPulseMax, state.sharedPulse + sharedDelta + heal),
  );
  state.floorPulse = Math.max(
    0,
    Math.min(state.floorPulseMax, state.floorPulse + floorDelta),
  );
  if (state.floorPulse <= 0) {
    state.status = "won";
    state.log.push("The Door yields. Floor cleared.");
  } else if (state.sharedPulse <= 0) {
    state.status = "lost";
    state.log.push("Shared Pulse broke. The Door holds.");
  }
}

function resolveDeclaredClash(
  state: ClashState,
  ctx: ClashContext,
  rng: SeededRng,
  playerCardId: string | null,
  playerLeads: boolean,
): void {
  const floorId = floorTakeId(state, rng);
  const floorDef = getAnyCard(floorId);
  const bonuses = setBonuses(ctx.owned.map((o) => o.cardId));
  const result = computeClash({
    playerCardId,
    floorCardId: floorId,
    playerLeads,
    playerRank: playerCardId ? rankOf(ctx, playerCardId) : 1,
    riffBonus: state.riffBonus,
    nextClashBonus: state.nextClashBonus,
    setPower: bonuses.power,
    bondPower: bondAuraPower(ctx.bond),
    overreachArmed: state.overreachArmed,
    denyArmed: state.denyArmed,
    raiseStakes: state.raiseStakes,
    sharedPulse: state.sharedPulse,
    floorPulse: state.floorPulse,
    turn: state.turn,
    rng,
  });

  const playerName = playerCardId ? getAnyCard(playerCardId).name : "Silence";
  const stance = playerCardId
    ? playerLeads
      ? "Lead (Declare)"
      : "React (Hold)"
    : "no Take";

  applyPulse(state, result.sharedDelta, result.floorDelta, result.heal);

  state.lastClash = {
    playerCard: playerCardId,
    playerCardName: playerName,
    floorCard: floorId,
    floorCardName: floorDef.name,
    playerPower: result.playerPower,
    floorPower: result.floorPower,
    cut: result.cut,
    multiplier: result.multiplier,
    playerLeads: Boolean(playerCardId) && playerLeads,
    sharedDelta: result.sharedDelta + result.heal,
    floorDelta: result.floorDelta,
    note: result.note,
  };

  const target =
    result.playerPower === result.floorPower
      ? "nobody"
      : result.playerPower > result.floorPower
        ? "the floor"
        : "you";
  state.log.push(
    `T${state.turn} ${stance}: ${playerName} ${result.playerPower} vs ${floorDef.name} ${result.floorPower} → cut ${result.cut} (×${result.multiplier}) hits ${target}. ${result.note}`.trim(),
  );

  state.riffBonus = 0;
  state.nextClashBonus = 0;
  state.overreachArmed = false;
  state.denyArmed = false;
  state.raiseStakes = false;
  state.clashUsed = true;
}

function playRiff(
  state: ClashState,
  rng: SeededRng,
  iid: string,
): void {
  const inst = findInHand(state, iid);
  if (!inst) throw new Error("Card is not in hand.");
  const def = getCard(inst.cardId);
  if (def.type !== "riff") throw new Error("That card is a Take, not a Riff.");
  if (state.energy < def.energy) throw new Error("Not enough energy.");

  if (def.id === "second-thought" && state.shelf.length === 0) {
    throw new Error("Shelf is empty.");
  }

  state.energy -= def.energy;
  spendFromHand(state, iid);
  state.shelf.push(inst);

  switch (def.id) {
    case "warm-up": {
      const before = state.hand.length;
      drawUpTo(state, rng, 1);
      state.log.push(
        state.hand.length > before
          ? "Warm-Up: drew 1."
          : "Warm-Up: hand is full (cap 7).",
      );
      break;
    }
    case "steady-breath": {
      const heal = 10;
      const before = state.sharedPulse;
      state.sharedPulse = Math.min(state.sharedPulseMax, state.sharedPulse + heal);
      state.log.push(`Steady Breath: +${state.sharedPulse - before} Pulse.`);
      break;
    }
    case "read-ahead":
      addClashPower(state, 3);
      state.log.push("Read Ahead: +3 next clash Power.");
      break;
    case "amp":
      addClashPower(state, 5);
      state.log.push("Amp: +5 next clash Power.");
      break;
    case "deny":
      state.denyArmed = true;
      state.log.push("Deny: floor keywords Cancelled next clash.");
      break;
    case "second-thought": {
      const idx = state.shelf.length - 2;
      const back = idx >= 0 ? state.shelf[idx] : undefined;
      if (!back) {
        state.log.push("Second Thought: nothing else on the Shelf.");
        break;
      }
      if (state.hand.length >= HAND_CAP) {
        state.log.push("Second Thought: hand cap 7, left it on the Shelf.");
        break;
      }
      const [card] = state.shelf.splice(idx, 1);
      state.hand.push(card!);
      state.log.push(`Second Thought: ${getAnyCard(card!.cardId).name} returns.`);
      break;
    }
    case "raise-stakes":
      state.raiseStakes = true;
      state.log.push("Raise Stakes: next cut is PowerDiff × 7.");
      break;
    case "overreach":
      state.overreachArmed = true;
      state.log.push("Overreach armed: +6 Power, +15 cut if you lose.");
      break;
    default:
      state.log.push(`${def.name} plays.`);
  }
}

function playTake(
  state: ClashState,
  ctx: ClashContext,
  rng: SeededRng,
  iid: string,
  lead: boolean,
): void {
  if (state.clashUsed) throw new Error("Already clashed this turn.");
  const inst = findInHand(state, iid);
  if (!inst) throw new Error("Card is not in hand.");
  const def = getCard(inst.cardId);
  if (def.type !== "take") throw new Error("Riffs can't clash. Play a Take.");
  if (state.energy < def.energy) throw new Error("Not enough energy.");

  state.energy -= def.energy;
  spendFromHand(state, iid);
  state.shelf.push(inst);
  resolveDeclaredClash(state, ctx, rng, def.id, lead);
}

function endTurn(state: ClashState, rng: SeededRng): void {
  if (state.status !== "active") return;
  if (!state.clashUsed) {
    state.sharedPulse = Math.max(0, state.sharedPulse - SILENCE_PRESS);
    state.log.push(
      `You held silence. The Door presses ${SILENCE_PRESS}. Leftover energy is gone.`,
    );
    if (state.sharedPulse <= 0) {
      state.status = "lost";
      state.log.push("Shared Pulse broke. The Door holds.");
      return;
    }
  }
  state.turn += 1;
  state.energy = ENERGY_MAX;
  state.clashUsed = false;
  state.riffBonus = 0;
  drawUpTo(state, rng, DRAW_PER_TURN);
  if (state.turn >= ENRAGE_START_TURN) {
    state.log.push(
      `Mid+ enrage: floor Power +${enragePower(state.turn)} this turn.`,
    );
  }
  state.log.push(
    `Turn ${state.turn}. Energy ${state.energy}. Draw ${DRAW_PER_TURN} / hand cap ${HAND_CAP}.`,
  );
}

export function applyAction(
  state: ClashState,
  ctx: ClashContext,
  action: ClashAction,
): ClashState {
  if (state.status !== "active") {
    throw new Error("This clash is already over.");
  }
  const next = structuredClone(state) as ClashState;
  const rng = SeededRng.restore(next.rngSeed, next.rngCount);
  switch (action.type) {
    case "riff":
      playRiff(next, rng, action.iid);
      break;
    case "declare":
      playTake(next, ctx, rng, action.iid, true);
      break;
    case "hold":
      playTake(next, ctx, rng, action.iid, false);
      break;
    case "shelf": {
      const inst = findInHand(next, action.iid);
      if (!inst) throw new Error("Card is not in hand.");
      spendFromHand(next, action.iid);
      next.shelf.push(inst);
      next.log.push(`Shelved ${getCard(inst.cardId).name}.`);
      break;
    }
    case "end":
      endTurn(next, rng);
      break;
    default:
      throw new Error("Unknown action.");
  }
  persistRng(next, rng);
  if (next.log.length > 40) next.log = next.log.slice(-40);
  return next;
}

export function clashView(state: ClashState, ctx: ClashContext) {
  const ranks = Object.fromEntries(ctx.owned.map((o) => [o.cardId, o.rank]));
  const resolve = (c: CardInst) => {
    const def = getCard(c.cardId);
    return {
      ...c,
      name: def.name,
      type: def.type,
      energy: def.energy,
      power: def.power + rankPowerBonus(ranks[c.cardId] ?? 1),
      keywords: def.keywords,
      text: def.text,
    };
  };
  const { draw, shelf, ...rest } = state;
  return {
    ...rest,
    hand: state.hand.map(resolve),
    drawCount: draw.length,
    shelfCount: shelf.length,
    energyHint: "Leftover energy → Riffs. 1 clash/turn.",
    bondPerMessage: BOND_PER_MESSAGE,
  };
}
