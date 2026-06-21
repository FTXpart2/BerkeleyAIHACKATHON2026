import { config } from "../config";
import { bookUber } from "../rides/uber";

// `pnpm ride:test "<destination>"` — drive the Uber flow in Browserbase in
// isolation, without the agent loop. Use this to tune the act() prompts in
// rides/uber.ts against the live site. Stops at the quote unless
// UBER_BOOK_FOR_REAL=true. Watch it live in the Browserbase session inspector.
const destination = process.argv[2] ?? "221B Baker St, San Francisco";

if (!config.browserbase.apiKey) {
  console.error("set BROWSERBASE_API_KEY (+ PROJECT_ID, CONTEXT_ID) in .env first.");
  process.exit(1);
}

console.error(`booking ride to: ${destination}`);
const quote = await bookUber(destination);
console.error("result:", quote);
