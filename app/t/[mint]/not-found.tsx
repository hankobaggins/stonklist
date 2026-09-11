import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">not on the list.</h1>
      <p className="text-fg-2 mt-2">this mint hasn&apos;t been registered here yet.</p>
      <Link href="/list" className="btn-primary mt-6">Claim a rank</Link>
    </div>
  );
}
