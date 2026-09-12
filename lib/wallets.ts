"use client";
/**
 * Solana wallet discovery + message signing with zero dependencies.
 *
 * Every current Solana wallet (Phantom, Solflare, Backpack, Coinbase, OKX, Trust, Nightly,
 * Magic Eden, Glow, Exodus, …) implements the Wallet Standard: the page announces
 * `wallet-standard:app-ready`, and each wallet answers with `wallet-standard:register-wallet`.
 * We speak that protocol directly (it's ~30 lines) instead of pulling in wallet-adapter,
 * so users can pick any installed wallet rather than whichever extension owns `window.solana`.
 *
 * Legacy injected providers (`window.phantom.solana` etc.) are kept as a fallback for wallets
 * that predate the standard. Nothing here ever signs or sends a transaction — only messages
 * (CLAUDE.md §2.4, §2.6).
 */

// ---- Wallet Standard types (subset we use) -------------------------------------------

export type WalletAccount = {
  address: string;
  publicKey: Uint8Array;
  chains: readonly string[];
  features: readonly string[];
  label?: string;
  icon?: string;
};

type ConnectFeature = {
  version: string;
  connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>;
};
type DisconnectFeature = { version: string; disconnect(): Promise<void> };
type SignMessageFeature = {
  version: string;
  signMessage(
    ...inputs: { account: WalletAccount; message: Uint8Array }[]
  ): Promise<readonly { signedMessage: Uint8Array; signature: Uint8Array }[]>;
};
type EventsFeature = {
  version: string;
  on(event: "change", listener: (props: { accounts?: readonly WalletAccount[] }) => void): () => void;
};

export type StandardWallet = {
  version: "1.0.0";
  name: string;
  icon: string; // data: URI
  chains: readonly string[];
  features: Record<string, unknown> & {
    "standard:connect"?: ConnectFeature;
    "standard:disconnect"?: DisconnectFeature;
    "standard:events"?: EventsFeature;
    "solana:signMessage"?: SignMessageFeature;
  };
  accounts: readonly WalletAccount[];
};

type RegisterApi = { register(...wallets: StandardWallet[]): () => void };

// ---- Legacy injected providers ----------------------------------------------------

type LegacyPubkey = { toBase58(): string; toBytes?(): Uint8Array };
export interface LegacyProvider {
  publicKey?: LegacyPubkey | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: LegacyPubkey } | boolean | void>;
  disconnect?(): Promise<void>;
  signMessage(msg: Uint8Array, enc: "utf8"): Promise<{ signature: Uint8Array } | Uint8Array>;
}
declare global {
  interface Window {
    solana?: LegacyProvider & { isPhantom?: boolean };
    phantom?: { solana?: LegacyProvider };
    solflare?: LegacyProvider;
    backpack?: LegacyProvider;
  }
}

// ---- Unified wallet handle ----------------------------------------------------------

/** What the UI works with: one entry per installed wallet that can sign a Solana message. */
export type WalletOption = {
  id: string;
  name: string;
  icon: string | null;
  /** `standard` = Wallet Standard; `legacy` = window.* injected provider. */
  kind: "standard" | "legacy";
  /** Already authorised for this site (accounts present without a prompt). */
  connected: boolean;
  connect(): Promise<string>; // resolves to the base58 address
  disconnect(): Promise<void>;
  /** Detached ed25519 signature over `message`. */
  signMessage(message: Uint8Array): Promise<Uint8Array>;
};

const SOLANA_CHAIN = /^solana:/;

function fromStandard(w: StandardWallet): WalletOption | null {
  const connect = w.features["standard:connect"];
  const sign = w.features["solana:signMessage"];
  if (!connect || !sign || !w.chains.some((c) => SOLANA_CHAIN.test(c))) return null;
  const solAccount = () => w.accounts.find((a) => a.chains.some((c) => SOLANA_CHAIN.test(c))) ?? w.accounts[0];
  return {
    id: `std:${w.name}`,
    name: w.name,
    icon: w.icon || null,
    kind: "standard",
    connected: w.accounts.length > 0,
    async connect() {
      const { accounts } = await connect.connect();
      const acct = accounts.find((a) => a.chains.some((c) => SOLANA_CHAIN.test(c))) ?? accounts[0] ?? solAccount();
      if (!acct) throw new Error("wallet connected but returned no Solana account");
      return acct.address;
    },
    async disconnect() {
      await w.features["standard:disconnect"]?.disconnect();
    },
    async signMessage(message) {
      const acct = solAccount();
      if (!acct) throw new Error("wallet is not connected");
      const [out] = await sign.signMessage({ account: acct, message });
      if (!out) throw new Error("wallet returned no signature");
      return out.signature;
    },
  };
}

function fromLegacy(name: string, p: LegacyProvider): WalletOption {
  return {
    id: `legacy:${name}`,
    name,
    icon: null,
    kind: "legacy",
    connected: !!p.publicKey,
    async connect() {
      const res = await p.connect();
      const pk = (res && typeof res === "object" && "publicKey" in res ? res.publicKey : null) ?? p.publicKey;
      if (!pk) throw new Error("wallet connected but returned no public key");
      return pk.toBase58();
    },
    async disconnect() {
      await p.disconnect?.();
    },
    async signMessage(message) {
      const signed = await p.signMessage(message, "utf8");
      return signed instanceof Uint8Array ? signed : signed.signature;
    },
  };
}

// ---- Registry -----------------------------------------------------------------------

const standardWallets = new Set<StandardWallet>();
const listeners = new Set<() => void>();
let started = false;

function notify() {
  for (const l of listeners) l();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const api: RegisterApi = {
    register(...wallets) {
      for (const w of wallets) standardWallets.add(w);
      notify();
      return () => {
        for (const w of wallets) standardWallets.delete(w);
        notify();
      };
    },
  };
  // Wallets that load after us announce themselves…
  window.addEventListener("wallet-standard:register-wallet", (e) => {
    const cb = (e as CustomEvent<(api: RegisterApi) => void>).detail;
    if (typeof cb === "function") cb(api);
  });
  // …and wallets already loaded answer this.
  window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: api }));
  // Some wallets inject late (mobile in-app browsers); re-announce briefly.
  let n = 0;
  const id = setInterval(() => {
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: api }));
    if (++n >= 6) clearInterval(id);
  }, 500);
}

/** Snapshot of every usable wallet, Wallet Standard first, legacy providers deduped by name. */
export function listWallets(): WalletOption[] {
  start();
  const out: WalletOption[] = [];
  const seen = new Set<string>();
  for (const w of standardWallets) {
    const o = fromStandard(w);
    if (o && !seen.has(o.name.toLowerCase())) { seen.add(o.name.toLowerCase()); out.push(o); }
  }
  if (typeof window !== "undefined") {
    const legacy: [string, LegacyProvider | undefined][] = [
      ["Phantom", window.phantom?.solana],
      ["Solflare", window.solflare],
      ["Backpack", window.backpack],
    ];
    const generic = window.solana;
    if (generic && !generic.isPhantom) legacy.push(["Solana wallet", generic]);
    for (const [name, p] of legacy) {
      if (p && !seen.has(name.toLowerCase())) { seen.add(name.toLowerCase()); out.push(fromLegacy(name, p)); }
    }
  }
  return out.sort((a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name));
}

/** Subscribe to wallet registrations; returns an unsubscribe. */
export function onWalletsChange(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const LAST_WALLET_KEY = "stonklist:last-wallet";
export function rememberWallet(id: string | null) {
  try { if (id) localStorage.setItem(LAST_WALLET_KEY, id); else localStorage.removeItem(LAST_WALLET_KEY); } catch {}
}
export function lastWalletId(): string | null {
  try { return localStorage.getItem(LAST_WALLET_KEY); } catch { return null; }
}

// ---- Error helpers --------------------------------------------------------------------

export function walletErrMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return String(e);
}
export function isUserReject(e: unknown): boolean {
  const m = walletErrMsg(e).toLowerCase();
  const code = (e as { code?: number } | null)?.code;
  return code === 4001 || m.includes("reject") || m.includes("cancel") || m.includes("denied");
}

/** Popular wallets to suggest when none is installed. */
export const SUGGESTED_WALLETS = [
  { name: "Phantom", url: "https://phantom.app/download" },
  { name: "Solflare", url: "https://solflare.com/download" },
  { name: "Backpack", url: "https://backpack.app/download" },
] as const;
