import { afterEach, describe, expect, it, vi } from "vitest";
import { getToken } from "./stonkfun";

const token = {
  mint: "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx",
  name: "STONK",
  symbol: "STONK",
  quote: { mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", symbol: "SPYX", category: "xstock", categoryLabel: "xStock" },
  mode: "standard",
  market: { priceUsd: 0.31 },
  status: "graduated",
};

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })));
}

afterEach(() => vi.unstubAllGlobals());

describe("getToken", () => {
  it("unwraps the { data: { token } } envelope used by GET /tokens/{mint}", async () => {
    mockFetch(200, { data: { token }, meta: {} });
    const t = await getToken(token.mint);
    expect(t?.symbol).toBe("STONK");
    expect(t?.market.priceUsd).toBe(0.31);
  });
  it("still accepts a bare token object", async () => {
    mockFetch(200, { data: token });
    expect((await getToken(token.mint))?.mint).toBe(token.mint);
  });
  it("returns null on 404 (not a StonkFun token)", async () => {
    mockFetch(404, { error: { code: "not_found", message: "nope" } });
    expect(await getToken("So11111111111111111111111111111111111111112")).toBeNull();
  });
});
