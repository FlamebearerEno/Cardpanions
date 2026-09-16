# Cardpanions

Phone-first browser MVP: choose a rival / claim a companion, pull a small pack, clash one tower floor, optionally chat, claim greybox AFK idle. Server-authoritative for companion pick, gacha, Clash outcomes, chat rewards, and idle claim.

Working name: companion + collector/battler cards.

## Bible alignment (this slice)

Game Dev locked table is restored. Card **ids are snake_case**. Costs / Power / effects match the locked Takes (8 starter + 4 unlock) and Riffs (5 starter + 3 unlock). Clash cut is `|PowerDiff| × 5`. Declare is face-up First; Hold is face-down Second (sealed until Flip). Display names stay Title Case.

Remaining known gaps are listed at the bottom. Greybox UI is intentional.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

That is the usual two-step. `npm run dev` generates Prisma client, pushes the SQLite schema, and starts Next.js on `0.0.0.0:3000`.

```bash
npm test    # locked kit, fog, trigger order, Steady Breath 1/turn, AFK math
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

1. **Choose rival / claim companion** (`POST /api/claim`) — Vex / Ember / Grit. Traits are Accept/Reject and bias voice + later pack weights, not DPS. You get the 13-card starter deck and 1 pack ticket. **This is not AFK idle.**
2. **Pack** — 3 cards, server-seeded RNG. First pack is three unique unlocks. Dupes → dust. 25 dust ranks a card (+1 Power), capped by Player Level. Unlocks enter the collection; they do **not** auto-enter the Clash deck (no equip/swap UI yet).
3. **Clash** The Door (tower floor 1). Shared Pulse (home HP from Player Level + Companion Level, player-weighted) vs Floor Pulse. Draw 3 / hand cap 7. 1 clash per turn. Leftover energy → Riffs. Shelf = discard. StS-style reshuffle. Mid+ enrage from turn 5. Win pays more ticket fragments than chat.
4. **Chat** is optional garnish. Every message awards fixed rate **R = +2 bond + 1 ticket fragment**. 10 fragments = 1 pack ticket. Bond feeds Shared Pulse **cap only** (no clash Power leak).
5. **AFK idle** (`POST /api/afk/claim`) — uses `last_claim_at` and a level-based cap. Greybox: 1 fragment × player level per 5 minutes, 8h cap. Companion “claim” ≠ this idle claim.

Collection combat is **set synergies only** (complete Opening Arguments / Breathwork / Edge Cases). Raw card count does nothing. Player Level is unlocks/caps; card Power is separate. No VIP income. No PvP.

### Clash locks (bible)

- Cut = **|PowerDiff| × 5**. Raise Stakes riff: next cut **×1.25** (both pools). Hits the lower-Power owner.
- **Declare** = face-up First (Lead). Power and Swagger (if any) are public before Flip. Floor may switch Take.
- **Hold** = face-down Second (React). Power hidden until Flip; no face-up Swagger while Held. UI shows a sealed glyph until Flip. Defend / Flip effects apply on reveal.
- **Trigger order**: Second first UNLESS First Declared and that Declare was not Cancelled. Both Hold → Second first. Uncancelled Declare steals priority. Deny on Hold can cancel the First Declare.
- Keywords:
  - **Swagger +N** — face-up Declare Power bonus if it resolves uncancelled
  - **Defend N** — Hold Flip reduces incoming cut by N
  - **Cancel** — strips Swagger or the next named trigger
  - **Chaos [a–b]** — bounded RNG Power (`sideways_cut` is 6–9)
  - **Overreach** — Riff only: +1 Energy this turn, pay **8** Shared Pulse
- **Steady Breath** — heal 10 Pulse, max 1/turn
- Dual-segment Shared Pulse bar: player mint + companion rose

**Floor Pulse** (The Door, band 1): snapshotted at clash start as

`round(playerPulseMax × band × 1.0)`

Band-1 sits in the 0.8–1.2× player PulseMax yardstick. Bond aura can change Shared PulseMax later; Floor Pulse does not retarget mid-fight.

**Sets never grant Shared Pulse / MaxHP.** Complete-set combat is Power/control only:

- Opening Arguments: +1 clash Power
- Breathwork: Riffs cost 1 less (min 0)
- Edge Cases: +1 Power on Hold (Second)

### Card ids (snake_case bible)

Takes: `opening_jab, guarded_point, straight_claim, trap_clause, loud_correct, comeback_line, swagger_hook, exact_count, sideways_cut, finisher_bite, bitter_balm, contrarian_echo`

Riffs: `warm_up, steady_breath, read_ahead, amp_next, deny, second_thought, raise_stakes, overreach_riff`

(`amp` → `amp_next`, `overreach` → `overreach_riff`. Old kebab-case rows remap on load; **Reset local profile** if an in-flight clash looks stale.)

### Locked kit (20 cards)

#### Takes — starter (8)

| id | cost | Power | effect |
|---|---|---|---|
| opening_jab | 1 | 5 | Swagger +1 |
| guarded_point | 1 | 4 | Hold bias; Defend 3 |
| straight_claim | 1 | 8 | Declare baseline |
| trap_clause | 1 | 5 | Hold; Flip: Cancel enemy Swagger |
| loud_correct | 1 | 10 | Declare; no Swagger |
| comeback_line | 1 | 6 | Hold; +4 Power if Shared Pulse <50% |
| swagger_hook | 1 | 7 | Declare; Swagger +3 |
| exact_count | 1 | 7 | +3 Power if Floor Pulse 40–60% |

#### Takes — unlock (4)

| id | cost | Power | effect |
|---|---|---|---|
| sideways_cut | 1 | Chaos 6–9 | Bounded RNG |
| finisher_bite | 2 | 12 | −4 Power if Floor Pulse >70% |
| bitter_balm | 1 | 4 | Flip: heal 8 or fight at Power 4 |
| contrarian_echo | 1 | 7 | +4 if enemy Declared last clash |

#### Riffs — starter (5)

| id | cost | effect |
|---|---|---|
| warm_up | 0 | Draw 1 |
| steady_breath | 1 | Heal 10 Pulse; max 1/turn |
| read_ahead | 1 | Peek enemy Intent |
| amp_next | 1 | Next Take +3 Power |
| deny | 2 | Cancel Swagger or next trigger |

#### Riffs — unlock (3)

| id | cost | effect |
|---|---|---|
| second_thought | 1 | Shelf → hand (1) |
| raise_stakes | 1 | Next Clash cut ×1.25 both pools |
| overreach_riff | 0 | +1 E this turn; pay 8 Shared Pulse |

Clash battle deck is exactly the locked **8 Takes + 5 Riffs**. Unlocks sit in collection until an equip/swap UI exists.

## Layout

Single Next.js App Router app (not a multi-package monorepo).

```
src/lib/           cards, clash engine, pack RNG, chat, formulas
src/app/api/       claim, afk/claim, pack, clash, chat, me, rank
src/components/    phone-first UI
prisma/            SQLite schema
```

Happy path for reviewers: choose rival → pull pack → Clash The Door (Declare or Hold a Take, End turn, repeat) → Claim idle (AFK stub) → Chat stub and watch bond/fragments tick.

## Art (Creative Grok Imagine)

Greybox UI reads from `public/art/`:

- Companions: `/art/companions/companion_rival_01.png` (Vex / Grit), `_02.png` (Ember)
- Cards: `/art/cards/take_<id>.png` and `/art/cards/riff_<id>.png` (`amp_next` prefers `riff_amp_next.png`)
- Floor: `/art/floors/floor_01_the_door.png`
- Chrome: `/art/ui/ui_shared_pulse.png`, `ui_floor_pulse.png`, `ui_declare.png`, `ui_hold.png`

16:9 outs are letterboxed/cropped (`object-fit: cover`). Drop exports in `uploads/` and run `node scripts/ingest-art.cjs` to copy.

## Known gaps (out of scope / still greybox)

- Native apps, full LLM chat, PvP, friend ghosts, real payments, VIP, dual-Take combo, 3→reroll
- Floor 1 is the only tower floor
- Remodel is flavor copy, not a sink yet
- Chat fuel is not for sale
- AFK amounts are greybox (fragments, 5 min tick, 8h cap) — not a full sim
- No card equip/swap UI yet (unlocks collected, not auto-decked)
- Lead/React is the same two-button choice as Declare/Hold (First face-up vs Second face-down); independent Lead+Hold / React+Declare pairs are engine-testable but not in the phone UI
- Floor AI is scripted + light react-to-Declare, not a full opponent
