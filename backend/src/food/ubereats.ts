import { chromium, type Browser, type Page } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import { config } from "../config";
import { log } from "../log";

// Drive the REAL Uber Eats web app in a Browserbase cloud browser via raw
// playwright-core over CDP — same approach as rides/uber.ts (Stagehand's act()
// was too unreliable). Model = "real quote + one-tap order": find an OPEN
// restaurant near the user, read its name + delivery ETA, and hand back a
// tap-to-order link. We never auto-build a cart or place an order (no fragile
// per-restaurant customization flow, no accidental real charges) — the user taps
// the link and confirms + pays in their own app. Hidden behind Actions.
//
// AUTH: ubereats.com is a DIFFERENT domain than m.uber.com, so it has its own
// login in the persisted context — run `pnpm eats:login` once.

const LIVE_QUOTE = process.env.EATS_LIVE_QUOTE === "true";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface FoodQuote {
  ok: boolean;
  ordered: boolean;
  item?: string;
  place?: string;
  eta?: string;
  total?: string;
  /** Tap-to-order link — opens the chosen restaurant (or search) in Uber Eats. */
  link?: string;
  note?: string;
}

/** Uber Eats search link — the dependable fallback (opens the app to results). */
function eatsSearchLink(query: string): string {
  return `https://www.ubereats.com/search?q=${encodeURIComponent(query)}`;
}

export async function orderEats(query: string): Promise<FoodQuote> {
  const link = eatsSearchLink(query);
  if (!LIVE_QUOTE || !config.browserbase.apiKey || !config.browserbase.projectId) {
    return { ok: true, ordered: false, item: query, link, note: "deep link" };
  }

  const bb = new Browserbase({ apiKey: config.browserbase.apiKey });
  let sessionId: string | undefined;
  let browser: Browser | undefined;
  try {
    const session = await bb.sessions.create({
      projectId: config.browserbase.projectId,
      keepAlive: true,
      proxies: true,
      browserSettings: {
        ...(config.browserbase.contextId
          ? { context: { id: config.browserbase.contextId, persist: true } }
          : {}),
        solveCaptchas: true,
        blockAds: true,
        viewport: { width: 1280, height: 900 },
      },
    });
    sessionId = session.id;
    browser = await chromium.connectOverCDP(session.connectUrl);
    const ctx = browser.contexts()[0];
    const page: Page = ctx.pages()[0] ?? (await ctx.newPage());
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(60_000);

    await page.goto("https://www.ubereats.com/", { waitUntil: "domcontentloaded" });
    await sleep(5000);

    if (await eatsLoginWall(page)) {
      log("food.unauthenticated", {});
      return { ok: true, ordered: false, item: query, link, note: "eats not logged in — run pnpm eats:login" };
    }

    // ---- search (results render async, so WAIT for the store cards) ----
    await page.locator('input[placeholder*="Search" i]').first().click({ timeout: 15_000 });
    await sleep(800);
    await page.keyboard.type(query, { delay: 45 });
    await sleep(1200);
    await page.keyboard.press("Enter");
    await page.locator('a[href*="/store/"]').first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {}); // dismiss the suggestions overlay
    await sleep(2500);

    // ---- pick the first OPEN restaurant (open cards show an ETA; closed say "Closed") ----
    const pick = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      const cards = Array.from(doc.querySelectorAll('a[href*="/store/"]')) as any[];
      const open = cards.find(
        (a) => /\d+\s*min/i.test(a.textContent || "") && !/closed/i.test(a.textContent || ""),
      );
      const chosen = open ?? cards[0];
      return chosen
        ? { href: chosen.getAttribute("href"), text: (chosen.textContent || "").trim().slice(0, 120) }
        : null;
    });
    if (!pick?.href) {
      return { ok: true, ordered: false, item: query, link, note: "no open results — deep link" };
    }
    const storeLink = pick.href.startsWith("http") ? pick.href : `https://www.ubereats.com${pick.href}`;

    // ---- open the store for a clean name + delivery ETA ----
    await page.goto(storeLink, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    await sleep(2000);
    await page.screenshot({ path: "/tmp/eats-store.png" }).catch(() => {});
    const info = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      const name = (doc.querySelector("h1")?.textContent || "").trim();
      const body: string = doc.body.innerText || "";
      const eta = body.match(/(\d+\s*(?:–|-|to)\s*\d+|\d+)\s*min/i)?.[0];
      return { name, eta };
    });
    const place = info.name || cleanCardName(pick.text);
    const eta = (info.eta || pick.text.match(/(\d+\s*(?:–|-)?\s*\d*)\s*min/i)?.[0])?.replace(/\s+/g, " ");

    log("food.quote", { query, place, eta });
    return { ok: true, ordered: false, item: query, place, eta, link: storeLink };
  } catch (err) {
    log("food.error", { err: String(err) });
    return { ok: true, ordered: false, item: query, link, note: "hiccup — deep link" };
  } finally {
    await browser?.close().catch(() => {});
    if (sessionId) {
      await bb.sessions
        .update(sessionId, { projectId: config.browserbase.projectId!, status: "REQUEST_RELEASE" })
        .catch((e) => log("food.release_failed", { err: String(e) }));
    }
  }
}

// "McDonald'sSponsored • 25 min • $0 delivery • 4.5" -> "McDonald's"
function cleanCardName(text: string): string {
  return text.split(/Sponsored|Closed|Open|•|\d+\s*min|\$/)[0].trim() || "a spot nearby";
}

async function eatsLoginWall(page: Page): Promise<boolean> {
  if (/\/login|auth\.uber\.com/i.test(page.url())) return true;
  // Logged in => the search box renders; a login wall won't have it.
  const searchVisible = await page
    .locator('input[placeholder*="Search" i]')
    .first()
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  return !searchVisible;
}
