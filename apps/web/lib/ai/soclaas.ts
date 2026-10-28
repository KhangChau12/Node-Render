import { lookup as dnsLookup } from "node:dns";
import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { env } from "../env";
import { tr } from "../i18n/server";

/*
 * Network path to the SoCLaaS gateway (NUS SoC), which serves the DeepSeek model.
 *
 * Inside the NUS network the gateway is reached directly. From outside it is
 * reached through a TCP relay: the connection goes to the relay's IP, while
 * TLS still uses (and verifies) the gateway's hostname, exactly like a hosts
 * file override, but without touching the machine's hosts file.
 *
 * SOCLAAS_RELAY: "auto" (default) tries direct first and switches to the relay
 * when the gateway cannot be reached; "always" uses only the relay; "off" only direct.
 */

export const SOCLAAS_DEFAULT_URL = "https://soclaas-api.comp.nus.edu.sg/v1";
const DEFAULT_RELAY_IP = "13.212.116.159";
/** How long a route that worked is reused before "auto" tries direct again. */
const STICKY_MS = 10 * 60 * 1000;

type Route = "direct" | "relay";

export function soclaasBaseUrl(): string {
  return env("SOCLAAS_BASE_URL") || SOCLAAS_DEFAULT_URL;
}

export function soclaasKey(): string | undefined {
  // SOCLASS_BEARER_KEY is the name used in the original .env.local.
  return env("SOCLAAS_API_KEY") || env("SOCLASS_BEARER_KEY");
}

function relayMode(): "auto" | "always" | "off" {
  const m = (env("SOCLAAS_RELAY") || "auto").toLowerCase();
  return m === "always" || m === "off" ? m : "auto";
}

/** Resolves the gateway hostname to the relay IP; every other name resolves normally. */
function relayLookup(host: string, ip: string): LookupFunction {
  return (hostname, options, callback) => {
    if (hostname !== host) {
      (dnsLookup as unknown as LookupFunction)(hostname, options, callback);
      return;
    }
    if (options.all) (callback as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: ip, family: 4 }]);
    else callback(null, ip, 4);
  };
}

let agents: Record<Route, Agent> | null = null;
function agentFor(route: Route): Agent {
  if (!agents) {
    const host = new URL(soclaasBaseUrl()).hostname;
    const ip = env("SOCLAAS_RELAY_IP") || DEFAULT_RELAY_IP;
    agents = {
      direct: new Agent({ connect: { timeout: 6000 } }),
      relay: new Agent({ connect: { timeout: 10000, lookup: relayLookup(host, ip) } }),
    };
  }
  return agents[route];
}

let sticky: { route: Route; until: number } | null = null;

/** Errors that mean "could not reach the gateway on this path" (as opposed to an HTTP error or an abort). */
function unreachable(err: unknown): boolean {
  const cause = (err as { cause?: { code?: string } })?.cause;
  const code = cause?.code ?? (err as { code?: string })?.code ?? "";
  return /UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/.test(code);
}

/** Which path the last successful request used (for the settings page). */
export function soclaasRoute(): Route | null {
  return sticky?.route ?? null;
}

/** Pauses between retry rounds when no route reaches the gateway (ms). */
const RETRY_WAITS = [3000, 6000, 12000];

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });
}

/** fetch for the AI SDK: same contract as global fetch, with the direct/relay fallback. */
export const soclaasFetch: typeof fetch = async (input, init) => {
  const mode = relayMode();
  const order: Route[] =
    mode === "always" ? ["relay"] : mode === "off" ? ["direct"] : sticky && sticky.until > Date.now() ? [sticky.route, sticky.route === "direct" ? "relay" : "direct"] : ["direct", "relay"];
  let last: unknown;
  // The gateway drops out for a few seconds now and then: wait and try every route again before giving up.
  for (let round = 0; round < RETRY_WAITS.length + 1; round++) {
    if (round > 0) {
      await wait(RETRY_WAITS[round - 1], init?.signal ?? undefined);
      if (init?.signal?.aborted) break;
    }
    for (const route of order) {
      try {
        // Request bodies from the AI SDK are strings, so a retry can resend them.
        const res = await undiciFetch(input as string, { ...(init as object), dispatcher: agentFor(route) } as Parameters<typeof undiciFetch>[1]);
        sticky = { route, until: Date.now() + STICKY_MS };
        return res as unknown as Response;
      } catch (err) {
        if (init?.signal?.aborted || !unreachable(err)) throw err;
        last = err;
      }
    }
  }
  const tried = order.map((r) => (r === "direct" ? tr("err.soclaasDirect") : "relay")).join(tr("err.soclaasAnd"));
  throw new Error(tr("err.soclaas", { tried, m: String((last as Error)?.message ?? last) }));
};
