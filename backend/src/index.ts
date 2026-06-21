import express from "express";
import { config } from "./config";
import { createStore } from "./store";
import { createLlm } from "./agent/llm";
import { pickActions } from "./tools/actions";
import { handleInbound, type Deps } from "./agent/loop";
import { createLocalChannel, createBlueBubblesChannel, type BlueBubblesChannel } from "@drunk-buddy/channel";
import type { Channel } from "@drunk-buddy/shared";
import { log } from "./log";

// Production-ish entrypoint: serves the BlueBubbles webhook (or runs the local
// channel) and wires every inbound message through the agent loop.
const store = createStore();
const llm = createLlm(config);
const deps: Deps = { store, llm, actions: pickActions(), maxSteps: 6 };

let channel: Channel;
let bluebubbles: BlueBubblesChannel | null = null;
if (config.channel === "bluebubbles") {
  if (!config.bluebubbles.serverUrl || !config.bluebubbles.password) {
    log("config.error", { note: "CHANNEL=bluebubbles but BLUEBUBBLES_SERVER_URL/PASSWORD not set" });
    process.exit(1);
  }
  bluebubbles = createBlueBubblesChannel({
    serverUrl: config.bluebubbles.serverUrl!,
    password: config.bluebubbles.password!,
    method: config.bluebubbles.method,
  });
  channel = bluebubbles;
} else {
  channel = createLocalChannel();
}

channel.onMessage(async (msg) => {
  if (!msg.text) {
    await channel.sendText(msg.chatGuid, "can't hear voice notes yet — text me for now.");
    return;
  }
  const reply = await handleInbound({ phone: msg.phone, text: msg.text }, deps);
  if (reply) await channel.sendText(msg.chatGuid, reply);
});

const app = express();
app.use(express.json({ limit: "10mb" }));
app.get("/health", (_req, res) => {
  res.json({ ok: true, channel: channel.name, model: llm.model });
});
if (bluebubbles) {
  app.post("/imessage/incoming", bluebubbles.webhook());
}

app.listen(config.port, () => log("server.listening", { port: config.port, channel: channel.name }));
await channel.start();
