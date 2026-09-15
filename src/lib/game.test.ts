import { describe, expect, it } from "vitest";
import {
  CARDS,
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
} from "./clash";
import { replyToChat } from "./chat";
import {
  bondAuraPower,
  bondAuraPulse,
  clashCut,
  CLASH_CUT_MULT,
  defendPartial,
  DRAW_PER_TURN,
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
    playerCardId: "straight-claim",
    floorCardId: "keep-out",
    playerLeads: true,
    playerRank: 1,
    riffBonus: 0,
    nextClashBonus: 0,
    setPower: 0,
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
  it("has 8 starter Takes, 5 starter Riffs, 20 total, 7 unlocks", () => {
    expect(STARTER_TAKE_IDS).toHaveLength(8);
    expect(STARTER_RIFF_IDS).toHaveLength(5);
    expect(UNLOCK_IDS).toHaveLength(7);
    expect(CARDS).toHaveLength(20);
    expect(STARTER_TAKE_IDS.map((id) => id)).toEqual([
      "opening-jab",
      "guarded-point",
      "straight-claim",
      "trap-clause",
      "loud-correct",
      "comeback-line",
      "swagger-hook",
      "exact-count",
    ]);
    expect(STARTER_RIFF_IDS).toEqual([
      "warm-up",
      "steady-breath",
      "read-ahead",
      "amp",
      "deny",
    ]);
    expect(UNLOCK_IDS).toEqual([
      "sideways-cut",
      "finisher-bite",
      "bitter-balm",
      "contrarian-echo",
      "second-thought",
      "raise-stakes",
      "overreach",
    ]);
  });
});

describe("clash math locks", () => {
  it("cut = PowerDiff × 5", () => {
    expect(clashCut(12 - 10)).toBe(10);
    expect(clashCut(2)).toBe(10);
    const r = computeClash(blankInput());
    // Straight Claim 12 vs Keep Out 10
    expect(r.playerPower).toBe(12);
    expect(r.floorPower).toBe(10);
    expect(r.cut).toBe(10);
    expect(r.multiplier).toBe(CLASH_CUT_MULT);
    expect(r.floorDelta).toBe(-10);
  });

  it("Defend takes half the cut (ceil)", () => {
    const r = computeClash(
      blankInput({ playerCardId: "guarded-point", floorCardId: "keep-out" }),
    );
    // 6 vs 10, diff 4, cut 20, defend ceil(10)
    expect(r.cut).toBe(20);
    expect(r.sharedDelta).toBe(-defendPartial(20));
    expect(r.sharedDelta).toBe(-10);
  });

  it("Swagger adds 10 cut on a win", () => {
    const r = computeClash(
      blankInput({ playerCardId: "swagger-hook", floorCardId: "door-jab" }),
    );
    // 10 vs 7, cut 15, swagger +10
    expect(r.cut).toBe(15);
    expect(r.floorDelta).toBe(-(15 + SWAGGER_BONUS_CUT));
  });

  it("Cancel (Trap Clause) strips floor Defend", () => {
    const withCancel = computeClash(
      blankInput({ playerCardId: "trap-clause", floorCardId: "latch-guard" }),
    );
    // 7 vs 6, cut 5, floor would defend but cancelled
    expect(withCancel.floorDelta).toBe(-5);

    const noCancel = computeClash(
      blankInput({ playerCardId: "straight-claim", floorCardId: "latch-guard" }),
    );
    // 12 vs 6, cut 30, defend halves to 15
    expect(noCancel.floorDelta).toBe(-15);
  });

  it("Overreach adds power and extra lose cut", () => {
    const win = computeClash(
      blankInput({
        playerCardId: "opening-jab",
        floorCardId: "door-jab",
        overreachArmed: true,
      }),
    );
    // Opening Jab 8 + lead 2 + 6 = 16 vs 7
    expect(win.playerPower).toBe(8 + 2 + OVERREACH_POWER);

    const lose = computeClash(
      blankInput({
        playerCardId: "guarded-point",
        floorCardId: "keep-out",
        overreachArmed: true,
        turn: 6,
      }),
    );
    // Guarded Point 6+6 overreach = 12 vs Keep Out 10 + enrage 4 = 14
    // cut 10, defend 5, overreach tax 15 → 20
    expect(lose.playerPower).toBeLessThan(lose.floorPower);
    expect(lose.sharedDelta).toBe(-(defendPartial(lose.cut) + OVERREACH_LOSE_CUT));
  });

  it("Raise Stakes uses ×7", () => {
    const r = computeClash(blankInput({ raiseStakes: true }));
    expect(r.multiplier).toBe(RAISE_STAKES_MULT);
    expect(r.cut).toBe(2 * 7);
  });

  it("Lead/React bonuses", () => {
    const lead = computeClash(
      blankInput({
        playerCardId: "opening-jab",
        floorCardId: "door-jab",
        playerLeads: true,
      }),
    );
    expect(lead.playerPower).toBe(10); // 8+2

    const react = computeClash(
      blankInput({
        playerCardId: "loud-correct",
        floorCardId: "door-jab",
        playerLeads: false,
      }),
    );
    expect(react.playerPower).toBe(12); // 8+4
  });

  it("Exact Count ignores Chaos jitter on its own Power", () => {
    const rngA = new SeededRng(42);
    const rngB = new SeededRng(42);
    const exact = computeClash(
      blankInput({
        playerCardId: "exact-count",
        floorCardId: "door-jab",
        rng: rngA,
      }),
    );
    // Force chaos by using sideways-cut comparison: Exact Count has no chaos.
    // Sideways Cut vs same floor with same seed should jitter player.
    const chaos = computeClash(
      blankInput({
        playerCardId: "sideways-cut",
        floorCardId: "door-jab",
        rng: rngB,
      }),
    );
    expect(exact.playerPower).toBe(11);
    expect(chaos.playerPower).toBeGreaterThanOrEqual(6);
    expect(chaos.playerPower).toBeLessThanOrEqual(12);
  });
});

describe("shared pulse + bond aura", () => {
  it("is player-weighted a > b", () => {
    expect(PULSE_PLAYER).toBeGreaterThan(PULSE_COMPANION);
    const p = sharedPulseMax(1, 1, 0, 0);
    expect(p.playerSegment).toBe(PULSE_PLAYER);
    expect(p.companionSegment).toBe(PULSE_COMPANION);
    expect(p.max).toBe(PULSE_PLAYER + PULSE_COMPANION);
  });

  it("bond aura soft-diminishes", () => {
    const d1 = bondAuraPulse(20) - bondAuraPulse(0);
    const d2 = bondAuraPulse(200) - bondAuraPulse(180);
    expect(d1).toBeGreaterThan(d2);
    expect(bondAuraPulse(10_000)).toBeLessThanOrEqual(24);
    expect(bondAuraPower(10_000)).toBeLessThanOrEqual(6);
  });

  it("set synergies are complete-set only", () => {
    const none = setBonuses([]);
    expect(none.power).toBe(0);
    expect(none.pulse).toBe(0);
    const partial = setBonuses(STARTER_TAKE_IDS.slice(0, 4));
    expect(partial.power).toBe(0);
    const takes = setBonuses(STARTER_TAKE_IDS);
    expect(takes.power).toBe(1);
    const riffs = setBonuses(STARTER_RIFF_IDS);
    expect(riffs.pulse).toBe(4);
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
      cardId: "opening-jab",
    }));
    drawUpTo(state, rng, 3);
    expect(state.hand.length).toBe(HAND_CAP);
  });

  it("allows only one clash per turn", () => {
    const state = createClashState(ctx(), 11, "c2");
    const take = state.hand.find((c) => {
      const n = STARTER_TAKE_IDS.includes(c.cardId);
      return n;
    });
    // force a cheap take into hand
    if (!take) {
      state.hand.push({ iid: "force", cardId: "opening-jab" });
    }
    const iid =
      state.hand.find((c) => STARTER_TAKE_IDS.includes(c.cardId))?.iid ??
      "force";
    if (!state.hand.some((c) => c.iid === iid)) {
      state.hand.push({ iid, cardId: "opening-jab" });
    }
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
    state.hand = [{ iid: "t1", cardId: "opening-jab" }];
    state.energy = 3;
    expect(() => applyAction(state, ctx(), { type: "end" })).toThrow(
      /Lead or React/,
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
  it("can reduce Floor Pulse with Straight Claim", () => {
    const state = createClashState(ctx(), 1, "c3");
    state.hand = [
      { iid: "t1", cardId: "opening-jab" },
      { iid: "r1", cardId: "amp" },
    ];
    const afterAmp = applyAction(state, ctx(), { type: "riff", iid: "r1" });
    const after = applyAction(afterAmp, ctx(), { type: "declare", iid: "t1" });
    expect(after.lastClash?.playerCardName).toBe("Opening Jab");
    expect(after.lastClash?.multiplier).toBe(5);
    expect(after.floorPulse).toBeLessThan(state.floorPulse);
  });
});
