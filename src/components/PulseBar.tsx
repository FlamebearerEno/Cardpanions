"use client";

type PulseBarProps = {
  label: string;
  current: number;
  max: number;
  playerShare?: number;
  companionShare?: number;
  accent?: string;
  invert?: boolean;
};

export function PulseBar({
  label,
  current,
  max,
  playerShare,
  companionShare,
  accent = "#f0c36a",
  invert = false,
}: PulseBarProps) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (current / max) * 100));
  const dual = playerShare != null && companionShare != null;
  const totalSeg = (playerShare ?? 0) + (companionShare ?? 0);
  const playerPct = totalSeg > 0 ? (playerShare! / totalSeg) * 100 : 70;

  return (
    <div className="pulse-block">
      <div className="pulse-meta">
        <span>{label}</span>
        <strong>
          {current}/{max}
        </strong>
      </div>
      <div className={`pulse-track ${invert ? "invert" : ""}`}>
        {dual ? (
          <div className="pulse-dual" style={{ width: `${pct}%` }}>
            <i style={{ width: `${playerPct}%` }} />
            <b style={{ width: `${100 - playerPct}%` }} />
          </div>
        ) : (
          <div
            className="pulse-fill"
            style={{ width: `${pct}%`, background: accent }}
          />
        )}
      </div>
      {dual ? (
        <div className="pulse-legend">
          <span className="you">You {playerShare}</span>
          <span className="them">Companion {companionShare}</span>
        </div>
      ) : null}
    </div>
  );
}
