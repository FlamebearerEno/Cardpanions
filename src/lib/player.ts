import { CARDS, SETS, STARTER_IDS, cardsInSet } from "./cards";
import { getCompanion } from "./companions";
import { setBonuses } from "./clash";
import {
  bondAuraPower,
  bondAuraPulse,
  FRAGMENTS_PER_TICKET,
  sharedPulseMax,
} from "./formulas";
import type { PlayerRecord } from "./session";

export type MeDto = ReturnType<typeof toMeDto>;

export function toMeDto(player: PlayerRecord) {
  const ownedIds = player.cards.map((c) => c.cardId);
  const bonuses = setBonuses(ownedIds);
  const pulse = sharedPulseMax(
    player.playerLevel,
    player.companionLevel,
    player.bond,
    bonuses.pulse,
  );
  const companion = player.companionId
    ? getCompanion(player.companionId)
    : null;

  return {
    id: player.id,
    name: player.name,
    playerLevel: player.playerLevel,
    companion: companion
      ? {
          id: companion.id,
          name: companion.name,
          title: companion.title,
          tagline: companion.tagline,
          traits: companion.traits,
          accent: companion.accent,
        }
      : null,
    companionLevel: player.companionLevel,
    bond: player.bond,
    bondAuraPulse: bondAuraPulse(player.bond),
    bondAuraPower: bondAuraPower(player.bond),
    ticketFragments: player.ticketFragments,
    fragmentsPerTicket: FRAGMENTS_PER_TICKET,
    packTickets: player.packTickets,
    chatFuel: player.chatFuel,
    dust: player.dust,
    claimed: player.claimed,
    packPulls: player.packPulls,
    floorsCleared: player.floorsCleared,
    sharedPulseMax: pulse.max,
    playerSegment: pulse.playerSegment,
    companionSegment: pulse.companionSegment,
    cards: CARDS.map((def) => {
      const owned = player.cards.find((c) => c.cardId === def.id);
      return {
        ...def,
        owned: Boolean(owned),
        rank: owned?.rank ?? 0,
        count: owned?.count ?? 0,
      };
    }),
    sets: SETS.map((s) => ({
      ...s,
      complete: bonuses.complete[s.id] ?? false,
      owned: cardsInSet(s.id).filter((c) => ownedIds.includes(c.id)).length,
      total: cardsInSet(s.id).length,
    })),
    chat: player.messages.slice(-24).map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      bondDelta: m.bondDelta,
      fragmentDelta: m.fragmentDelta,
    })),
    starterCount: STARTER_IDS.length,
  };
}

export function addFragments(
  ticketFragments: number,
  packTickets: number,
  gained: number,
): { ticketFragments: number; packTickets: number; converted: number } {
  let frags = ticketFragments + gained;
  const converted = Math.floor(frags / FRAGMENTS_PER_TICKET);
  frags = frags % FRAGMENTS_PER_TICKET;
  return {
    ticketFragments: frags,
    packTickets: packTickets + converted,
    converted,
  };
}
