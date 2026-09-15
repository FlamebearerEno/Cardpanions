import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { afkIdleFragments } from "@/lib/formulas";
import { addFragments, toMeDto } from "@/lib/player";
import { getOrCreatePlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Idle AFK claim. Separate from POST /api/claim (choose rival / claim companion).
 * Greybox: ticket fragments from last_claim_at × player level, 8h cap.
 */
export async function POST() {
  const player = await getOrCreatePlayer();
  if (!player.claimed) {
    return NextResponse.json(
      { error: "Choose a rival before claiming idle." },
      { status: 400 },
    );
  }

  const now = new Date();
  const rolled = afkIdleFragments(
    player.lastClaimAt,
    now,
    player.playerLevel,
  );
  const converted = addFragments(
    player.ticketFragments,
    player.packTickets,
    rolled.fragments,
  );

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: {
      lastClaimAt: now,
      ticketFragments: converted.ticketFragments,
      packTickets: converted.packTickets,
    },
    include: { cards: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    me: toMeDto(updated),
    claimed: {
      fragments: rolled.fragments,
      ticketsConverted: converted.converted,
      waitedMs: rolled.waitedMs,
      capped: rolled.capped,
    },
  });
}
