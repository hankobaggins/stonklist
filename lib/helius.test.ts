import { describe, expect, it } from "vitest";
import { HeliusWebhookSchema, extractInbound } from "./helius";

const T = "TreasuryWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

describe("helius webhook parsing", () => {
  it("extracts only inbound transfers to the treasury", () => {
    const payload = HeliusWebhookSchema.parse([
      {
        signature: "sig1",
        slot: 1,
        timestamp: 1_757_600_000,
        type: "TRANSFER",
        tokenTransfers: [
          { fromUserAccount: "alice", toUserAccount: T, tokenAmount: 12.5, mint: "MINT_A" },
          { fromUserAccount: T, toUserAccount: "bob", tokenAmount: 1, mint: "MINT_A" },
          { fromUserAccount: "carol", toUserAccount: "dave", tokenAmount: 3, mint: "MINT_B" },
        ],
      },
      { signature: "sig2", transactionError: { err: "x" }, tokenTransfers: [{ fromUserAccount: "e", toUserAccount: T, tokenAmount: 5, mint: "MINT_C" }] },
    ]);
    const inbound = extractInbound(payload, T);
    expect(inbound).toHaveLength(1);
    expect(inbound[0]).toMatchObject({ signature: "sig1", mint: "MINT_A", fromWallet: "alice", amount: 12.5 });
    expect(inbound[0].blockTime).toBe(new Date(1_757_600_000 * 1000).toISOString());
  });
});
