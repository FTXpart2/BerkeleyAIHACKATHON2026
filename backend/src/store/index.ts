import { config } from "../config";
import { log } from "../log";
import type { Store } from "./store";
import { MemoryStore } from "./memory";
import { RedisStore } from "./redis";

export type { Store } from "./store";
export { MemoryStore } from "./memory";
export { RedisStore } from "./redis";

export function createStore(): Store {
  if (config.redisUrl) {
    log("store.redis");
    return new RedisStore(config.redisUrl);
  }
  log("store.memory", { note: "no REDIS_URL set — using in-memory store" });
  return new MemoryStore();
}
