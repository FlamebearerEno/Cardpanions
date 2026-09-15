import { NextResponse } from "next/server";
import { replyToChat } from "@/lib/chat";
import { prisma } from "@/lib/db";
import { addFragments, toMeDto } from "@/lib/player";
import { getOrCreatePlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = (body?.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Say something." }, { status: 400 });
  }
  if (text.length > 280) {
    return NextResponse.json({ error: "Keep it under 280." }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  if (!player.claimed || !player.companionId) {
    return NextResponse.json(
      { error: "Claim a companion first." },
      { status: 400 },
    );
  }
  if (player.chatFuel < 1) {
    return NextResponse.json(
      {
        error:
          "Out of chat fuel. Play-to-win: Clash wins refill a little. Money would only buy fuel (not in this slice).",
      },
      { status: 400 },
    );
  }

  const result = replyToChat({
    companionId: player.companionId,
    playerText: text,
    bond: player.bond,
    messageIndex: player.messages.length,
  });
  const converted = addFragments(
    player.ticketFragments,
    player.packTickets,
    result.fragments,
  );

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        playerId: player.id,
        role: "player",
        text,
        bondDelta: 0,
        fragmentDelta: 0,
      },
    }),
    prisma.chatMessage.create({
      data: {
        playerId: player.id,
        role: "companion",
        text: result.reply,
        bondDelta: result.bond,
        fragmentDelta: result.fragments,
      },
    }),
    prisma.player.update({
      where: { id: player.id },
      data: {
        chatFuel: { decrement: 1 },
        bond: { increment: result.bond },
        ticketFragments: converted.ticketFragments,
        packTickets: converted.packTickets,
      },
    }),
  ]);

  const fresh = await prisma.player.findUniqueOrThrow({
    where: { id: player.id },
    include: { cards: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    me: toMeDto(fresh),
    reply: result.reply,
    reward: {
      bond: result.bond,
      fragments: result.fragments,
      rejected: result.rejected,
    },
  });
}
