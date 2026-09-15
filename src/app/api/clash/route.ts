import { NextResponse } from "next/server";
import {
  applyAction,
  clashView,
  createClashState,
  type ClashAction,
  type ClashContext,
  type ClashState,
} from "@/lib/clash";
import { prisma } from "@/lib/db";
import { addFragments, toMeDto } from "@/lib/player";
import { hashSeed } from "@/lib/rng";
import { getOrCreatePlayer, type PlayerRecord } from "@/lib/session";
import {
  CHAT_FUEL_ON_WIN,
  LOSE_FRAGMENTS,
  WIN_BOND,
  WIN_FRAGMENTS,
} from "@/lib/formulas";

export const dynamic = "force-dynamic";

function ctxFrom(player: PlayerRecord): ClashContext {
  return {
    playerId: player.id,
    playerLevel: player.playerLevel,
    companionLevel: player.companionLevel,
    bond: player.bond,
    owned: player.cards.map((c) => ({ cardId: c.cardId, rank: c.rank })),
  };
}

async function activeClash(playerId: string) {
  return prisma.clashRun.findFirst({
    where: { playerId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function GET() {
  const player = await getOrCreatePlayer();
  if (!player.claimed) {
    return NextResponse.json({ error: "Claim a companion first." }, { status: 400 });
  }
  const run = await activeClash(player.id);
  if (!run) return NextResponse.json({ clash: null, me: toMeDto(player) });
  const state = run.state as unknown as ClashState;
  return NextResponse.json({
    clash: clashView(state, ctxFrom(player)),
    me: toMeDto(player),
  });
}

export async function POST() {
  const player = await getOrCreatePlayer();
  if (!player.claimed) {
    return NextResponse.json({ error: "Claim a companion first." }, { status: 400 });
  }

  const existing = await activeClash(player.id);
  if (existing) {
    await prisma.clashRun.update({
      where: { id: existing.id },
      data: { status: "abandoned" },
    });
  }

  const id = `cl_${Date.now().toString(36)}`;
  const seed = hashSeed(player.id, "clash", id, player.floorsCleared);
  const state = createClashState(ctxFrom(player), seed, id);
  await prisma.clashRun.create({
    data: {
      id,
      playerId: player.id,
      status: "active",
      state: state as object,
    },
  });

  return NextResponse.json({
    clash: clashView(state, ctxFrom(player)),
    me: toMeDto(player),
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as ClashAction | null;
  if (!body?.type) {
    return NextResponse.json({ error: "Action required." }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const run = await activeClash(player.id);
  if (!run) {
    return NextResponse.json({ error: "No active clash." }, { status: 400 });
  }

  const current = run.state as unknown as ClashState;
  let next: ClashState;
  try {
    next = applyAction(current, ctxFrom(player), body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Illegal action.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (next.status !== "active") {
    const gained = next.status === "won" ? WIN_FRAGMENTS : LOSE_FRAGMENTS;
    const bondGain = next.status === "won" ? WIN_BOND : 0;
    const fuel = next.status === "won" ? CHAT_FUEL_ON_WIN : 0;
    const converted = addFragments(
      player.ticketFragments,
      player.packTickets,
      gained,
    );
    await prisma.$transaction([
      prisma.clashRun.update({
        where: { id: run.id },
        data: { status: next.status, state: next as object },
      }),
      prisma.player.update({
        where: { id: player.id },
        data: {
          ticketFragments: converted.ticketFragments,
          packTickets: converted.packTickets,
          bond: { increment: bondGain },
          chatFuel: { increment: fuel },
          floorsCleared:
            next.status === "won" ? { increment: 1 } : undefined,
        },
      }),
    ]);
  } else {
    await prisma.clashRun.update({
      where: { id: run.id },
      data: { state: next as object },
    });
  }

  const fresh = await prisma.player.findUniqueOrThrow({
    where: { id: player.id },
    include: { cards: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    clash: clashView(next, ctxFrom(fresh)),
    me: toMeDto(fresh),
    rewards:
      next.status === "won"
        ? { fragments: WIN_FRAGMENTS, bond: WIN_BOND, chatFuel: CHAT_FUEL_ON_WIN }
        : next.status === "lost"
          ? { fragments: LOSE_FRAGMENTS, bond: 0, chatFuel: 0 }
          : null,
  });
}
