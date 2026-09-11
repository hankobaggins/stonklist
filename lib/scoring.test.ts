import { describe, expect, it } from "vitest";
import { attributeDividend, bagUsd, claimPrice, fromRaw, rank, score, todayScore } from "./scoring";

describe("scoring", () => {
  it("bag is mark-to-market", () => {
    expect(bagUsd(1000, 0.5)).toBe(500);
    expect(bagUsd("1000", null)).toBe(0);
  });
  it("score adds frozen dividends", () => {
    expect(score(1000, 0.5, 25)).toBe(525);
    expect(score(0, 0.5, 25)).toBe(25); // bag can go to 0, divs stay
  });
  it("claim price is gap + 1% buffer, never negative", () => {
    expect(claimPrice(1000, 0)).toBe(1010);
    expect(claimPrice(1000, 500)).toBe(505);
    expect(claimPrice(100, 500)).toBe(0);
  });
  it("ranks by score desc, ties by earliest deposit", () => {
    const r = rank([
      { mint: "b", score_usd: 10, first_deposit_at: "2026-09-02T00:00:00Z" },
      { mint: "a", score_usd: 10, first_deposit_at: "2026-09-01T00:00:00Z" },
      { mint: "c", score_usd: 50, first_deposit_at: null },
    ]);
    expect(r.map((x) => x.mint)).toEqual(["c", "a", "b"]);
    expect(r[0].rank).toBe(1);
  });
  it("today score sums trailing 24h inflows only", () => {
    const now = new Date("2026-09-11T12:00:00Z");
    expect(
      todayScore(
        {
          mint: "x",
          deposits: [
            { usd_at_deposit: 10, block_time: "2026-09-11T11:00:00Z" },
            { usd_at_deposit: 99, block_time: "2026-09-09T11:00:00Z" },
          ],
          dividends: [{ usd_at_receipt: 5, block_time: "2026-09-10T13:00:00Z" }],
        },
        now,
      ),
    ).toBe(15);
  });
  it("attributes dividends exactly or pro-rata by bps × balance", () => {
    const base = { quote_mint: "Q", mode: "reward" as const };
    expect(attributeDividend("Q", [{ mint: "a", transfer_fee_bps: 300, balance: 10, ...base }])).toEqual([
      { mint: "a", share: 1, attribution: "exact" },
    ]);
    const split = attributeDividend("Q", [
      { mint: "a", transfer_fee_bps: 300, balance: 10, ...base },
      { mint: "b", transfer_fee_bps: 100, balance: 10, ...base },
    ]);
    expect(split[0].share).toBeCloseTo(0.75);
    expect(split[1].share).toBeCloseTo(0.25);
    expect(split[0].attribution).toBe("estimated");
    expect(attributeDividend("Z", [{ mint: "a", transfer_fee_bps: 300, balance: 10, ...base }])[0].attribution).toBe("unattributed");
  });
  it("fromRaw converts decimals", () => {
    expect(fromRaw("123456789", 6)).toBe(123.456789);
  });
});
