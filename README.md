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
- **Declare** = Lead, face-up, you are **First**. Floor sees printed Power and may switch Take.
- **Hold** = React, face-down, you are **Second**. Floor commits **blind** (fog — not an open Power compare). Then reveal.
- **Second-first** triggers (React, Contrarian Echo, Second Cancel) fire on Hold unless First Cancelled them.
- **Defend** = half cut (ceil). Named keywords: Swagger, Cancel, Chaos, Overreach.
- Dual-segment Shared Pulse bar: player mint + companion rose.

**Floor Pulse** (The Door, band 1): snapshotted at clash start as

`round(SharedPulseMax × band × 0.78)`

Bond aura can change Shared PulseMax later; Floor Pulse does not retarget mid-fight.

**Sets never grant Shared Pulse / MaxHP.** Complete-set combat is Power/control only:

- Opening Arguments: +1 clash Power
- Breathwork: Riffs cost 1 less (min 0)
- Edge Cases: +1 Power on Hold

### Card ids (snake_case bible)

Takes: `opening_jab, guarded_point, straight_claim, trap_clause, loud_correct, comeback_line, swagger_hook, exact_count, sideways_cut, finisher_bite, bitter_balm, contrarian_echo`

Riffs: `warm_up, steady_breath, read_ahead, amp_next, deny, second_thought, raise_stakes, overreach_riff`

(`amp` → `amp_next`, `overreach` → `overreach_riff`. Old kebab-case rows remap on load; **Reset local profile** if an in-flight clash looks stale.)

### Starter kit (20 cards)

Takes: Opening Jab (1e/8/lead), Guarded Point (1e/6/defend), Straight Claim (2e/12), Trap Clause (2e/7/cancel), Loud Correct (1e/8/react), Comeback Line (2e/9), Swagger Hook (2e/10/swagger), Exact Count (2e/11).

Riffs: Warm-Up, Steady Breath, Read Ahead, Amp (`amp_next`), Deny.

Unlocks: Sideways Cut, Finisher Bite, Bitter Balm, Contrarian Echo, Second Thought, Raise Stakes, Overreach (`overreach_riff`).

The original battler brief named roles/keywords, not integers. The energy/power table above is the locked v1 kit (intentional, not leftover greybox). Exact Count's Chaos immunity is card text, not a new keyword.

## Layout

Single Next.js App Router app (not a multi-package monorepo).

```
src/lib/           cards, clash engine, pack RNG, chat, formulas
src/app/api/       claim, pack, clash, chat, me, rank
src/components/    phone-first UI
prisma/            SQLite schema
```

Happy path for reviewers: claim → pull pack → Clash The Door (Declare a Take, End turn, repeat) → Chat stub and watch bond/fragments tick.

## Known gaps (out of scope)

Native apps, full LLM chat, PvP, friend ghosts, full AFK sim, real payments, VIP, dual-Take combo, 3→reroll. Floor 1 is the only tower floor. Remodel is flavor copy, not a sink yet. Chat fuel is not for sale.
