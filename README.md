# Cardpanions

Phone-first browser MVP: claim a starter companion, pull a small pack, clash one tower floor, optionally chat. Server-authoritative for claims, gacha, Clash outcomes, and chat rewards.

Working name: companion + collector/battler cards.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

That is the usual two-step. `npm run dev` generates Prisma client, pushes the SQLite schema, and starts Next.js on `0.0.0.0:3000`.

```bash
npm test    # clash math, starter kit names, pack RNG, chat rate R
npm run build && npm start
```

### Env

Copy `.env.example` to `.env` if you don't have one:

```
DATABASE_URL="file:./dev.db"
```

SQLite file lands at `prisma/dev.db`. No OAuth — a httpOnly cookie (`cp_player`) is the auth stub. Use **Reset local profile** on Home to replay the happy path.

## How the loop works

Play-to-win. Money is not implemented; if it were, it would only buy **chat fuel** (more messages at the same reward rate), never card Power, ranks, or clears.

1. **Claim** one rival (Vex / Ember / Grit). Traits are Accept/Reject and bias voice + later pack weights, not DPS. You get the 13-card starter deck and 1 pack ticket.
2. **Pack** — 3 cards, server-seeded RNG. First pack is three unique unlocks. Dupes → dust. 25 dust ranks a card (+1 Power), capped by Player Level.
3. **Clash** The Door (tower floor 1). Shared Pulse (home HP from Player Level + Companion Level, player-weighted) vs Floor Pulse. Draw 3 / hand cap 7. 1 clash per turn. Leftover energy → Riffs. Shelf = discard. StS-style reshuffle. Mid+ enrage from turn 5. Win pays more ticket fragments than chat.
4. **Chat** is optional garnish. Every message awards fixed rate **R = +2 bond + 1 ticket fragment**. 10 fragments = 1 pack ticket. Bond feeds a soft-diminishing combat aura only.

Collection combat is **set synergies only** (complete Opening Arguments / Breathwork / Edge Cases). Raw card count does nothing. AFK-style split: Player Level is unlocks/caps; card Power is separate. No VIP income. No PvP.

### Clash locks (v1)

- Cut = **PowerDiff × 5** (Raise Stakes riff uses × 7). Hits the lower-Power owner.
- **Lead (Declare)** or **React (Hold)** with one Take. Riffs always open.
- **Defend** = half cut (ceil). Named keywords: Swagger, Cancel, Chaos, Overreach.
- Dual-segment Shared Pulse bar: player mint + companion rose.

### Starter kit (20 cards)

Takes: Opening Jab, Guarded Point, Straight Claim, Trap Clause, Loud Correct, Comeback Line, Swagger Hook, Exact Count.

Riffs: Warm-Up, Steady Breath, Read Ahead, Amp, Deny.

Unlocks: Sideways Cut, Finisher Bite, Bitter Balm, Contrarian Echo, Second Thought, Raise Stakes, Overreach.

## Layout

Single Next.js App Router app (not a multi-package monorepo).

```
src/lib/           cards, clash engine, pack RNG, chat, formulas
src/app/api/       claim, pack, clash, chat, me, rank
src/components/    phone-first UI
prisma/            SQLite schema
```

Happy path for reviewers: claim → pull pack → Clash The Door (Lead a Take, End turn, repeat) → Chat stub and watch bond/fragments tick.

## Known gaps (out of scope)

Native apps, full LLM chat, PvP, friend ghosts, full AFK sim, real payments, VIP, dual-Take combo, 3→reroll. Floor 1 is the only tower floor. Remodel is flavor copy, not a sink yet. Chat fuel is not for sale.
