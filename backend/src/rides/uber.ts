import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { config } from "../config";
import { log } from "../log";

// Drive the Uber web app in a cloud browser (Browserbase) via Stagehand v3,
// whose LLM-driven act()/extract() survive Uber's shifting DOM. Hidden behind
// the Actions interface — the agent never knows this exists (brief §3).
//
// AUTH: Uber needs a logged-in session + a saved payment method. We reuse a
// Browserbase Context (BROWSERBASE_CONTEXT_ID) that was logged in ONCE by hand,
// so there's no OTP at runtime. See README "Live rides" for the one-time setup.
//
// DEMO-SAFE: by default we stop at the quote and DO NOT confirm the booking.
// Set UBER_BOOK_FOR_REAL=true only once auth + payment are verified on a test
// account (brief §4: a flaky booking can't be allowed to kill the live demo).
const BOOK_FOR_REAL = process.env.UBER_BOOK_FOR_REAL === "true";

export interface RideQuote {
  ok: boolean;
  booked: boolean;
  eta?: string;
  price?: string;
  note?: string;
}

export async function bookUber(destination: string, pickup?: string): Promise<RideQuote> {
  if (!config.browserbase.apiKey || !config.browserbase.projectId) {
    return { ok: false, booked: false, note: "browserbase not configured" };
  }

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: config.browserbase.apiKey,
    projectId: config.browserbase.projectId,
    // reuse our own Anthropic key as Stagehand's planner brain:
    model: { modelName: "anthropic/claude-sonnet-4-6", apiKey: config.anthropicApiKey },
    // reuse the persisted, logged-in Uber session so we skip OTP:
    browserbaseSessionCreateParams: {
      projectId: config.browserbase.projectId,
      ...(config.browserbase.contextId
        ? { browserSettings: { context: { id: config.browserbase.contextId, persist: true } } }
        : {}),
    },
  });

  await stagehand.init();
  try {
    await stagehand.context.newPage("https://m.uber.com/go/home");

    // If the session isn't logged in, bail loudly instead of hanging on OTP.
    const auth = await stagehand.extract(
      "is the user signed in and able to request a ride (NOT on a login/OTP screen)?",
      z.object({ signedIn: z.boolean() }),
    );
    if (!auth.signedIn) {
      log("ride.unauthenticated", {});
      return { ok: false, booked: false, note: "uber session not logged in — refresh BROWSERBASE_CONTEXT_ID" };
    }

    // NOTE: these act() prompts are the part to tune against the live site.
    await stagehand.act(`set the dropoff location to "${destination}"`);
    if (pickup) await stagehand.act(`set the pickup location to "${pickup}"`);
    await stagehand.act("choose the cheapest standard UberX option");

    const quote = await stagehand.extract(
      "read the selected ride's ETA and total price",
      z.object({ eta: z.string(), price: z.string() }),
    );

    let booked = false;
    if (BOOK_FOR_REAL) {
      await stagehand.act("confirm and request the Uber");
      booked = true;
    }

    log("ride.quote", { destination, eta: quote.eta, price: quote.price, booked });
    return { ok: true, booked, eta: quote.eta, price: quote.price };
  } finally {
    await stagehand.close();
  }
}
