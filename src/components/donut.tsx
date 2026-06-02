interface Segment {
  amount: number;
  color: string;
}

/**
 * Lightweight SVG donut — no chart library. Segments are drawn as stroked
 * circle arcs using stroke-dasharray, with a small gap between them.
 */
export function Donut({
  segments,
  size = 132,
  thickness = 16,
  children,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const total = segments.reduce((s, seg) => s + seg.amount, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 3; // px gap between segments

  let offset = 0;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={thickness}
        />
        {segments.map((seg, i) => {
          const len = (seg.amount / total) * circumference;
          const dash = Math.max(len - gap, 0);
          const dashArray = `${dash} ${circumference - dash}`;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
      )}
    </div>
  );
}

/** Circular progress ring used by the Focus panel. */
export function ProgressRing({
  value,
  size = 96,
  thickness = 9,
  color = "var(--success)",
}: {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-semibold text-fg">{value}%</span>
    </div>
  );
}
