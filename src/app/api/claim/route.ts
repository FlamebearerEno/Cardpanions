import { NextResponse } from "next/server";
import { COMPANION_BY_ID } from "@/lib/companions";
import { STARTER_IDS } from "@/lib/cards";
import { CHAT_FUEL_START } from "@/lib/formulas";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/session";
import { toMeDto } from "@/lib/player";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    companionId?: string;
  } | null;
  const companionId = body?.companionId;
  if (!companionId || !COMPANION_BY_ID[companionId]) {
    return NextResponse.json(
      { error: "Pick Vex, Ember, or Grit." },
      { status: 400 },
    );
  }

  const player = await getOrCreatePlayer();
  if (player.claimed) {
    return NextResponse.json(
      { error: "You already claimed a companion." },
      { status: 409 },
    );
  }

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      claimed: true,
      companionId,
      packTickets: 1,
      chatFuel: CHAT_FUEL_START,
      cards: {
        create: STARTER_IDS.map((cardId) => ({ cardId, rank: 1, count: 1 })),
      },
    },
    include: { cards: true, messages: true },
  });

  return NextResponse.json(toMeDto(updated));
}
