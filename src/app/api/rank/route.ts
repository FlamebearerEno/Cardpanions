import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/session";
import { toMeDto } from "@/lib/player";
import { DUST_PER_RANK } from "@/lib/formulas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    cardId?: string;
  } | null;
  const cardId = body?.cardId;
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const card = player.cards.find((c) => c.cardId === cardId);
  if (!card) {
    return NextResponse.json({ error: "You don't own that card." }, { status: 400 });
  }
  const rankCap = player.playerLevel + 1;
  if (card.rank >= rankCap) {
    return NextResponse.json(
      { error: `Rank capped by Player Level (${rankCap}).` },
      { status: 400 },
    );
  }
  if (player.dust < DUST_PER_RANK) {
    return NextResponse.json(
      { error: `Need ${DUST_PER_RANK} dust.` },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.player.update({
      where: { id: player.id },
      data: { dust: { decrement: DUST_PER_RANK } },
    }),
    prisma.playerCard.update({
      where: { id: card.id },
      data: { rank: { increment: 1 } },
    }),
  ]);

  const fresh = await prisma.player.findUniqueOrThrow({
    where: { id: player.id },
    include: { cards: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(toMeDto(fresh));
}
