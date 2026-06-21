import dotenv from "dotenv";

dotenv.config();

export interface Config {
  channel: "local" | "bluebubbles";
  port: number;
  anthropicApiKey?: string;
  model: string;
  redisUrl?: string;
  bluebubbles: {
    serverUrl?: string;
    password?: string;
    method: "apple-script" | "private-api";
  };
  browserbase: {
    apiKey?: string;
    projectId?: string;
    // a Browserbase Context that already holds a logged-in Uber session, so
    // callRide skips OTP at runtime. See README "Live rides" runbook.
    contextId?: string;
  };
  publicUrl?: string;
}

export const config: Config = {
  channel: process.env.CHANNEL === "bluebubbles" ? "bluebubbles" : "local",
  port: Number(process.env.PORT ?? 8787),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
  model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  redisUrl: process.env.REDIS_URL || undefined,
  bluebubbles: {
    serverUrl: process.env.BLUEBUBBLES_SERVER_URL,
    password: process.env.BLUEBUBBLES_PASSWORD,
    method: process.env.BLUEBUBBLES_METHOD === "private-api" ? "private-api" : "apple-script",
  },
  browserbase: {
    apiKey: process.env.BROWSERBASE_API_KEY || undefined,
    projectId: process.env.BROWSERBASE_PROJECT_ID || undefined,
    contextId: process.env.BROWSERBASE_CONTEXT_ID || undefined,
  },
  publicUrl: process.env.PUBLIC_URL,
};
