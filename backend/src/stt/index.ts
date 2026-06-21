import type { Config } from "../config";
import type { Stt } from "./stt";
import { DeepgramStt } from "./deepgram";
import { stubStt } from "./stub";
import { log } from "../log";

export type { Stt } from "./stt";

export function createStt(config: Config): Stt {
  if (config.deepgramApiKey) {
    log("stt.init", { provider: "deepgram" });
    return new DeepgramStt(config.deepgramApiKey);
  }
  log("stt.init", { provider: "stub", note: "no DEEPGRAM_API_KEY" });
  return stubStt;
}

export { convertToWav } from "./convert";
