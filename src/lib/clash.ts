import {
  cardsInSet,
  getAnyCard,
  getCard,
  remapCardId,
  STARTER_IDS,
  SETS,
  type CardDef,
} from "./cards";
import { SeededRng } from "./rng";
import {
  BOND_PER_MESSAGE,
  clashCut,
  CLASH_CUT_MULT,
  DRAW_PER_TURN,
  ENERGY_MAX,
  ENRAGE_POWER_PER_TURN,
  ENRAGE_START_TURN,
  FLOOR_BAND_DOOR,
  FLOOR_PULSE_FACTOR,
  floorPulseFromYardstick,
  HAND_CAP,
  OVERREACH_PULSE_COST,
  raiseStakesMultiplier,
  rankPowerBonus,
  sharedPulseMax,
  SILENCE_PRESS,
  STEADY_BREATH_HEAL,
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
  playerDeclared: boolean;
  floorDeclared: boolean;
  fog: boolean;
  sealed: boolean;
  secondFirst: boolean;
  secondFirstCancelled: boolean;
  sharedDelta: number;
  floorDelta: number;
  note: string;
};

export type ClashState = {
  id: string;
  playerId: string;
  floorId: "door-1";
  floorName: string;
  floorBand: number;
  floorPulseFactor: number;
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
  denyArmed: boolean;
  raiseStakes: boolean;
  steadyBreathUsed: boolean;
  peekedIntent: string | null;
  lastEnemyDeclared: boolean;
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
  "door_jab",
  "latch_guard",
  "keep_out",
  "door_jab",
  "floor_hook",
] as const;

export function floorScriptedTake(turn: number): string {
  return FLOOR_ROTATION[(turn - 1) % FLOOR_ROTATION.length]!;
}

export function setBonuses(ownedIds: string[]): {
  power: number;
  riffDiscount: number;
  holdPower: number;
  complete: Record<string, boolean>;
} {
  const owned = new Set(ownedIds.map(remapCardId));
  const complete: Record<string, boolean> = {};
  let power = 0;
  let riffDiscount = 0;
  let holdPower = 0;
  for (const set of SETS) {
    const cards = cardsInSet(set.id);
    const done = cards.every((c) => owned.has(c.id));
    complete[set.id] = done;
    if (!done) continue;
    if (set.id === "takes-core") power += 1;
    if (set.id === "riffs-core") riffDiscount += 1;
    if (set.id === "unlock-edge") holdPower += 1;
  }
  return { power, riffDiscount, holdPower, complete };
}

/** Battle deck is the locked 8 Takes + 5 Riffs. Unlocks stay in collection. */
export function buildDeck(_owned: OwnedCard[], rng: SeededRng): CardInst[] {
  const insts: CardInst[] = STARTER_IDS.map((cardId, i) => ({
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
  const pulse = sharedPulseMax(
    ctx.playerLevel,
    ctx.companionLevel,
    ctx.bond,
  );
  const floorMax = floorPulseFromYardstick(
    pulse.playerSegment,
    FLOOR_BAND_DOOR,
    FLOOR_PULSE_FACTOR,
  );
  const deck = buildDeck(ctx.owned, rng);
  const state: ClashState = {
    id: clashId,
    playerId: ctx.playerId,
    floorId: "door-1",
    floorName: "The Door",
    floorBand: FLOOR_BAND_DOOR,
    floorPulseFactor: FLOOR_PULSE_FACTOR,
    turn: 1,
    energy: ENERGY_MAX,
    energyMax: ENERGY_MAX,
    sharedPulse: pulse.max,
    sharedPulseMax: pulse.max,
    playerSegment: pulse.playerSegment,
    companionSegment: pulse.companionSegment,
    floorPulse: floorMax,
    floorPulseMax: floorMax,
    hand: [],
    draw: deck,
    shelf: [],
    clashUsed: false,
    riffBonus: 0,
    nextClashBonus: 0,
    denyArmed: false,
    raiseStakes: false,
    steadyBreathUsed: false,
    peekedIntent: null,
    lastEnemyDeclared: false,
    status: "active",
    log: [
      `Floor 1 — The Door. Shared Pulse ${pulse.max} vs Floor Pulse ${floorMax} (player PulseMax ${pulse.playerSegment} × band ${FLOOR_BAND_DOOR} × ${FLOOR_PULSE_FACTOR}).`,
      "1 clash/turn. Declare = face-up First. Hold = face-down Second. Leftover energy → Riffs. Shelf = discard.",
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
  const id = remapCardId(cardId);
  return ctx.owned.find((o) => remapCardId(o.cardId) === id)?.rank ?? 1;
}

function addClashPower(state: ClashState, n: number): void {
  if (state.clashUsed) state.nextClashBonus += n;
  else state.riffBonus += n;
}

/**
 * Floor commits a Take. On Declare, printed Power is visible and the floor
 * may switch. On Hold, Power is fogged — same rng path regardless of the
 * held card.
 */
export function commitFloorTake(
  state: ClashState,
  rng: SeededRng,
  revealedPrintedPower: number | null,
): string {
  const rotation = floorScriptedTake(state.turn);
  const wild = rng.next() < 0.18;
  let pick = wild ? rng.pick([...FLOOR_ROTATION]) : rotation;
  if (revealedPrintedPower != null) {
    if (revealedPrintedPower >= 10) pick = "latch_guard";
    else if (revealedPrintedPower <= 7) pick = "keep_out";
  }
  return pick;
}

export function enragePower(turn: number): number {
  if (turn < ENRAGE_START_TURN) return 0;
  return (turn - (ENRAGE_START_TURN - 1)) * ENRAGE_POWER_PER_TURN;
}

export type ClashComputeInput = {
  playerCardId: string | null;
  floorCardId: string;
  /** Lead/React: who is First. Declare button sets this true. */
  playerIsFirst: boolean;
  playerDeclared: boolean;
  floorDeclared: boolean;
  playerRank: number;
  riffBonus: number;
  nextClashBonus: number;
  setPower: number;
  setHoldPower: number;
  denyArmed: boolean;
  raiseStakes: boolean;
  sharedPulse: number;
  sharedPulseMax: number;
  floorPulse: number;
  floorPulseMax: number;
  lastEnemyDeclared: boolean;
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
  secondFirst: boolean;
  secondFirstCancelled: boolean;
  playerDeclared: boolean;
  floorDeclared: boolean;
};

type TriggerKind = "cancel" | "swagger" | "defend" | "heal";
type TriggerOwner = "player" | "floor";
type Trigger = {
  owner: TriggerOwner;
  kind: TriggerKind;
  amount?: number;
};

function printedPower(def: CardDef, rank: number, rng: SeededRng): number {
  if (def.chaosMin != null && def.chaosMax != null) {
    return rng.int(def.chaosMin, def.chaosMax) + rankPowerBonus(rank);
  }
  return def.power + rankPowerBonus(rank);
}

function cardTextPower(
  def: CardDef,
  held: boolean,
  input: ClashComputeInput,
): number {
  let extra = 0;
  if (
    def.id === "comeback_line" &&
    held &&
    input.sharedPulseMax > 0 &&
    input.sharedPulse < input.sharedPulseMax * 0.5
  ) {
    extra += 4;
  }
  if (def.id === "exact_count" && input.floorPulseMax > 0) {
    const pct = input.floorPulse / input.floorPulseMax;
    if (pct >= 0.4 && pct <= 0.6) extra += 3;
  }
  if (def.id === "finisher_bite" && input.floorPulseMax > 0) {
    const pct = input.floorPulse / input.floorPulseMax;
    if (pct > 0.7) extra -= 4;
  }
  if (def.id === "contrarian_echo" && input.lastEnemyDeclared) {
    extra += 4;
  }
  return extra;
}

function sideTriggers(
  def: CardDef | null,
  declared: boolean,
  owner: TriggerOwner,
  denyArmed: boolean,
): Trigger[] {
  const out: Trigger[] = [];
  if (owner === "player" && denyArmed) {
    out.push({ owner, kind: "cancel" });
  }
  if (!def) return out;
  if (declared && def.swagger > 0) {
    out.push({ owner, kind: "swagger", amount: def.swagger });
  }
  if (!declared) {
    if (def.keywords.includes("cancel")) {
      out.push({ owner, kind: "cancel" });
    }
    if (def.defend > 0) {
      out.push({ owner, kind: "defend", amount: def.defend });
    }
    if (def.id === "bitter_balm") {
      out.push({ owner, kind: "heal", amount: 8 });
    }
  }
  return out;
}

export function computeClash(input: ClashComputeInput): ClashComputeResult {
  const playerDef = input.playerCardId ? getAnyCard(input.playerCardId) : null;
  const floorDef = getAnyCard(input.floorCardId);
  const playerDeclared = input.playerDeclared && Boolean(playerDef);
  const floorDeclared = input.floorDeclared;
  const playerHeld = Boolean(playerDef) && !playerDeclared;
  const playerIsFirst = Boolean(playerDef) && input.playerIsFirst;
  const notes: string[] = [];

  let pPower = playerDef
    ? printedPower(playerDef, input.playerRank, input.rng)
    : 0;
  let fPower = printedPower(floorDef, 1, input.rng) + enragePower(input.turn);

  if (playerDef) {
    pPower += cardTextPower(playerDef, playerHeld, input);
  }

  pPower += input.riffBonus + input.nextClashBonus + input.setPower;
  if (playerHeld) pPower += input.setHoldPower;

  // Deny cancels an opposing Declare (priority steal) as "next trigger".
  const firstDeclared = playerIsFirst ? playerDeclared : floorDeclared;
  const firstDeclareCancelled =
    Boolean(playerDef) &&
    !playerIsFirst &&
    floorDeclared &&
    input.denyArmed;
  const firstSteals = firstDeclared && !firstDeclareCancelled;
  const secondFirst = Boolean(playerDef) && !firstSteals;
  const secondFirstCancelled = firstSteals && firstDeclared;

  if (firstDeclareCancelled) {
    notes.push("Deny cancelled the First Declare. Second triggers first.");
  } else if (firstSteals) {
    notes.push("Uncancelled Declare steals trigger priority.");
  } else if (playerDef) {
    notes.push("Both Hold / no Declare: Second triggers first.");
  }

  const playerTriggers = sideTriggers(
    playerDef,
    playerDeclared,
    "player",
    input.denyArmed,
  );
  const floorTriggers = sideTriggers(
    floorDef,
    floorDeclared,
    "floor",
    false,
  );
  const firstTriggers = playerIsFirst ? playerTriggers : floorTriggers;
  const secondTriggers = playerIsFirst ? floorTriggers : playerTriggers;
  const queue = secondFirst
    ? [...secondTriggers, ...firstTriggers]
    : [...firstTriggers, ...secondTriggers];

  let cancelArmedFor: TriggerOwner | null = null;
  let playerDefend = 0;
  let floorDefend = 0;
  let heal = 0;

  for (const t of queue) {
    if (cancelArmedFor === t.owner && t.kind !== "cancel") {
      cancelArmedFor = null;
      notes.push(
        `Cancel stripped ${t.owner === "player" ? "your" : "floor"} ${t.kind}.`,
      );
      continue;
    }
    switch (t.kind) {
      case "cancel":
        cancelArmedFor = t.owner === "player" ? "floor" : "player";
        notes.push(
          `${t.owner === "player" ? "Your" : "Floor"} Cancel armed.`,
        );
        break;
      case "swagger":
        if (t.owner === "player") {
          pPower += t.amount ?? 0;
          notes.push(`Swagger +${t.amount}.`);
        } else {
          fPower += t.amount ?? 0;
          notes.push(`Floor Swagger +${t.amount}.`);
        }
        break;
      case "defend":
        if (t.owner === "player") {
          playerDefend = t.amount ?? 0;
          notes.push(`Flip: Defend ${playerDefend}.`);
        } else {
          floorDefend = t.amount ?? 0;
          notes.push(`Floor Flip: Defend ${floorDefend}.`);
        }
        break;
      case "heal":
        if (t.owner === "player") {
          heal += t.amount ?? 0;
          notes.push(`Flip: heal ${t.amount}.`);
        }
        break;
      default:
        break;
    }
  }

  const multiplier = raiseStakesMultiplier(input.raiseStakes);
  const cut = clashCut(pPower - fPower, multiplier);

  let sharedDelta = 0;
  let floorDelta = 0;

  if (pPower < fPower) {
    const dmg = Math.max(0, cut - playerDefend);
    sharedDelta = -dmg;
  } else if (pPower > fPower) {
    const dmg = Math.max(0, cut - floorDefend);
    floorDelta = -dmg;
  } else {
    notes.push("Powers tied. No cut.");
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
    secondFirst,
    secondFirstCancelled,
    playerDeclared,
    floorDeclared,
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

function publicDeclarePower(def: CardDef, rank: number): number {
  if (def.chaosMin != null && def.chaosMax != null) {
    return def.chaosMax + rankPowerBonus(rank);
  }
  return def.power + def.swagger + rankPowerBonus(rank);
}

function resolveDeclaredClash(
  state: ClashState,
  ctx: ClashContext,
  rng: SeededRng,
  playerCardId: string | null,
  playerDeclared: boolean,
): void {
  const playerIsFirst = playerDeclared;
  const floorDeclared = !playerDeclared;
  const printed =
    playerDeclared && playerCardId
      ? publicDeclarePower(
          getAnyCard(playerCardId),
          rankOf(ctx, playerCardId),
        )
      : null;
  const floorId = commitFloorTake(state, rng, printed);
  const floorDef = getAnyCard(floorId);
  const bonuses = setBonuses(ctx.owned.map((o) => o.cardId));
  const result = computeClash({
    playerCardId,
    floorCardId: floorId,
    playerIsFirst,
    playerDeclared,
    floorDeclared,
    playerRank: playerCardId ? rankOf(ctx, playerCardId) : 1,
    riffBonus: state.riffBonus,
    nextClashBonus: state.nextClashBonus,
    setPower: bonuses.power,
    setHoldPower: bonuses.holdPower,
    denyArmed: state.denyArmed,
    raiseStakes: state.raiseStakes,
    sharedPulse: state.sharedPulse,
    sharedPulseMax: state.sharedPulseMax,
    floorPulse: state.floorPulse,
    floorPulseMax: state.floorPulseMax,
    lastEnemyDeclared: state.lastEnemyDeclared,
    turn: state.turn,
    rng,
  });

  const playerName = playerCardId ? getAnyCard(playerCardId).name : "Silence";
  const fog = Boolean(playerCardId) && !playerDeclared;
  const stance = playerCardId
    ? playerDeclared
      ? "Declare (face-up, First)"
      : "Hold (face-down, Second)"
    : "no Take";

  applyPulse(state, result.sharedDelta, result.floorDelta, result.heal);

  const fogNote = fog ? "Held sealed until Flip. " : "Declare public before Flip. ";
  state.lastClash = {
    playerCard: playerCardId,
    playerCardName: playerName,
    floorCard: floorId,
    floorCardName: floorDef.name,
    playerPower: result.playerPower,
    floorPower: result.floorPower,
    cut: result.cut,
    multiplier: result.multiplier,
    playerLeads: Boolean(playerCardId) && playerIsFirst,
    playerDeclared: result.playerDeclared,
    floorDeclared: result.floorDeclared,
    fog,
    sealed: fog,
    secondFirst: result.secondFirst,
    secondFirstCancelled: result.secondFirstCancelled,
    sharedDelta: result.sharedDelta + result.heal,
    floorDelta: result.floorDelta,
    note: `${fogNote}${result.note}`.trim(),
  };

  const target =
    result.playerPower === result.floorPower
      ? "nobody"
      : result.playerPower > result.floorPower
        ? "the floor"
        : "you";
  state.log.push(
    `T${state.turn} ${stance}: ${playerName} ${result.playerPower} vs ${floorDef.name} ${result.floorPower} → cut ${result.cut} (×${result.multiplier}) hits ${target}. ${state.lastClash.note}`.trim(),
  );

  state.riffBonus = 0;
  state.nextClashBonus = 0;
  state.denyArmed = false;
  state.raiseStakes = false;
  state.peekedIntent = null;
  state.lastEnemyDeclared = result.floorDeclared;
  state.clashUsed = true;
}

function riffCost(energy: number, discount: number): number {
  return Math.max(0, energy - discount);
}

function playRiff(
  state: ClashState,
  ctx: ClashContext,
  rng: SeededRng,
  iid: string,
): void {
  const inst = findInHand(state, iid);
  if (!inst) throw new Error("Card is not in hand.");
  const def = getCard(inst.cardId);
  if (def.type !== "riff") throw new Error("That card is a Take, not a Riff.");
  const discount = setBonuses(ctx.owned.map((o) => o.cardId)).riffDiscount;
  const cost = riffCost(def.energy, discount);
  if (state.energy < cost) throw new Error("Not enough energy.");

  if (def.id === "second_thought" && state.shelf.length === 0) {
    throw new Error("Shelf is empty.");
  }
  if (def.id === "steady_breath" && state.steadyBreathUsed) {
    throw new Error("Steady Breath is once per turn.");
  }
  if (def.id === "overreach_riff" && state.sharedPulse < OVERREACH_PULSE_COST) {
    throw new Error("Not enough Shared Pulse to Overreach.");
  }

  state.energy -= cost;
  spendFromHand(state, iid);
  state.shelf.push(inst);

  switch (def.id) {
    case "warm_up": {
      const before = state.hand.length;
      drawUpTo(state, rng, 1);
      state.log.push(
        state.hand.length > before
          ? "Warm-Up: drew 1."
          : "Warm-Up: hand is full (cap 7).",
      );
      break;
    }
    case "steady_breath": {
      state.steadyBreathUsed = true;
      const before = state.sharedPulse;
      state.sharedPulse = Math.min(
        state.sharedPulseMax,
        state.sharedPulse + STEADY_BREATH_HEAL,
      );
      state.log.push(`Steady Breath: +${state.sharedPulse - before} Pulse.`);
      break;
    }
    case "read_ahead": {
      const intent = floorScriptedTake(state.turn);
      state.peekedIntent = intent;
      state.log.push(
        `Read Ahead: floor intends ${getAnyCard(intent).name} (scripted).`,
      );
      break;
    }
    case "amp_next":
      addClashPower(state, 3);
      state.log.push("Amp: +3 next Take Power.");
      break;
    case "deny":
      state.denyArmed = true;
      state.log.push("Deny: Cancel Swagger or the next trigger.");
      break;
    case "second_thought": {
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
    case "raise_stakes":
      state.raiseStakes = true;
      state.log.push("Raise Stakes: next cut ×1.25 both pools.");
      break;
    case "overreach_riff":
      state.sharedPulse -= OVERREACH_PULSE_COST;
      state.energy += 1;
      state.log.push(
        `Overreach: +1 Energy this turn, paid ${OVERREACH_PULSE_COST} Shared Pulse.`,
      );
      if (state.sharedPulse <= 0) {
        state.status = "lost";
        state.log.push("Shared Pulse broke. The Door holds.");
      }
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
  declare: boolean,
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
  resolveDeclaredClash(state, ctx, rng, def.id, declare);
}

function endTurn(state: ClashState, rng: SeededRng): void {
  if (state.status !== "active") return;
  if (!state.clashUsed) {
    const affordableTake = state.hand.some((c) => {
      const def = getCard(c.cardId);
      return def.type === "take" && def.energy <= state.energy;
    });
    if (affordableTake) {
      throw new Error("Declare or Hold a Take before ending the turn.");
    }
    state.sharedPulse = Math.max(0, state.sharedPulse - SILENCE_PRESS);
    state.log.push(
      `No Take to play. The Door presses ${SILENCE_PRESS}. Leftover energy is gone.`,
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
  state.steadyBreathUsed = false;
  state.peekedIntent = null;
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
      playRiff(next, ctx, rng, action.iid);
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

export function remapClashState(state: ClashState): ClashState {
  const inst = (c: CardInst) => ({ ...c, cardId: remapCardId(c.cardId) });
  const last = state.lastClash;
  return {
    ...state,
    denyArmed: state.denyArmed ?? false,
    raiseStakes: state.raiseStakes ?? false,
    steadyBreathUsed: state.steadyBreathUsed ?? false,
    peekedIntent: state.peekedIntent ? remapCardId(state.peekedIntent) : null,
    lastEnemyDeclared: state.lastEnemyDeclared ?? false,
    hand: state.hand.map(inst),
    draw: state.draw.map(inst),
    shelf: state.shelf.map(inst),
    lastClash: last
      ? {
          ...last,
          playerCard: last.playerCard ? remapCardId(last.playerCard) : null,
          floorCard: remapCardId(last.floorCard),
          playerDeclared: last.playerDeclared ?? last.playerLeads,
          floorDeclared: last.floorDeclared ?? !last.playerLeads,
          sealed: last.sealed ?? last.fog,
        }
      : null,
  };
}

export function clashView(state: ClashState, ctx: ClashContext) {
  const ranks = Object.fromEntries(
    ctx.owned.map((o) => [remapCardId(o.cardId), o.rank]),
  );
  const resolve = (c: CardInst) => {
    const def = getCard(c.cardId);
    const rankBonus = rankPowerBonus(ranks[remapCardId(c.cardId)] ?? 1);
    const shownPower =
      def.chaosMin != null && def.chaosMax != null
        ? Math.floor((def.chaosMin + def.chaosMax) / 2) + rankBonus
        : def.power + rankBonus;
    return {
      ...c,
      cardId: remapCardId(c.cardId),
      name: def.name,
      type: def.type,
      energy: def.energy,
      power: shownPower,
      swagger: def.swagger,
      defend: def.defend,
      chaosMin: def.chaosMin,
      chaosMax: def.chaosMax,
      stance: def.stance,
      keywords: def.keywords,
      text: def.text,
    };
  };
  const { draw, shelf, ...rest } = state;
  const peekDef = state.peekedIntent
    ? getAnyCard(state.peekedIntent)
    : null;
  return {
    ...rest,
    hand: state.hand.map(resolve),
    drawCount: draw.length,
    shelfCount: shelf.length,
    peekedIntent: peekDef
      ? { id: peekDef.id, name: peekDef.name }
      : null,
    energyHint: "Leftover energy → Riffs. 1 clash/turn.",
    bondPerMessage: BOND_PER_MESSAGE,
    cutRule: `|PowerDiff| × ${CLASH_CUT_MULT}`,
  };
}
