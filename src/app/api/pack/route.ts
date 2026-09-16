import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/session";
import { toMeDto } from "@/lib/player";
import { hashSeed } from "@/lib/rng";
import { rollPack } from "@/lib/pack";

export const dynamic = "force-dynamic";

export async function POST() {
  const player = await getOrCreatePlayer();
  if (!player.claimed) {
    return NextResponse.json(
      { error: "Choose a rival first." },
      { status: 400 },
    );
  }
  if (player.packTickets < 1) {
    return NextResponse.json(
      { error: "No pack tickets. Chat and Clash grant fragments (10 = 1 ticket)." },
      { status: 400 },
    );
  }

  const seed = hashSeed(player.id, "pack", player.packPulls);
  const grants = rollPack({
    seed,
    pullIndex: player.packPulls,
    ownedIds: player.cards.map((c) => c.cardId),
    companionId: player.companionId,
  });

  await prisma.$transaction(async (tx) => {
    for (const g of grants) {
      if (g.isNew) {
        await tx.playerCard.create({
          data: {
            playerId: player.id,
            cardId: g.cardId,
            rank: 1,
            count: 1,
          },
        });
      } else {
        await tx.playerCard.update({
          where: {
            playerId_cardId: { playerId: player.id, cardId: g.cardId },
          },
          data: { count: { increment: 1 } },
        });
      }
    }
    const dust = grants.reduce((n, g) => n + g.dust, 0);
    await tx.player.update({
      where: { id: player.id },
      data: {
        packTickets: { decrement: 1 },
        packPulls: { increment: 1 },
        dust: { increment: dust },
      },
    });
  });

  const fresh = await prisma.player.findUniqueOrThrow({
    where: { id: player.id },
    include: { cards: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ me: toMeDto(fresh), grants, seed });
}
