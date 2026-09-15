"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { COMPANIONS } from "@/lib/companions";
import type { MeDto } from "@/lib/player";
import { CardTile, CatalogCard, type HandCard } from "./CardTile";
import { PulseBar } from "./PulseBar";

type Tab = "home" | "pack" | "clash" | "chat";

type ClashView = {
  id: string;
  floorName: string;
  turn: number;
  energy: number;
  energyMax: number;
  sharedPulse: number;
  sharedPulseMax: number;
  playerSegment: number;
  companionSegment: number;
  floorPulse: number;
  floorPulseMax: number;
  hand: HandCard[];
  drawCount: number;
  shelfCount: number;
  clashUsed: boolean;
  status: "active" | "won" | "lost";
  log: string[];
  lastClash: {
    playerCardName: string;
    floorCardName: string;
    playerPower: number;
    floorPower: number;
    cut: number;
    multiplier: number;
    playerLeads: boolean;
    sharedDelta: number;
    floorDelta: number;
    note: string;
  } | null;
  riffBonus: number;
  overreachArmed: boolean;
  denyArmed: boolean;
  raiseStakes: boolean;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function firstPlayable(clash: ClashView): string | null {
  if (!clash.clashUsed) {
    const takes = clash.hand
      .filter((c) => c.type === "take" && c.energy <= clash.energy)
      .sort((a, b) => b.power - a.power);
    if (takes[0]) return takes[0].iid;
  }
  const riff = clash.hand.find((c) => c.type === "riff" && c.energy <= clash.energy);
  return riff?.iid ?? clash.hand[0]?.iid ?? null;
}

export function GameApp() {
  const [me, setMe] = useState<MeDto | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clash, setClash] = useState<ClashView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [grants, setGrants] = useState<
    { cardId: string; name: string; text: string; type: string; isNew: boolean; dust: number }[] | null
  >(null);
  const [chatDraft, setChatDraft] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    api<MeDto>("/api/me")
      .then((data) => {
        if (live) setMe(data);
      })
      .catch((e: Error) => {
        if (live) setErr(e.message);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [me?.chat.length]);

  const selectedCard = useMemo(
    () => clash?.hand.find((c) => c.iid === selected) ?? null,
    [clash, selected],
  );

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setErr(null);
    try {
      return await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something broke.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function claim(companionId: string) {
    await run(async () => {
      const data = await api<MeDto>("/api/claim", {
        method: "POST",
        body: JSON.stringify({ companionId }),
      });
      setMe(data);
      setTab("home");
    });
  }

  async function pullPack() {
    await run(async () => {
      const data = await api<{ me: MeDto; grants: NonNullable<typeof grants> }>(
        "/api/pack",
        { method: "POST" },
      );
      setMe(data.me);
      setGrants(data.grants);
    });
  }

  async function startClash() {
    await run(async () => {
      const data = await api<{ clash: ClashView; me: MeDto }>("/api/clash", {
        method: "POST",
      });
      setMe(data.me);
      setClash(data.clash);
      setSelected(firstPlayable(data.clash));
      setTab("clash");
    });
  }

  async function loadClash() {
    const data = await api<{ clash: ClashView | null; me: MeDto }>("/api/clash");
    setMe(data.me);
    setClash(data.clash);
    if (data.clash) setSelected(firstPlayable(data.clash));
  }

  async function act(action: { type: string; iid?: string }) {
    await run(async () => {
      const data = await api<{ clash: ClashView; me: MeDto }>("/api/clash", {
        method: "PATCH",
        body: JSON.stringify(action),
      });
      setMe(data.me);
      setClash(data.clash);
      setSelected(firstPlayable(data.clash));
    });
  }

  async function sendChat() {
    const text = chatDraft.trim();
    if (!text) return;
    await run(async () => {
      const data = await api<{ me: MeDto }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setMe(data.me);
      setChatDraft("");
    });
  }

  async function reset() {
    await run(async () => {
      const data = await api<MeDto>("/api/me", { method: "DELETE" });
      setMe(data);
      setClash(null);
      setGrants(null);
      setTab("home");
    });
  }

  async function rankUp(cardId: string) {
    await run(async () => {
      const data = await api<MeDto>("/api/rank", {
        method: "POST",
        body: JSON.stringify({ cardId }),
      });
      setMe(data);
    });
  }

  if (!me) {
    return (
      <div className="phone">
        <div className="boot">{err ?? "Waking the table…"}</div>
      </div>
    );
  }

  if (!me.claimed) {
    return (
      <div className="phone">
        <header className="brand">
          <p className="eyebrow">Cardpanions</p>
          <h1>Claim a rival.</h1>
          <p className="lede">
            Traits are Accept / Reject. They color voice and pack weights — not DPS.
            Remodel is free early.
          </p>
        </header>
        {err ? <p className="err">{err}</p> : null}
        <div className="claim-list">
          {COMPANIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="claim-card"
              style={{ ["--accent" as string]: c.accent }}
              disabled={busy}
              onClick={() => claim(c.id)}
            >
              <div className="claim-name">
                <strong>{c.name}</strong>
                <span>{c.title}</span>
              </div>
              <p>{c.tagline}</p>
              <ul>
                <li>
                  Accept <b>{c.traits.accept}</b>
                </li>
                <li>
                  Reject <b>{c.traits.reject}</b>
                </li>
              </ul>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <header className="topbar">
        <div>
          <p className="eyebrow">Cardpanions</p>
          <h1>{me.companion?.name}</h1>
        </div>
        <div className="pills">
          <span>Lv {me.playerLevel}</span>
          <span>Bond {me.bond}</span>
          <span>Dust {me.dust}</span>
        </div>
      </header>

      <PulseBar
        label="Shared Pulse"
        current={clash ? clash.sharedPulse : me.sharedPulseMax}
        max={clash ? clash.sharedPulseMax : me.sharedPulseMax}
        playerShare={me.playerSegment}
        companionShare={me.companionSegment}
      />

      {err ? <p className="err">{err}</p> : null}

      <main className="stage">
        {tab === "home" ? (
          <HomeTab
            me={me}
            onClash={() => {
              if (clash?.status === "active") {
                setTab("clash");
                return;
              }
              startClash();
            }}
            onPack={() => setTab("pack")}
            onChat={() => setTab("chat")}
            onRank={rankUp}
            onReset={reset}
            busy={busy}
          />
        ) : null}

        {tab === "pack" ? (
          <PackTab me={me} grants={grants} onPull={pullPack} busy={busy} />
        ) : null}

        {tab === "clash" ? (
          <ClashTab
            me={me}
            clash={clash}
            selected={selected}
            selectedCard={selectedCard}
            busy={busy}
            onSelect={setSelected}
            onStart={startClash}
            onAct={act}
          />
        ) : null}

        {tab === "chat" ? (
          <ChatTab
            me={me}
            draft={chatDraft}
            setDraft={setChatDraft}
            onSend={sendChat}
            busy={busy}
            endRef={chatEnd}
          />
        ) : null}
      </main>

      <nav className="tabs">
        {(
          [
            ["home", "Home"],
            ["pack", "Pack"],
            ["clash", "Clash"],
            ["chat", "Chat"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "on" : ""}
            onClick={() => {
              setTab(id);
              if (id === "clash" && !clash) loadClash().catch(() => undefined);
            }}
          >
            {label}
            {id === "pack" && me.packTickets > 0 ? (
              <i>{me.packTickets}</i>
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

function HomeTab({
  me,
  onClash,
  onPack,
  onChat,
  onRank,
  onReset,
  busy,
}: {
  me: MeDto;
  onClash: () => void;
  onPack: () => void;
  onChat: () => void;
  onRank: (id: string) => void;
  onReset: () => void;
  busy: boolean;
}) {
  return (
    <div className="stack">
      <p className="lede">
        Play-to-win. Money would only buy chat fuel — never Power, ranks, or
        clears. Chat is garnish; cards / PvE / AFK are the loop.
      </p>
      <div className="stat-grid">
        <div>
          <b>{me.packTickets}</b>
          <span>pack tickets</span>
        </div>
        <div>
          <b>
            {me.ticketFragments}/{me.fragmentsPerTicket}
          </b>
          <span>fragments</span>
        </div>
        <div>
          <b>{me.chatFuel}</b>
          <span>chat fuel</span>
        </div>
        <div>
          <b>{me.floorsCleared}</b>
          <span>floors</span>
        </div>
      </div>
      <div className="cta-row">
        <button type="button" className="primary" onClick={onClash} disabled={busy}>
          Clash The Door
        </button>
        <button type="button" onClick={onPack}>
          Pack
        </button>
        <button type="button" onClick={onChat}>
          Chat
        </button>
      </div>
      <section>
        <h2>Set synergies</h2>
        <p className="hint">Raw collection count does nothing. Complete the set.</p>
        <ul className="sets">
          {me.sets.map((s) => (
            <li key={s.id} className={s.complete ? "done" : ""}>
              <strong>{s.name}</strong>
              <span>
                {s.owned}/{s.total} · {s.bonus}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Collection</h2>
        <div className="catalog">
          {me.cards.map((c) => (
            <CatalogCard
              key={c.id}
              name={c.name}
              type={c.type}
              energy={c.energy}
              power={c.power}
              text={c.text}
              owned={c.owned}
              rank={c.rank}
              canRank={c.owned && me.dust >= 25 && c.rank < me.playerLevel + 1}
              onRank={() => onRank(c.id)}
            />
          ))}
        </div>
      </section>
      <button type="button" className="ghost" onClick={onReset} disabled={busy}>
        Reset local profile
      </button>
    </div>
  );
}

function PackTab({
  me,
  grants,
  onPull,
  busy,
}: {
  me: MeDto;
  grants: { name: string; text: string; type: string; isNew: boolean; dust: number }[] | null;
  onPull: () => void;
  busy: boolean;
}) {
  return (
    <div className="stack">
      <h2>Small pack</h2>
      <p className="hint">
        Server-seeded RNG. First pack is three unique unlocks. Dupes become dust
        for rank-ups. Companion traits bias the later pool, not Power.
      </p>
      <p>
        Tickets <b>{me.packTickets}</b> · fragments {me.ticketFragments}/
        {me.fragmentsPerTicket}
      </p>
      <button
        type="button"
        className="primary"
        disabled={busy || me.packTickets < 1}
        onClick={onPull}
      >
        {me.packTickets < 1 ? "Need a ticket" : "Pull pack"}
      </button>
      {grants ? (
        <div className="reveal">
          {grants.map((g) => (
            <article key={g.name + g.text} className={g.isNew ? "new" : "dupe"}>
              <span>{g.type}</span>
              <h3>{g.name}</h3>
              <p>{g.text}</p>
              <b>{g.isNew ? "NEW" : `Dupe · +${g.dust} dust`}</b>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ClashTab({
  me,
  clash,
  selected,
  selectedCard,
  busy,
  onSelect,
  onStart,
  onAct,
}: {
  me: MeDto;
  clash: ClashView | null;
  selected: string | null;
  selectedCard: HandCard | null;
  busy: boolean;
  onSelect: (iid: string) => void;
  onStart: () => void;
  onAct: (a: { type: string; iid?: string }) => void;
}) {

  if (!clash || clash.status !== "active") {
    return (
      <div className="stack">
        <h2>The Door</h2>
        <p className="hint">
          Tower floor 1. Shared Pulse vs Floor Pulse. Clash cut hits the
          lower-Power owner: PowerDiff × 5. Defend is partial. 1 clash/turn.
        </p>
        {clash?.lastClash ? (
          <div className="last-clash">
            <strong>
              {clash.lastClash.playerCardName} {clash.lastClash.playerPower} vs{" "}
              {clash.lastClash.floorCardName} {clash.lastClash.floorPower}
            </strong>
            <p>
              cut {clash.lastClash.cut} (×{clash.lastClash.multiplier}) · Shared{" "}
              {clash.sharedPulse}/{clash.sharedPulseMax} · Floor {clash.floorPulse}/
              {clash.floorPulseMax}
            </p>
          </div>
        ) : null}
        {clash?.status === "won" ? (
          <p className="win">Cleared. Fragments banked. Chat fuel +2.</p>
        ) : null}
        {clash?.status === "lost" ? (
          <p className="err">Pulse broke. Consolation fragments granted.</p>
        ) : null}
        <button type="button" className="primary" disabled={busy} onClick={onStart}>
          {clash ? "Fight again" : "Enter the floor"}
        </button>
      </div>
    );
  }

  const canClash = !clash.clashUsed && selectedCard?.type === "take";
  const canRiff = selectedCard?.type === "riff";
  const mustClash =
    !clash.clashUsed &&
    clash.hand.some((c) => c.type === "take" && c.energy <= clash.energy);

  return (
    <div className="clash">
      <PulseBar
        label={clash.floorName}
        current={clash.floorPulse}
        max={clash.floorPulseMax}
        accent="#d9574a"
        invert
      />
      <div className="turn-row">
        <span>Turn {clash.turn}</span>
        <span className="energy">
          {Array.from({ length: clash.energyMax }, (_, i) => (
            <i key={i} className={i < clash.energy ? "on" : ""} />
          ))}
        </span>
        <span>{clash.clashUsed ? "Clash spent" : "Clash open"}</span>
        <span>
          draw {clash.drawCount} · shelf {clash.shelfCount}
        </span>
      </div>
      {clash.lastClash ? (
        <div className="last-clash">
          <strong>
            {clash.lastClash.playerCardName} {clash.lastClash.playerPower} vs{" "}
            {clash.lastClash.floorCardName} {clash.lastClash.floorPower}
          </strong>
          <p>
            {clash.lastClash.playerLeads ? "Lead" : "React"} · cut{" "}
            {clash.lastClash.cut} (×{clash.lastClash.multiplier}) · you{" "}
            {clash.lastClash.sharedDelta} / floor {clash.lastClash.floorDelta}
          </p>
          {clash.lastClash.note ? <p>{clash.lastClash.note}</p> : null}
        </div>
      ) : (
        <p className="hint">
          Pick a Take, then Lead (Declare) or React (Hold). End turn unlocks after
          the clash. Leftover energy can Riff.
        </p>
      )}
      <div className="hand">
        {clash.hand.map((c) => (
          <CardTile
            key={c.iid}
            card={c}
            selected={selected === c.iid}
            onSelect={() => onSelect(c.iid)}
          />
        ))}
      </div>
      {selectedCard ? (
        <p className="pick">
          {selectedCard.name} · {selectedCard.energy}e
          {selectedCard.type === "take" ? ` · P${selectedCard.power}` : ""} —{" "}
          {selectedCard.text}
        </p>
      ) : null}
      <div className="cta-row wrap">
        <button
          type="button"
          className="primary"
          disabled={busy || !canClash || (selectedCard?.energy ?? 99) > clash.energy}
          onClick={() => onAct({ type: "declare", iid: selectedCard!.iid })}
        >
          Lead
        </button>
        <button
          type="button"
          disabled={busy || !canClash || (selectedCard?.energy ?? 99) > clash.energy}
          onClick={() => onAct({ type: "hold", iid: selectedCard!.iid })}
        >
          React
        </button>
        <button
          type="button"
          disabled={busy || !canRiff || (selectedCard?.energy ?? 99) > clash.energy}
          onClick={() => onAct({ type: "riff", iid: selectedCard!.iid })}
        >
          Riff
        </button>
        <button
          type="button"
          disabled={busy || !selectedCard}
          onClick={() => onAct({ type: "shelf", iid: selectedCard!.iid })}
        >
          Shelf
        </button>
        <button
          type="button"
          disabled={busy || mustClash}
          onClick={() => onAct({ type: "end" })}
        >
          End turn
        </button>
      </div>
      <ol className="log">
        {clash.log.slice(-6).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
      <p className="hint">
        Aura from bond: +{me.bondAuraPower} Power, +{me.bondAuraPulse} Pulse
        cap (soft-diminishes). Companion {me.companion?.name} is a warm rival —
        not a DPS stat.
      </p>
    </div>
  );
}

function ChatTab({
  me,
  draft,
  setDraft,
  onSend,
  busy,
  endRef,
}: {
  me: MeDto;
  draft: string;
  setDraft: (s: string) => void;
  onSend: () => void;
  busy: boolean;
  endRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="chat">
      <p className="hint">
        Optional garnish. Every message awards the same rate R: +2 bond and +1
        ticket fragment. Fuel {me.chatFuel}. Efficiency is ~25–30% of endless
        PvE fragments/hour.
      </p>
      <div className="thread">
        {me.chat.length === 0 ? (
          <p className="lede">Say anything. {me.companion?.name} will answer in-character.</p>
        ) : null}
        {me.chat.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            <p>{m.text}</p>
            {m.role === "companion" ? (
              <span>
                +{m.bondDelta} bond · +{m.fragmentDelta} frag
              </span>
            ) : null}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Talk to ${me.companion?.name}…`}
          maxLength={280}
        />
        <button type="submit" className="primary" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
