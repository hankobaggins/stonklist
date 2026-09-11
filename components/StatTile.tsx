export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "accent";
}) {
  const color =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : tone === "accent" ? "text-accent-fg" : "text-fg";
  return (
    <div className="card p-4">
      <div className="text-[12px] text-fg-3 font-medium">{label}</div>
      <div className={`mono text-[20px] font-semibold mt-1 ${color}`}>{value}</div>
      {sub ? <div className="text-[11.5px] text-fg-3 mt-0.5">{sub}</div> : null}
    </div>
  );
}
