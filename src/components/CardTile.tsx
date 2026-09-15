"use client";

import { cardArtSrc } from "@/lib/art";

export type HandCard = {
  iid: string;
  cardId: string;
  name: string;
  type: "take" | "riff";
  energy: number;
  power: number;
  keywords: string[];
  text: string;
  chaosMin?: number;
  chaosMax?: number;
  swagger?: number;
  defend?: number;
};

export function ArtFrame({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`art-frame ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={(e) => {
          const frame = e.currentTarget.parentElement;
          if (frame) frame.style.display = "none";
        }}
      />
    </div>
  );
}

export function CardTile({
  card,
  selected,
  onSelect,
}: {
  card: HandCard;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      className={`card-tile ${card.type} ${selected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <ArtFrame src={cardArtSrc(card.type, card.cardId)} alt={card.name} />
      <header>
        <span className="kind">{card.type}</span>
        <span className="cost">{card.energy}e</span>
      </header>
      <h3>{card.name}</h3>
      {card.type === "take" ? (
        <div className="pow">
          {card.chaosMin != null && card.chaosMax != null
            ? `Chaos ${card.chaosMin}–${card.chaosMax}`
            : `P ${card.power}`}
        </div>
      ) : (
        <div className="pow muted">open</div>
      )}
      <p>{card.text}</p>
    </button>
  );
}

export function CatalogCard({
  id,
  name,
  type,
  energy,
  power,
  text,
  owned,
  rank,
  onRank,
  canRank,
  chaosMin,
  chaosMax,
}: {
  id: string;
  name: string;
  type: string;
  energy: number;
  power: number;
  text: string;
  owned: boolean;
  rank: number;
  onRank?: () => void;
  canRank?: boolean;
  chaosMin?: number;
  chaosMax?: number;
}) {
  return (
    <article className={`catalog-card ${owned ? "owned" : "locked"}`}>
      <ArtFrame src={cardArtSrc(type, id)} alt={name} />
      <header>
        <span>{type}</span>
        <span>
          {energy}e
          {type === "take"
            ? chaosMin != null && chaosMax != null
              ? ` · Chaos ${chaosMin}–${chaosMax}`
              : ` · P${power}`
            : ""}
        </span>
      </header>
      <h4>{name}</h4>
      <p>{owned ? text : "Locked — pull packs."}</p>
      {owned ? (
        <footer>
          <span>Rank {rank}</span>
          {canRank ? (
            <button type="button" onClick={onRank}>
              Rank up (25 dust)
            </button>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
