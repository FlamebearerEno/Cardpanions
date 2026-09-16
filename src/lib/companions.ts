export type CompanionTrait = {
  accept: string;
  reject: string;
};

export type CompanionDef = {
  id: string;
  name: string;
  title: string;
  tagline: string;
  traits: CompanionTrait;
  accent: string;
  packBias: string[];
  lines: string[];
  rejectLines: string[];
};

export const COMPANIONS: CompanionDef[] = [
  {
    id: "vex",
    name: "Vex",
    title: "Warm rival",
    tagline: "She'll correct you in public, then wait for you to catch up.",
    traits: { accept: "Wit", reject: "Mercy" },
    accent: "#ff6b8a",
    packBias: ["trap_clause", "contrarian_echo", "deny", "sideways_cut"],
    lines: [
      "Cute try. Say it cleaner.",
      "I heard the real point under that. Don't bury it.",
      "Keep going. I'm not bored yet.",
      "If you're going to jab, commit.",
      "That's almost sharp. Almost.",
      "Don't look at me like I'm the coach. You're the one on the floor.",
    ],
    rejectLines: [
      "Don't grovel. Fix it.",
      "Mercy is a stall. Take the cut or don't.",
      "Soft isn't the look. Try again.",
    ],
  },
  {
    id: "ember",
    name: "Ember",
    title: "Sunlit competitor",
    tagline: "Warmth with a scoreboard. She wants you across the line, not under it.",
    traits: { accept: "Warmth", reject: "Cruelty" },
    accent: "#f0a05a",
    packBias: ["steady_breath", "bitter_balm", "warm_up", "read_ahead"],
    lines: [
      "Hey — I felt that. Again, from the chest.",
      "You're allowed to want the win. Sit with it.",
      "Breathe. Then claim it.",
      "I'm right here. Don't perform; talk.",
      "That's the spark. Don't snuff it to look cool.",
      "We can be kind and still keep score.",
    ],
    rejectLines: [
      "Don't make it mean just to look tall.",
      "Cruel's a cheap Power. Not ours.",
      "Ease off the edge. I'm still on your side.",
    ],
  },
  {
    id: "grit",
    name: "Grit",
    title: "Coach-rival",
    tagline: "Won't let you tap out. Respects the ones who stay in the room.",
    traits: { accept: "Grit", reject: "Quit" },
    accent: "#6ee7c5",
    packBias: ["comeback_line", "finisher_bite", "overreach_riff", "swagger_hook"],
    lines: [
      "Still standing. Good. Again.",
      "The floor doesn't care how you feel. That's why we train.",
      "Shorten the sentence. Hit the claim.",
      "I don't need pretty. I need another turn.",
      "Pain's information. Spend it.",
      "You're not done. Don't write the ending yet.",
    ],
    rejectLines: [
      "Don't you dare tap. We finish the floor.",
      "Quit is a story you tell after you already left. Stay.",
      "Walk it off. Then pick a Take.",
    ],
  },
];

export const COMPANION_BY_ID: Record<string, CompanionDef> = Object.fromEntries(
  COMPANIONS.map((c) => [c.id, c]),
);

export function getCompanion(id: string): CompanionDef {
  const c = COMPANION_BY_ID[id];
  if (!c) throw new Error(`Unknown companion: ${id}`);
  return c;
}
