import { config } from "../config";
import { Stagehand } from "@browserbasehq/stagehand";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

// One-time setup: `pnpm uber:login`.
// Creates a persistent Browserbase Context, opens Uber in a cloud browser, and
// lets you log in by hand via the live view. On exit the logged-in session is
// saved into the Context so the agent never hits an OTP at runtime — paste the
// printed BROWSERBASE_CONTEXT_ID into .env. (Uber Eats shares the same login.)
const API = "https://api.browserbase.com/v1";

async function main() {
  const { apiKey, projectId } = config.browserbase;
  if (!apiKey || !projectId) {
    console.error("Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID in .env first.");
    process.exit(1);
  }

  // 1) fresh persistent context
  const res = await fetch(`${API}/contexts`, {
    method: "POST",
    headers: { "X-BB-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) {
    console.error("Couldn't create Browserbase context:", res.status, await res.text());
    process.exit(1);
  }
  const contextId = ((await res.json()) as { id: string }).id;
  console.log("\ncreated Browserbase context:", contextId);

  // 2) open Uber in a cloud browser bound to that context (persist=true saves login)
  const sh = new Stagehand({
    env: "BROWSERBASE",
    apiKey,
    projectId,
    model: { modelName: "anthropic/claude-sonnet-4-6", apiKey: config.anthropicApiKey },
    browserbaseSessionCreateParams: {
      projectId,
      browserSettings: { context: { id: contextId, persist: true } },
    },
  });
  await sh.init();
  const sessionId = (sh as any).browserbaseSessionID as string | undefined;
  await sh.context.newPage("https://auth.uber.com/v2/");

  console.log("\n=== LOG INTO UBER (one time) ===");
  if (sessionId) console.log("Live view:  https://www.browserbase.com/sessions/" + sessionId);
  console.log("…or open browserbase.com → Sessions → click the running session.");
  console.log("Sign in to Uber with your phone + OTP and make sure a payment method is set.\n");

  const rl = createInterface({ input: stdin, output: stdout });
  await rl.question("Press Enter once you're fully logged into Uber… ");
  rl.close();

  await sh.close(); // persists the login into the context
  console.log("\n✅ done. Add these to .env, then restart the backend:\n");
  console.log("BROWSERBASE_CONTEXT_ID=" + contextId);
  console.log("UBER_BOOK_FOR_REAL=true     # flip on when you actually want it to book\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
