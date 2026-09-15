import { describe, expect, it } from "vitest";
import {
  CARDS,
  remapCardId,
  STARTER_IDS,
  STARTER_RIFF_IDS,
  STARTER_TAKE_IDS,
  UNLOCK_IDS,
} from "./cards";
import {
  applyAction,
  computeClash,
  createClashState,
  drawUpTo,
  setBonuses,
  type ClashContext,
  type ClashState,
} from "./clash";
import { replyToChat } from "./chat";
import {
  bondAuraPower,
  bondAuraPulse,
  clashCut,
  CLASH_CUT_MULT,
  defendPartial,
  DRAW_PER_TURN,
  floorPulseFromShared,
  FLOOR_BAND_DOOR,
  FLOOR_PULSE_FACTOR,
  HAND_CAP,
  PULSE_COMPANION,
  PULSE_PLAYER,
  RAISE_STAKES_MULT,
  sharedPulseMax,
  SWAGGER_BONUS_CUT,
  OVERREACH_LOSE_CUT,
  OVERREACH_POWER,
  BOND_PER_MESSAGE,
  FRAGMENTS_PER_MESSAGE,
} from "./formulas";
import { rollPack } from "./pack";
import { SeededRng } from "./rng";

const starterOwned = STARTER_IDS.map((cardId) => ({ cardId, rank: 1 }));

function ctx(over: Partial<ClashContext> = {}): ClashContext {
  return {
    playerId: "p1",
    playerLevel: 1,
    companionLevel: 1,
    bond: 0,
    owned: starterOwned,
    ...over,
  };
}

function blankInput(over: Partial<Parameters<typeof computeClash>[0]> = {}) {
  return {
    playerCardId: "straight_claim",
    floorCardId: "keep_out",
    playerLeads: true,
    playerRank: 1,
    riffBonus: 0,
    nextClashBonus: 0,
    setPower: 0,
    setHoldPower: 0,
    bondPower: 0,
    overreachArmed: false,
    denyArmed: false,
    raiseStakes: false,
    sharedPulse: 115,
    floorPulse: 90,
    turn: 1,
    rng: new SeededRng(1),
    ...over,
  };
}

describe("starter kit canon", () => {
  it("uses snake_case bible ids (amp_next, overreach_riff)", () => {
    expect(STARTER_TAKE_IDS).toEqual([
      "opening_jab",
      "guarded_point",
      "straight_claim",
      "trap_clause",
      "loud_correct",
      "comeback_line",
      "swagger_hook",
      "exact_count",
    ]);
    expect(STARTER_RIFF_IDS).toEqual([
      "warm_up",
      "steady_breath",
      "read_ahead",
      "amp_next",
      "deny",
    ]);
    expect(UNLOCK_IDS).toEqual([
      "sideways_cut",
      "finisher_bite",
      "bitter_balm",
      "contrarian_echo",
      "second_thought",
      "raise_stakes",
      "overreach_riff",
    ]);
    expect(CARDS).toHaveLength(20);
    expect(remapCardId("amp")).toBe("amp_next");
    expect(remapCardId("overreach")).toBe("overreach_riff");
    expect(remapCardId("opening-jab")).toBe("opening_jab");
  });

  it("locks Take energy/power/keywords to the v1 kit table", () => {
    const kit: Array<{
      id: string;
      energy: number;
      power: number;
      keywords: string[];
    }> = [
      { id: "opening_jab", energy: 1, power: 8, keywords: ["lead"] },
      { id: "guarded_point", energy: 1, power: 6, keywords: ["defend"] },
      { id: "straight_claim", energy: 2, power: 12, keywords: [] },
      { id: "trap_clause", energy: 2, power: 7, keywords: ["cancel"] },
      { id: "loud_correct", energy: 1, power: 8, keywords: ["react"] },
      { id: "comeback_line", energy: 2, power: 9, keywords: [] },
      { id: "swagger_hook", energy: 2, power: 10, keywords: ["swagger"] },
      { id: "exact_count", energy: 2, power: 11, keywords: [] },
      { id: "sideways_cut", energy: 1, power: 9, keywords: ["chaos"] },
      { id: "finisher_bite", energy: 3, power: 16, keywords: [] },
      { id: "bitter_balm", energy: 1, power: 5, keywords: ["defend"] },
      { id: "contrarian_echo", energy: 2, power: 8, keywords: ["react"] },
    ];
    for (const row of kit) {
      const card = CARDS.find((c) => c.id === row.id);
      expect(card, row.id).toMatchObject(row);
    }
  });
});

describe("clash math locks", () => {
  it("cut = PowerDiff × 5", () => {
    expect(clashCut(12 - 10)).toBe(10);
    const r = computeClash(blankInput());
    expect(r.playerPower).toBe(12);
    expect(r.floorPower).toBe(10);
    expect(r.cut).toBe(10);
    expect(r.multiplier).toBe(CLASH_CUT_MULT);
    expect(r.floorDelta).toBe(-10);
  });

  it("Defend takes half the cut (ceil)", () => {
    const r = computeClash(
      blankInput({ playerCardId: "guarded_point", floorCardId: "keep_out" }),
    );
    expect(r.cut).toBe(20);
    expect(r.sharedDelta).toBe(-defendPartial(20));
  });

  it("Swagger adds 10 cut on a win", () => {
    const r = computeClash(
      blankInput({ playerCardId: "swagger_hook", floorCardId: "door_jab" }),
    );
    expect(r.cut).toBe(15);
    expect(r.floorDelta).toBe(-(15 + SWAGGER_BONUS_CUT));
  });

  it("First Cancel (Declare Trap Clause) strips Second Defend", () => {
    const withCancel = computeClash(
      blankInput({
        playerCardId: "trap_clause",
        floorCardId: "latch_guard",
        playerLeads: true,
      }),
    );
    expect(withCancel.secondFirstCancelled).toBe(true);
    expect(withCancel.floorDelta).toBe(-5);

    const noCancel = computeClash(
      blankInput({ playerCardId: "straight_claim", floorCardId: "latch_guard" }),
    );
    expect(noCancel.floorDelta).toBe(-15);
  });

  it("Second-first Cancel (Hold Trap Clause) still strips First Defend", () => {
    const held = computeClash(
      blankInput({
        playerCardId: "trap_clause",
        floorCardId: "latch_guard",
        playerLeads: false,
      }),
    );
    expect(held.secondFirst).toBe(true);
    expect(held.secondFirstCancelled).toBe(false);
    expect(held.floorDelta).toBe(-5);
  });

  it("Overreach adds power and extra lose cut", () => {
    const win = computeClash(
      blankInput({
        playerCardId: "opening_jab",
        floorCardId: "door_jab",
        overreachArmed: true,
      }),
    );
    expect(win.playerPower).toBe(8 + 2 + OVERREACH_POWER);

    const lose = computeClash(
      blankInput({
        playerCardId: "guarded_point",
        floorCardId: "keep_out",
        overreachArmed: true,
        turn: 6,
      }),
    );
    expect(lose.playerPower).toBeLessThan(lose.floorPower);
    expect(lose.sharedDelta).toBe(
      -(defendPartial(lose.cut) + OVERREACH_LOSE_CUT),
    );
  });

  it("Raise Stakes uses ×7", () => {
    const r = computeClash(blankInput({ raiseStakes: true }));
    expect(r.multiplier).toBe(RAISE_STAKES_MULT);
    expect(r.cut).toBe(2 * 7);
  });

  it("Declare gets Lead; Hold gets Second-first React (floor is First)", () => {
    const lead = computeClash(
      blankInput({
        playerCardId: "opening_jab",
        floorCardId: "door_jab",
        playerLeads: true,
      }),
    );
    expect(lead.playerPower).toBe(10);
    expect(lead.floorPower).toBe(7);
    expect(lead.secondFirst).toBe(false);

    const declareReact = computeClash(
      blankInput({
        playerCardId: "loud_correct",
        floorCardId: "door_jab",
        playerLeads: true,
      }),
    );
    expect(declareReact.playerPower).toBe(8);
    expect(declareReact.secondFirst).toBe(false);

    const hold = computeClash(
      blankInput({
        playerCardId: "loud_correct",
        floorCardId: "door_jab",
        playerLeads: false,
      }),
    );
    expect(hold.playerPower).toBe(12);
    expect(hold.floorPower).toBe(9);
    expect(hold.secondFirst).toBe(true);
  });

  it("Deny on Declare counts as First Cancel", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "straight_claim",
        floorCardId: "latch_guard",
        playerLeads: true,
        denyArmed: true,
      }),
    );
    expect(r.secondFirstCancelled).toBe(true);
    expect(r.floorDelta).toBe(-30);
  });

  it("Contrarian Echo is Second-first only", () => {
    const hold = computeClash(
      blankInput({
        playerCardId: "contrarian_echo",
        floorCardId: "keep_out",
        playerLeads: false,
      }),
    );
    expect(hold.secondFirst).toBe(true);
    expect(hold.playerPower).toBe(11);

    const declare = computeClash(
      blankInput({
        playerCardId: "contrarian_echo",
        floorCardId: "keep_out",
        playerLeads: true,
      }),
    );
    expect(declare.secondFirst).toBe(false);
    expect(declare.playerPower).toBe(8);
  });

  it("Exact Count ignores Chaos jitter on its own Power", () => {
    const rngA = new SeededRng(42);
    const rngB = new SeededRng(42);
    const exact = computeClash(
      blankInput({
        playerCardId: "exact_count",
        floorCardId: "door_jab",
        rng: rngA,
      }),
    );
    const chaos = computeClash(
      blankInput({
        playerCardId: "sideways_cut",
        floorCardId: "door_jab",
        rng: rngB,
      }),
    );
    expect(exact.playerPower).toBe(11);
    expect(chaos.playerPower).toBeGreaterThanOrEqual(6);
    expect(chaos.playerPower).toBeLessThanOrEqual(12);
  });
});

describe("Declare vs Hold fog", () => {
  it("Hold does not reveal Power before floor commit (same floor card for different Takes)", () => {
    const base = createClashState(ctx(), 5, "fog");
    const a = structuredClone(base) as ClashState;
    const b = structuredClone(base) as ClashState;
    a.hand = [{ iid: "t", cardId: "opening_jab" }];
    b.hand = [{ iid: "t", cardId: "finisher_bite" }];
    const holdA = applyAction(a, ctx(), { type: "hold", iid: "t" });
    const holdB = applyAction(b, ctx(), { type: "hold", iid: "t" });
    expect(holdA.lastClash?.fog).toBe(true);
    expect(holdB.lastClash?.fog).toBe(true);
    expect(holdA.lastClash?.floorCard).toBe(holdB.lastClash?.floorCard);
    expect(holdA.lastClash?.playerLeads).toBe(false);
  });

  it("Declare is face-up so the floor can switch on printed Power", () => {
    const base = createClashState(ctx(), 5, "see");
    const high = structuredClone(base) as ClashState;
    const low = structuredClone(base) as ClashState;
    high.hand = [{ iid: "t", cardId: "finisher_bite" }];
    low.hand = [{ iid: "t", cardId: "guarded_point" }];
    const dHigh = applyAction(high, ctx(), { type: "declare", iid: "t" });
    const dLow = applyAction(low, ctx(), { type: "declare", iid: "t" });
    expect(dHigh.lastClash?.fog).toBe(false);
    expect(dHigh.lastClash?.playerLeads).toBe(true);
    expect(dHigh.lastClash?.floorCard).toBe("latch_guard");
    expect(dLow.lastClash?.floorCard).toBe("keep_out");
  });
});

describe("shared pulse + floor pulse + sets", () => {
  it("is player-weighted a > b and ignores set Pulse", () => {
    expect(PULSE_PLAYER).toBeGreaterThan(PULSE_COMPANION);
    const p = sharedPulseMax(1, 1, 0);
    expect(p.max).toBe(PULSE_PLAYER + PULSE_COMPANION);
  });

  it("bond aura soft-diminishes", () => {
    const d1 = bondAuraPulse(20) - bondAuraPulse(0);
    const d2 = bondAuraPulse(200) - bondAuraPulse(180);
    expect(d1).toBeGreaterThan(d2);
    expect(bondAuraPulse(10_000)).toBeLessThanOrEqual(24);
    expect(bondAuraPower(10_000)).toBeLessThanOrEqual(6);
  });

  it("set synergies never grant Shared Pulse; Power/control only", () => {
    const none = setBonuses([]);
    expect(none.power).toBe(0);
    expect(none.riffDiscount).toBe(0);
    expect(none.holdPower).toBe(0);
    expect(setBonuses(STARTER_TAKE_IDS.slice(0, 4)).power).toBe(0);
    expect(setBonuses(STARTER_TAKE_IDS).power).toBe(1);
    expect(setBonuses(STARTER_RIFF_IDS).riffDiscount).toBe(1);
    expect(setBonuses(STARTER_RIFF_IDS).power).toBe(0);
    expect(setBonuses(UNLOCK_IDS).holdPower).toBe(1);
    const withSets = createClashState(ctx(), 1, "sets");
    const empty = createClashState(
      ctx({ owned: [] }),
      1,
      "nosets",
    );
    expect(withSets.sharedPulseMax).toBe(empty.sharedPulseMax);
  });

  it("Floor Pulse is snapshotted from Shared PulseMax × band × factor", () => {
    const pulse = sharedPulseMax(1, 1, 0);
    expect(floorPulseFromShared(pulse.max)).toBe(
      Math.round(pulse.max * FLOOR_BAND_DOOR * FLOOR_PULSE_FACTOR),
    );
    const state = createClashState(ctx(), 1, "fp");
    expect(state.floorPulseMax).toBe(floorPulseFromShared(state.sharedPulseMax));
    expect(state.floorBand).toBe(1);
    const bonded = createClashState(ctx({ bond: 60 }), 1, "fp2");
    expect(bonded.sharedPulseMax).toBeGreaterThan(115);
    expect(bonded.floorPulseMax).toBe(
      floorPulseFromShared(bonded.sharedPulseMax),
    );
    expect(bonded.floorPulseMax).not.toBe(90);
  });

  it("Breathwork discounts Riff energy", () => {
    const state = createClashState(ctx(), 1, "disc");
    state.hand = [{ iid: "r1", cardId: "warm_up" }];
    state.energy = 0;
    const after = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    expect(after.energy).toBe(0);
    expect(after.log.some((l) => l.includes("Warm-Up"))).toBe(true);
  });
});

describe("turn / hand rules", () => {
  it("draws 3 and never exceeds hand cap 7", () => {
    const state = createClashState(ctx(), 7, "c1");
    expect(state.hand.length).toBe(DRAW_PER_TURN);
    expect(state.energy).toBe(3);
    const rng = new SeededRng(9);
    state.hand = Array.from({ length: 6 }, (_, i) => ({
      iid: `h${i}`,
      cardId: "opening_jab",
    }));
    drawUpTo(state, rng, 3);
    expect(state.hand.length).toBe(HAND_CAP);
  });

  it("allows only one clash per turn", () => {
    const state = createClashState(ctx(), 11, "c2");
    if (!state.hand.some((c) => STARTER_TAKE_IDS.includes(c.cardId))) {
      state.hand.push({ iid: "force", cardId: "opening_jab" });
    }
    const iid =
      state.hand.find((c) => STARTER_TAKE_IDS.includes(c.cardId))?.iid ??
      "force";
    const after = applyAction(state, ctx(), { type: "declare", iid });
    expect(after.clashUsed).toBe(true);
    const leftoverTake = after.hand.find((c) =>
      STARTER_TAKE_IDS.includes(c.cardId),
    );
    if (leftoverTake) {
      expect(() =>
        applyAction(after, ctx(), { type: "declare", iid: leftoverTake.iid }),
      ).toThrow(/Already clashed/);
    }
  });

  it("refuses End turn while a Take is still affordable", () => {
    const state = createClashState(ctx(), 1, "c4");
    state.hand = [{ iid: "t1", cardId: "opening_jab" }];
    state.energy = 3;
    expect(() => applyAction(state, ctx(), { type: "end" })).toThrow(
      /Declare or Hold/,
    );
  });
});

describe("chat rate R", () => {
  it("always awards the same bond + fragments", () => {
    const a = replyToChat({
      companionId: "vex",
      playerText: "hey",
      bond: 0,
      messageIndex: 0,
    });
    const b = replyToChat({
      companionId: "vex",
      playerText: "a much longer message about the floor",
      bond: 40,
      messageIndex: 3,
    });
    expect(a.bond).toBe(BOND_PER_MESSAGE);
    expect(a.fragments).toBe(FRAGMENTS_PER_MESSAGE);
    expect(b.bond).toBe(BOND_PER_MESSAGE);
    expect(b.fragments).toBe(FRAGMENTS_PER_MESSAGE);
  });
});

describe("pack rng", () => {
  it("first pack is 3 unique unlocks", () => {
    const grants = rollPack({
      seed: 99,
      pullIndex: 0,
      ownedIds: STARTER_IDS,
      companionId: "vex",
    });
    expect(grants).toHaveLength(3);
    const ids = grants.map((g) => g.cardId);
    expect(new Set(ids).size).toBe(3);
    expect(grants.every((g) => g.isNew)).toBe(true);
    expect(grants.every((g) => UNLOCK_IDS.includes(g.cardId))).toBe(true);
  });

  it("dupes grant dust", () => {
    const grants = rollPack({
      seed: 3,
      pullIndex: 4,
      ownedIds: [...STARTER_IDS, ...UNLOCK_IDS],
      companionId: "ember",
    });
    expect(grants.every((g) => !g.isNew)).toBe(true);
    expect(grants.every((g) => g.dust > 0)).toBe(true);
  });
});

describe("playable short fight", () => {
  it("can reduce Floor Pulse with Opening Jab after Amp", () => {
    const state = createClashState(ctx(), 1, "c3");
    state.hand = [
      { iid: "t1", cardId: "opening_jab" },
      { iid: "r1", cardId: "amp_next" },
    ];
    const afterAmp = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    const after = applyAction(afterAmp, ctx(), { type: "declare", iid: "t1" });
    expect(after.lastClash?.playerCardName).toBe("Opening Jab");
    expect(after.lastClash?.multiplier).toBe(5);
    expect(after.floorPulse).toBeLessThan(state.floorPulse);
  });
});
