import { NextResponse } from "next/server";
import { STARTER_IDS } from "@/lib/cards";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/session";
import { toMeDto } from "@/lib/player";

export const dynamic = "force-dynamic";

export async function GET() {
  const player = await getOrCreatePlayer();
  return NextResponse.json(toMeDto(player));
}

export async function POST() {
  const player = await getOrCreatePlayer();
  return NextResponse.json(toMeDto(player));
}

/** Dev-only reset so reviewers can replay the happy path. */
export async function DELETE() {
  const player = await getOrCreatePlayer();
  await prisma.chatMessage.deleteMany({ where: { playerId: player.id } });
  await prisma.clashRun.deleteMany({ where: { playerId: player.id } });
  await prisma.playerCard.deleteMany({ where: { playerId: player.id } });
  const reset = await prisma.player.update({
    where: { id: player.id },
    data: {
      claimed: false,
      companionId: null,
      companionLevel: 1,
      bond: 0,
      ticketFragments: 0,
      packTickets: 0,
      chatFuel: 12,
      dust: 0,
      packPulls: 0,
      floorsCleared: 0,
      playerLevel: 1,
    },
    include: { cards: true, messages: true },
  });
  void STARTER_IDS;
  return NextResponse.json(toMeDto(reset));
}
