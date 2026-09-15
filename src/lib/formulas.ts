/**
 * Combat and economy formulas. Player Level caps/unlocks; card Power is separate.
 * Bond aura is the only chat→combat leak, and it soft-diminishes.
 */

/** Shared Pulse weights: player-weighted a > b. */
export const PULSE_PLAYER = 80;
export const PULSE_COMPANION = 35;

export const ENERGY_MAX = 3;
export const DRAW_PER_TURN = 3;
export const HAND_CAP = 7;
export const CLASH_CUT_MULT = 5;
export const RAISE_STAKES_MULT = 7;
export const DEFEND_FACTOR = 0.5;
export const SWAGGER_BONUS_CUT = 10;
export const OVERREACH_POWER = 6;
export const OVERREACH_LOSE_CUT = 15;
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

/** The Door is band 1. Floor Pulse = round(SharedPulseMax × band × factor), snapshotted at clash start. */
export const FLOOR_BAND_DOOR = 1;
export const FLOOR_PULSE_FACTOR = 0.78;

export function floorPulseFromShared(
  sharedMax: number,
  band = FLOOR_BAND_DOOR,
  factor = FLOOR_PULSE_FACTOR,
): number {
  return Math.round(sharedMax * band * factor);
}

/** Soft-diminishing bond → extra Shared Pulse cap. */
export function bondAuraPulse(bond: number): number {
  return Math.floor((24 * bond) / (bond + 60));
}

/** Soft-diminishing bond → extra clash Power. Small on purpose. */
export function bondAuraPower(bond: number): number {
  return Math.floor((6 * bond) / (bond + 80));
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

export function clashCut(powerDiff: number, multiplier = CLASH_CUT_MULT): number {
  return Math.abs(powerDiff) * multiplier;
}

export function defendPartial(cut: number): number {
  return Math.ceil(cut * DEFEND_FACTOR);
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
