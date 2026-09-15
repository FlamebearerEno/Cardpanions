import { GameApp } from "@/components/GameApp";
import { toMeDto } from "@/lib/player";
import { getOrCreatePlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const player = await getOrCreatePlayer();
  return (
    <div className="desk">
      <GameApp initialMe={toMeDto(player)} />
    </div>
  );
}
