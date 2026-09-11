export function Sparkline({
  points,
  width = 640,
  height = 120,
  className = "",
}: {
  points: { t: number; v: number }[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (points.length < 2) return <div className="text-[12px] text-fg-3">not enough history yet.</div>;
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.v);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 6;
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (width - pad * 2);
  const sy = (y: number) => height - pad - ((y - minY) / (maxY - minY || 1)) * (height - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`).join(" ");
  const up = ys[ys.length - 1] >= ys[0];
  const color = up ? "var(--positive)" : "var(--negative)";
  const area = `${d} L${sx(maxX).toFixed(1)},${height} L${sx(minX).toFixed(1)},${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full h-auto ${className}`} preserveAspectRatio="none" role="img" aria-label="score over time">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={sx(maxX)} cy={sy(ys[ys.length - 1])} r="3.5" fill={color} />
    </svg>
  );
}
