import { COMPANIONS } from "@/lib/companions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    companions: COMPANIONS.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      tagline: c.tagline,
      traits: c.traits,
      accent: c.accent,
    })),
  });
}
