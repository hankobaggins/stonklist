"use client";
import Image from "next/image";
import { useState } from "react";

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
  const [failed, setFailed] = useState(false);
  const initials = alt.replace(/^\$/, "").slice(0, 2).toUpperCase();
  const show = !!src && !failed;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-elev-2 border border-line ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="mono text-[11px] font-semibold text-fg-3 absolute">{initials}</span>
      {show ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          sizes={`${size}px`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="relative size-full object-cover"
        />
      ) : null}
    </span>
  );
}
