import { Suspense } from "react";
import { getActivity, getCategories, getLeaderboard, getToday, DATA_SOURCE } from "@/lib/data";
import { claimPrice } from "@/lib/scoring";
import { ClaimBar } from "@/components/ClaimBar";
import { CategoryChips } from "@/components/CategoryChips";
import { ViewToggle } from "@/components/ViewToggle";
import { Row } from "@/components/leaderboard/Row";
import { TodayRail } from "@/components/TodayRail";
import { ActivityFeed } from "@/components/ActivityFeed";
import { MockBanner } from "@/components/MockBanner";

export const revalidate = 30;

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const [board, today, activity, cats] = await Promise.all([
    getLeaderboard(),
    getToday(10),
    getActivity(20),
    getCategories(),
  ]);
  const rows = cat ? board.filter((l) => l.quote_category === cat) : board;
  const top = board[0]?.score_usd ?? 0;

  return (
    <>
      {DATA_SOURCE === "mock" ? <MockBanner /> : null}
      <div className="pt-4">
        <Suspense>
          <CategoryChips cats={cats} />
        </Suspense>
      </div>
      <div className="mt-4">
        <ViewToggle />
      </div>
      <ClaimBar topScore={top} claimPrice={claimPrice(top, 0)} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8 mt-4">
        <section aria-label="All-time ranking" className="min-w-0">
          {rows.length === 0 ? (
            <div className="card p-10 text-center text-fg-3">nobody&apos;s sent anything yet. be first.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((l) => (
                <Row key={l.mint} l={l} />
              ))}
            </div>
          )}
        </section>
        <aside className="min-w-0 flex flex-col gap-8">
          <TodayRail rows={today} />
          <section>
            <h2 className="text-[14px] font-semibold tracking-[-0.02em] mb-2 px-1">Latest activity</h2>
            <ActivityFeed initial={activity} />
          </section>
        </aside>
      </div>
    </>
  );
}
