import { cookies } from "next/headers";
import { remapCardId } from "./cards";
import { prisma } from "./db";

export const PLAYER_COOKIE = "cp_player";

async function migratePlayerCardIds(playerId: string) {
  const cards = await prisma.playerCard.findMany({ where: { playerId } });
  for (const c of cards) {
    const nextId = remapCardId(c.cardId);
    if (nextId === c.cardId) continue;
    const existing = await prisma.playerCard.findUnique({
      where: { playerId_cardId: { playerId, cardId: nextId } },
    });
    if (existing) {
      await prisma.playerCard.update({
        where: { id: existing.id },
        data: {
          count: { increment: c.count },
          rank: Math.max(existing.rank, c.rank),
        },
      });
      await prisma.playerCard.delete({ where: { id: c.id } });
    } else {
      await prisma.playerCard.update({
        where: { id: c.id },
        data: { cardId: nextId },
      });
    }
  }
}

export async function getOrCreatePlayer() {
  const store = await cookies();
  const existing = store.get(PLAYER_COOKIE)?.value;
  if (existing) {
    await migratePlayerCardIds(existing);
    const player = await prisma.player.findUnique({
      where: { id: existing },
      include: { cards: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (player) return player;
  }

  const player = await prisma.player.create({
    data: { name: "Rookie" },
    include: { cards: true, messages: true },
  });
  store.set(PLAYER_COOKIE, player.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return player;
}

export type PlayerRecord = Awaited<ReturnType<typeof getOrCreatePlayer>>;
