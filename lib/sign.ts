import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * Wallet ownership proof for listing registration (CLAUDE.md §2.6 / §9).
 * The client signs `listingMessage(mint, ts)` with the Solana wallet; the server verifies.
 */
export function listingMessage(mint: string, ts: number): string {
  return `stonklist.lol listing for ${mint} at ${ts}`;
}

export function verifySignature(message: string, signatureB58: string, publicKeyB58: string): boolean {
  try {
    const sig = bs58.decode(signatureB58);
    const pk = bs58.decode(publicKeyB58);
    if (sig.length !== 64 || pk.length !== 32) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pk);
  } catch {
    return false;
  }
}

export function isValidPubkey(s: string): boolean {
  try {
    return bs58.decode(s).length === 32;
  } catch {
    return false;
  }
}

/** Signed messages older than this are rejected (replay window). */
export const SIGN_MAX_AGE_MS = 10 * 60 * 1000;
