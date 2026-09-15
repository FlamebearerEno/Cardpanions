import { cookies } from "next/headers";
import { prisma } from "./db";

export const PLAYER_COOKIE = "cp_player";

export async function getOrCreatePlayer() {
  const store = await cookies();
  const existing = store.get(PLAYER_COOKIE)?.value;
  if (existing) {
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
