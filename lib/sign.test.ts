import { describe, expect, it } from "vitest";
import { extractMint, isValidPubkey } from "./sign";

const MINT = "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx";

describe("extractMint", () => {
  it("passes a bare mint through", () => expect(extractMint(MINT)).toBe(MINT));
  it("trims whitespace", () => expect(extractMint(`  ${MINT}\n`)).toBe(MINT));
  it("pulls the mint out of a stonkfun.xyz URL", () =>
    expect(extractMint(`https://www.stonkfun.xyz/token/${MINT}?ref=x`)).toBe(MINT));
  it("pulls the mint out of a solscan URL", () =>
    expect(extractMint(`https://solscan.io/token/${MINT}`)).toBe(MINT));
  it("ignores a 32+ char base58 run that is not a key", () =>
    expect(isValidPubkey(extractMint("notanaddressbutlongenoughtomatchtheregex11"))).toBe(false));
  it("returns the trimmed input when nothing matches", () => expect(extractMint(" nope ")).toBe("nope"));
});
