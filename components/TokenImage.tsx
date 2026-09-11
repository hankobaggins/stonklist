/* eslint-disable @next/next/no-img-element */
export function TokenImage({
  src,
  alt,
  size = 44,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
}) {
  const initials = alt.replace(/^\$/, "").slice(0, 2).toUpperCase();
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-elev-2 border border-line ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="mono text-[11px] font-semibold text-fg-3 absolute">{initials}</span>
      {src ? (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="relative size-full object-cover"
        />
      ) : null}
    </span>
  );
}
