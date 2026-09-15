/**
 * Combat and economy formulas. Player Level caps/unlocks; card Power is separate.
 * Bond feeds Shared Pulse cap only — no clash Power leak from chat volume.
 */

/** Shared Pulse weights: player-weighted a > b. */
export const PULSE_PLAYER = 80;
export const PULSE_COMPANION = 35;

export const ENERGY_MAX = 3;
export const DRAW_PER_TURN = 3;
export const HAND_CAP = 7;
export const CLASH_CUT_MULT = 5;
/** Raise Stakes: next Clash cut ×1.25 both pools. */
export const RAISE_STAKES_FACTOR = 1.25;
export const OVERREACH_PULSE_COST = 8;
export const STEADY_BREATH_HEAL = 10;
export const SILENCE_PRESS = 12;
export const ENRAGE_START_TURN = 5;
export const ENRAGE_POWER_PER_TURN = 2;

export const BOND_PER_MESSAGE = 2;
export const FRAGMENTS_PER_MESSAGE = 1;
export const FRAGMENTS_PER_TICKET = 10;
export const CHAT_FUEL_START = 12;
export const CHAT_FUEL_ON_WIN = 2;

export const DUST_PER_DUPE = 10;
export const DUST_PER_RANK = 25;
export const PACK_SIZE = 3;

export const WIN_FRAGMENTS = 15;
export const WIN_BOND = 8;
export const LOSE_FRAGMENTS = 3;

/**
 * The Door is band 1. Floor PulseMax ≈ band × player PulseMax (yardstick).
 * Band-1 factor sits in 0.8–1.2× of that yardstick (1.0 = even).
 */
export const FLOOR_BAND_DOOR = 1;
export const FLOOR_PULSE_FACTOR = 1.0;

export function floorPulseFromYardstick(
  playerPulseMax: number,
  band = FLOOR_BAND_DOOR,
  factor = FLOOR_PULSE_FACTOR,
): number {
  return Math.round(playerPulseMax * band * factor);
}

/** Soft-diminishing bond → extra Shared Pulse cap. */
export function bondAuraPulse(bond: number): number {
  return Math.floor((24 * bond) / (bond + 60));
}

/** Chat volume does not leak into clash Power (Pulse-cap only). */
export function bondAuraPower(bond: number): number {
  return bond < 0 ? 0 : 0;
}

export function sharedPulseMax(
  playerLevel: number,
  companionLevel: number,
  bond: number,
): { max: number; playerSegment: number; companionSegment: number } {
  const playerSegment = PULSE_PLAYER * playerLevel;
  const companionSegment = PULSE_COMPANION * companionLevel;
  const aura = bondAuraPulse(bond);
  return {
    max: playerSegment + companionSegment + aura,
    playerSegment,
    companionSegment,
  };
}

export function clashCut(
  powerDiff: number,
  multiplier = CLASH_CUT_MULT,
): number {
  return Math.round(Math.abs(powerDiff) * multiplier);
}

export function raiseStakesMultiplier(armed: boolean): number {
  return armed ? CLASH_CUT_MULT * RAISE_STAKES_FACTOR : CLASH_CUT_MULT;
}

export function rankPowerBonus(rank: number): number {
  return Math.max(0, rank - 1);
}

export function convertFragments(fragments: number): {
  tickets: number;
  leftover: number;
} {
  return {
    tickets: Math.floor(fragments / FRAGMENTS_PER_TICKET),
    leftover: fragments % FRAGMENTS_PER_TICKET,
  };
}

/** Greybox AFK: 1 fragment × player level per 5 minutes, 8h cap. */
export const AFK_TICK_MS = 5 * 60 * 1000;
export const AFK_CAP_MS = 8 * 60 * 60 * 1000;
export const AFK_FRAGMENTS_PER_TICK = 1;

export function afkIdleFragments(
  lastClaimAt: Date | null,
  now: Date,
  playerLevel: number,
): { fragments: number; waitedMs: number; capped: boolean } {
  if (!lastClaimAt) {
    return { fragments: 0, waitedMs: 0, capped: false };
  }
  const waitedMs = Math.max(0, now.getTime() - lastClaimAt.getTime());
  const capped = waitedMs > AFK_CAP_MS;
  const counted = Math.min(waitedMs, AFK_CAP_MS);
  const ticks = Math.floor(counted / AFK_TICK_MS);
  const fragments =
    ticks * AFK_FRAGMENTS_PER_TICK * Math.max(1, playerLevel);
  return { fragments, waitedMs, capped };
}
