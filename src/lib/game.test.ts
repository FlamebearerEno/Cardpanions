import { describe, expect, it } from "vitest";
import { cardArtSrc, companionArtSrc, FLOOR_ART, UI_ART } from "./art";
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
  floorScriptedTake,
  setBonuses,
  type ClashContext,
  type ClashState,
} from "./clash";
import { replyToChat } from "./chat";
import {
  afkIdleFragments,
  AFK_CAP_MS,
  AFK_TICK_MS,
  bondAuraPower,
  bondAuraPulse,
  clashCut,
  CLASH_CUT_MULT,
  DRAW_PER_TURN,
  floorPulseFromYardstick,
  FLOOR_BAND_DOOR,
  FLOOR_PULSE_FACTOR,
  HAND_CAP,
  OVERREACH_PULSE_COST,
  PULSE_COMPANION,
  PULSE_PLAYER,
  RAISE_STAKES_FACTOR,
  raiseStakesMultiplier,
  sharedPulseMax,
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
    playerIsFirst: true,
    playerDeclared: true,
    floorDeclared: false,
    playerRank: 1,
    riffBonus: 0,
    nextClashBonus: 0,
    setPower: 0,
    setHoldPower: 0,
    denyArmed: false,
    raiseStakes: false,
    sharedPulse: 115,
    sharedPulseMax: 115,
    floorPulse: 80,
    floorPulseMax: 80,
    lastEnemyDeclared: false,
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

  it("locks Take energy/power/effects to the bible table", () => {
    const kit: Array<{
      id: string;
      energy: number;
      power: number;
      swagger?: number;
      defend?: number;
      chaosMin?: number;
      chaosMax?: number;
    }> = [
      { id: "opening_jab", energy: 1, power: 5, swagger: 1 },
      { id: "guarded_point", energy: 1, power: 4, defend: 3 },
      { id: "straight_claim", energy: 1, power: 8 },
      { id: "trap_clause", energy: 1, power: 5 },
      { id: "loud_correct", energy: 1, power: 10 },
      { id: "comeback_line", energy: 1, power: 6 },
      { id: "swagger_hook", energy: 1, power: 7, swagger: 3 },
      { id: "exact_count", energy: 1, power: 7 },
      { id: "sideways_cut", energy: 1, power: 0, chaosMin: 6, chaosMax: 9 },
      { id: "finisher_bite", energy: 2, power: 12 },
      { id: "bitter_balm", energy: 1, power: 4 },
      { id: "contrarian_echo", energy: 1, power: 7 },
    ];
    for (const row of kit) {
      const card = CARDS.find((c) => c.id === row.id);
      expect(card, row.id).toMatchObject(row);
    }
  });

  it("locks Riff energy/effects to the bible table", () => {
    const riffs: Array<{ id: string; energy: number }> = [
      { id: "warm_up", energy: 0 },
      { id: "steady_breath", energy: 1 },
      { id: "read_ahead", energy: 1 },
      { id: "amp_next", energy: 1 },
      { id: "deny", energy: 2 },
      { id: "second_thought", energy: 1 },
      { id: "raise_stakes", energy: 1 },
      { id: "overreach_riff", energy: 0 },
    ];
    for (const row of riffs) {
      expect(CARDS.find((c) => c.id === row.id), row.id).toMatchObject(row);
    }
  });
});

describe("clash math locks", () => {
  it("cut = |PowerDiff| × 5", () => {
    expect(clashCut(8 - 10)).toBe(10);
    const r = computeClash(blankInput());
    expect(r.playerPower).toBe(8);
    expect(r.floorPower).toBe(10);
    expect(r.cut).toBe(10);
    expect(r.multiplier).toBe(CLASH_CUT_MULT);
    expect(r.sharedDelta).toBe(-10);
  });

  it("Declare Swagger +N is Power, Hold gets none", () => {
    const declared = computeClash(
      blankInput({
        playerCardId: "opening_jab",
        floorCardId: "keep_out",
        playerDeclared: true,
        playerIsFirst: true,
        floorDeclared: false,
      }),
    );
    expect(declared.playerPower).toBe(6);
    expect(declared.note).toMatch(/Swagger \+1/);

    const held = computeClash(
      blankInput({
        playerCardId: "opening_jab",
        floorCardId: "keep_out",
        playerDeclared: false,
        playerIsFirst: false,
        floorDeclared: true,
      }),
    );
    expect(held.playerPower).toBe(5);
    expect(held.note).not.toMatch(/Swagger \+1/);
  });

  it("Hold Flip Defend N subtracts from incoming cut", () => {
    const held = computeClash(
      blankInput({
        playerCardId: "guarded_point",
        floorCardId: "keep_out",
        playerDeclared: false,
        playerIsFirst: false,
        floorDeclared: true,
      }),
    );
    expect(held.playerPower).toBe(4);
    expect(held.cut).toBe(30);
    expect(held.sharedDelta).toBe(-(30 - 3));

    const declared = computeClash(
      blankInput({
        playerCardId: "guarded_point",
        floorCardId: "keep_out",
        playerDeclared: true,
        playerIsFirst: true,
        floorDeclared: false,
      }),
    );
    expect(declared.sharedDelta).toBe(-30);
  });

  it("uncancelled Declare swagger resolves before Hold Trap Cancel", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "swagger_hook",
        floorCardId: "trap_clause",
        playerDeclared: true,
        playerIsFirst: true,
        floorDeclared: false,
      }),
    );
    expect(r.secondFirst).toBe(false);
    expect(r.playerPower).toBe(10);
    expect(r.floorPower).toBe(5);
    expect(r.floorDelta).toBe(-25);
  });

  it("second-first Trap Cancel strips Declare swagger that has not resolved", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "trap_clause",
        floorCardId: "floor_hook",
        playerDeclared: false,
        playerIsFirst: false,
        floorDeclared: true,
        denyArmed: true,
      }),
    );
    expect(r.secondFirst).toBe(true);
    expect(r.floorPower).toBe(8);
    expect(r.playerPower).toBe(5);
    expect(r.sharedDelta).toBe(-15);
  });

  it("floor Declare swagger lands when Hold has no Cancel", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "opening_jab",
        floorCardId: "floor_hook",
        playerDeclared: false,
        playerIsFirst: false,
        floorDeclared: true,
      }),
    );
    expect(r.secondFirst).toBe(false);
    expect(r.floorPower).toBe(11);
    expect(r.playerPower).toBe(5);
  });

  it("Raise Stakes multiplies cut ×1.25 both pools", () => {
    const r = computeClash(blankInput({ raiseStakes: true }));
    expect(r.multiplier).toBe(raiseStakesMultiplier(true));
    expect(r.multiplier).toBe(CLASH_CUT_MULT * RAISE_STAKES_FACTOR);
    expect(r.cut).toBe(clashCut(2, CLASH_CUT_MULT * RAISE_STAKES_FACTOR));
    expect(r.sharedDelta).toBe(-r.cut);
  });

  it("Loud Correct Declares at 10 with no Swagger", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "loud_correct",
        floorCardId: "door_jab",
        playerDeclared: true,
        playerIsFirst: true,
        floorDeclared: false,
      }),
    );
    expect(r.playerPower).toBe(10);
    expect(r.note).not.toMatch(/Swagger/);
  });

  it("Comeback Line +4 only on Hold when Shared Pulse < 50%", () => {
    const held = computeClash(
      blankInput({
        playerCardId: "comeback_line",
        playerDeclared: false,
        playerIsFirst: false,
        floorDeclared: true,
        sharedPulse: 40,
        sharedPulseMax: 115,
      }),
    );
    expect(held.playerPower).toBe(10);

    const declared = computeClash(
      blankInput({
        playerCardId: "comeback_line",
        playerDeclared: true,
        playerIsFirst: true,
        floorDeclared: false,
        sharedPulse: 40,
        sharedPulseMax: 115,
      }),
    );
    expect(declared.playerPower).toBe(6);
  });

  it("Exact Count +3 when Floor Pulse is 40–60%", () => {
    const mid = computeClash(
      blankInput({
        playerCardId: "exact_count",
        floorPulse: 40,
        floorPulseMax: 80,
      }),
    );
    expect(mid.playerPower).toBe(10);
    const high = computeClash(
      blankInput({
        playerCardId: "exact_count",
        floorPulse: 80,
        floorPulseMax: 80,
      }),
    );
    expect(high.playerPower).toBe(7);
  });

  it("Finisher Bite −4 when Floor Pulse > 70%", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "finisher_bite",
        floorPulse: 80,
        floorPulseMax: 80,
      }),
    );
    expect(r.playerPower).toBe(8);
  });

  it("Contrarian Echo +4 if enemy Declared last clash", () => {
    const echo = computeClash(
      blankInput({
        playerCardId: "contrarian_echo",
        lastEnemyDeclared: true,
      }),
    );
    expect(echo.playerPower).toBe(11);
    const cold = computeClash(
      blankInput({
        playerCardId: "contrarian_echo",
        lastEnemyDeclared: false,
      }),
    );
    expect(cold.playerPower).toBe(7);
  });

  it("Sideways Cut rolls Chaos 6–9", () => {
    const powers = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const r = computeClash(
        blankInput({
          playerCardId: "sideways_cut",
          rng: new SeededRng(seed),
        }),
      );
      powers.add(r.playerPower);
    }
    expect(Math.min(...powers)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...powers)).toBeLessThanOrEqual(9);
    expect(powers.size).toBeGreaterThan(1);
  });

  it("Bitter Balm Flip heals 8; Declare fights at 4", () => {
    const flip = computeClash(
      blankInput({
        playerCardId: "bitter_balm",
        playerDeclared: false,
        playerIsFirst: false,
        floorDeclared: true,
        floorCardId: "door_jab",
      }),
    );
    expect(flip.heal).toBe(8);
    expect(flip.playerPower).toBe(4);

    const declared = computeClash(
      blankInput({
        playerCardId: "bitter_balm",
        playerDeclared: true,
        playerIsFirst: true,
        floorDeclared: false,
        floorCardId: "door_jab",
      }),
    );
    expect(declared.heal).toBe(0);
    expect(declared.playerPower).toBe(4);
  });
});

describe("Declare / Hold fog + trigger order", () => {
  it("both Hold → second player triggers first", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "opening_jab",
        floorCardId: "floor_hook",
        playerIsFirst: true,
        playerDeclared: false,
        floorDeclared: false,
      }),
    );
    expect(r.secondFirst).toBe(true);
    expect(r.playerPower).toBe(5);
    expect(r.floorPower).toBe(8);
    expect(r.note).toMatch(/Second triggers first/);
  });

  it("uncancelled First Declare steals priority", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "swagger_hook",
        floorCardId: "latch_guard",
        playerIsFirst: true,
        playerDeclared: true,
        floorDeclared: false,
      }),
    );
    expect(r.secondFirst).toBe(false);
    expect(r.note).toMatch(/steals trigger priority/);
  });

  it("Deny on Hold cancels the First Declare so Second triggers first", () => {
    const r = computeClash(
      blankInput({
        playerCardId: "opening_jab",
        floorCardId: "floor_hook",
        playerIsFirst: false,
        playerDeclared: false,
        floorDeclared: true,
        denyArmed: true,
      }),
    );
    expect(r.secondFirst).toBe(true);
    expect(r.floorPower).toBe(8);
  });

  it("Hold does not reveal Power before floor commit (same floor card for different Takes)", () => {
    const base = createClashState(ctx(), 5, "fog");
    const a = structuredClone(base) as ClashState;
    const b = structuredClone(base) as ClashState;
    a.hand = [{ iid: "t", cardId: "opening_jab" }];
    b.hand = [{ iid: "t", cardId: "finisher_bite" }];
    const holdA = applyAction(a, ctx(), { type: "hold", iid: "t" });
    const holdB = applyAction(b, ctx(), { type: "hold", iid: "t" });
    expect(holdA.lastClash?.fog).toBe(true);
    expect(holdA.lastClash?.sealed).toBe(true);
    expect(holdA.lastClash?.playerDeclared).toBe(false);
    expect(holdB.lastClash?.fog).toBe(true);
    expect(holdA.lastClash?.floorCard).toBe(holdB.lastClash?.floorCard);
    expect(holdA.lastClash?.playerLeads).toBe(false);
  });

  it("Declare is face-up so the floor can switch on printed Power", () => {
    const base = createClashState(ctx(), 5, "see");
    const high = structuredClone(base) as ClashState;
    const low = structuredClone(base) as ClashState;
    high.hand = [{ iid: "t", cardId: "finisher_bite" }];
    high.energy = 3;
    low.hand = [{ iid: "t", cardId: "guarded_point" }];
    const dHigh = applyAction(high, ctx(), { type: "declare", iid: "t" });
    const dLow = applyAction(low, ctx(), { type: "declare", iid: "t" });
    expect(dHigh.lastClash?.fog).toBe(false);
    expect(dHigh.lastClash?.playerDeclared).toBe(true);
    expect(dHigh.lastClash?.playerLeads).toBe(true);
    expect(dHigh.lastClash?.floorCard).toBe("latch_guard");
    expect(dLow.lastClash?.floorCard).toBe("keep_out");
  });
});

describe("riffs", () => {
  it("Steady Breath is once per turn", () => {
    const state = createClashState(ctx(), 1, "sb");
    state.hand = [
      { iid: "b1", cardId: "steady_breath" },
      { iid: "b2", cardId: "steady_breath" },
    ];
    state.energy = 3;
    state.sharedPulse = 40;
    const first = applyAction(state, ctx(), { type: "riff", iid: "b1" });
    expect(first.steadyBreathUsed).toBe(true);
    expect(first.sharedPulse).toBe(50);
    expect(() =>
      applyAction(first, ctx(), { type: "riff", iid: "b2" }),
    ).toThrow(/once per turn/);
  });

  it("Amp is +3 next Take", () => {
    const state = createClashState(ctx(), 1, "amp");
    state.hand = [
      { iid: "r1", cardId: "amp_next" },
      { iid: "t1", cardId: "straight_claim" },
    ];
    const afterAmp = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    expect(afterAmp.riffBonus).toBe(3);
    const after = applyAction(afterAmp, ctx(), { type: "declare", iid: "t1" });
    expect(after.lastClash?.playerPower).toBeGreaterThanOrEqual(8 + 3);
  });

  it("Read Ahead peeks the scripted floor Take", () => {
    const state = createClashState(ctx(), 1, "peek");
    state.hand = [{ iid: "r1", cardId: "read_ahead" }];
    const after = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    expect(after.peekedIntent).toBe(floorScriptedTake(1));
    expect(after.peekedIntent).toBe("door_jab");
  });

  it("Overreach pays 8 Pulse for +1 Energy this turn", () => {
    const state = createClashState(ctx(), 1, "ov");
    state.hand = [{ iid: "r1", cardId: "overreach_riff" }];
    state.energy = 0;
    const before = state.sharedPulse;
    const after = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    expect(after.energy).toBe(1);
    expect(after.sharedPulse).toBe(before - OVERREACH_PULSE_COST);
  });

  it("Warm-Up costs 0", () => {
    const state = createClashState(ctx(), 1, "wu");
    state.hand = [{ iid: "r1", cardId: "warm_up" }];
    state.energy = 0;
    const after = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    expect(after.energy).toBe(0);
    expect(after.log.some((l) => l.includes("Warm-Up"))).toBe(true);
  });
});

describe("shared pulse + floor pulse + sets + deck", () => {
  it("is player-weighted a > b and ignores set Pulse", () => {
    expect(PULSE_PLAYER).toBeGreaterThan(PULSE_COMPANION);
    const p = sharedPulseMax(1, 1, 0);
    expect(p.max).toBe(PULSE_PLAYER + PULSE_COMPANION);
  });

  it("bond aura is Pulse-cap only (no clash Power leak)", () => {
    const d1 = bondAuraPulse(20) - bondAuraPulse(0);
    const d2 = bondAuraPulse(200) - bondAuraPulse(180);
    expect(d1).toBeGreaterThan(d2);
    expect(bondAuraPulse(10_000)).toBeLessThanOrEqual(24);
    expect(bondAuraPower(0)).toBe(0);
    expect(bondAuraPower(10_000)).toBe(0);
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
    const empty = createClashState(ctx({ owned: [] }), 1, "nosets");
    expect(withSets.sharedPulseMax).toBe(empty.sharedPulseMax);
  });

  it("Floor Pulse uses player PulseMax × band (0.8–1.2×), not flat 90", () => {
    const pulse = sharedPulseMax(1, 1, 0);
    expect(floorPulseFromYardstick(pulse.playerSegment)).toBe(
      Math.round(pulse.playerSegment * FLOOR_BAND_DOOR * FLOOR_PULSE_FACTOR),
    );
    expect(FLOOR_PULSE_FACTOR).toBeGreaterThanOrEqual(0.8);
    expect(FLOOR_PULSE_FACTOR).toBeLessThanOrEqual(1.2);
    const state = createClashState(ctx(), 1, "fp");
    expect(state.floorPulseMax).toBe(
      floorPulseFromYardstick(state.playerSegment),
    );
    expect(state.floorPulseMax).not.toBe(90);
    expect(state.floorBand).toBe(1);
  });

  it("clash deck is the locked 8 Takes + 5 Riffs even if unlocks are owned", () => {
    const owned = [
      ...starterOwned,
      ...UNLOCK_IDS.map((cardId) => ({ cardId, rank: 1 })),
    ];
    const state = createClashState(ctx({ owned }), 3, "deck");
    const all = [...state.hand, ...state.draw, ...state.shelf];
    expect(all).toHaveLength(STARTER_IDS.length);
    expect(all.every((c) => STARTER_IDS.includes(c.cardId))).toBe(true);
    expect(all.some((c) => UNLOCK_IDS.includes(c.cardId))).toBe(false);
  });

  it("Breathwork discounts Riff energy", () => {
    const state = createClashState(ctx(), 1, "disc");
    state.hand = [{ iid: "r1", cardId: "deny" }];
    state.energy = 1;
    const after = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    expect(after.energy).toBe(0);
    expect(after.denyArmed).toBe(true);
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
  it("can reduce Floor Pulse with Loud Correct", () => {
    const state = createClashState(ctx(), 1, "c3");
    state.hand = [{ iid: "t1", cardId: "loud_correct" }];
    const after = applyAction(state, ctx(), { type: "declare", iid: "t1" });
    expect(after.lastClash?.playerCardName).toBe("Loud Correct");
    expect(after.lastClash?.multiplier).toBe(5);
    expect(after.lastClash?.floorCard).toBe("latch_guard");
    expect(after.floorPulse).toBeLessThan(state.floorPulse);
  });
});

describe("AFK idle claim (not companion pick)", () => {
  it("grants level-scaled fragments up to the cap", () => {
    const now = new Date("2026-09-15T12:00:00Z");
    expect(afkIdleFragments(null, now, 1).fragments).toBe(0);
    const tenMin = new Date(now.getTime() - 10 * 60 * 1000);
    expect(afkIdleFragments(tenMin, now, 2).fragments).toBe(
      2 * Math.floor((10 * 60 * 1000) / AFK_TICK_MS),
    );
    const long = new Date(now.getTime() - AFK_CAP_MS * 3);
    const capped = afkIdleFragments(long, now, 1);
    expect(capped.capped).toBe(true);
    expect(capped.fragments).toBe(Math.floor(AFK_CAP_MS / AFK_TICK_MS));
  });
});

describe("art paths", () => {
  it("maps snake_case card ids to public/art/cards", () => {
    expect(cardArtSrc("take", "opening_jab")).toBe(
      "/art/cards/take_opening_jab.png",
    );
    expect(cardArtSrc("riff", "amp_next")).toBe("/art/cards/riff_amp_next.png");
    expect(cardArtSrc("riff", "amp")).toBe("/art/cards/riff_amp_next.png");
    expect(companionArtSrc("vex")).toBe(
      "/art/companions/companion_rival_01.png",
    );
    expect(companionArtSrc("ember")).toBe(
      "/art/companions/companion_rival_02.png",
    );
    expect(FLOOR_ART).toBe("/art/floors/floor_01_the_door.png");
    expect(UI_ART.declare).toBe("/art/ui/ui_declare.png");
    expect(UI_ART.hold).toBe("/art/ui/ui_hold.png");
  });
});
