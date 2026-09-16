/** Public art paths for Creative’s Grok Imagine batch under public/art/. */

export const COMPANION_ART: Record<string, string> = {
  vex: "/art/companions/companion_rival_01.png",
  ember: "/art/companions/companion_rival_02.png",
  grit: "/art/companions/companion_rival_01.png",
};

export const FLOOR_ART = "/art/floors/floor_01_the_door.png";

export const UI_ART = {
  sharedPulse: "/art/ui/ui_shared_pulse.png",
  floorPulse: "/art/ui/ui_floor_pulse.png",
  declare: "/art/ui/ui_declare.png",
  hold: "/art/ui/ui_hold.png",
} as const;

export function companionArtSrc(companionId: string | null | undefined): string {
  if (!companionId) return COMPANION_ART.vex;
  return COMPANION_ART[companionId] ?? COMPANION_ART.vex;
}

export function cardArtSrc(
  type: "take" | "riff" | string,
  cardId: string,
): string {
  const id = cardId.replace(/-/g, "_");
  const kind = type === "riff" ? "riff" : "take";
  if (kind === "riff" && (id === "amp" || id === "amp_next")) {
    return "/art/cards/riff_amp_next.png";
  }
  return `/art/cards/${kind}_${id}.png`;
}
