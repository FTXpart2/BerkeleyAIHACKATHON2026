import { TOOLS } from "../agent/tools";

const VOICE_EXCLUDED = new Set(["block_intercept", "update_profile"]);

export function getVoiceTools() {
  return TOOLS.filter((t) => !VOICE_EXCLUDED.has(t.name)).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }));
}
