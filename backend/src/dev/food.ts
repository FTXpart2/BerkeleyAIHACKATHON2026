import { config } from "../config";
import { orderEats } from "../food/ubereats";

// `pnpm food:test "<what you want>"` — drive the Uber Eats flow in Browserbase
// in isolation, without the agent loop. Use this to tune the act() prompts in
// food/ubereats.ts against the live site. Stops at the cart review unless
// EATS_ORDER_FOR_REAL=true. Watch it live in the Browserbase session inspector.
const query = process.argv[2] ?? "a big greasy cheeseburger and fries";

if (!config.browserbase.apiKey) {
  console.error("set BROWSERBASE_API_KEY (+ PROJECT_ID, CONTEXT_ID) in .env first.");
  process.exit(1);
}

console.error(`ordering: ${query}`);
const quote = await orderEats(query);
console.error("result:", quote);
