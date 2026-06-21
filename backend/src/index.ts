import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { config } from "./config";
import { createStore } from "./store";
import { createLlm } from "./agent/llm";
import { stubActions } from "./tools/actions";
import { handleInbound, type Deps } from "./agent/loop";
import { createLocalChannel, createBlueBubblesChannel, type BlueBubblesChannel } from "@drunk-buddy/channel";
import type { Channel, InboundMessage } from "@drunk-buddy/shared";
import { createStt, convertToWav } from "./stt";
import { VoiceSession } from "./voice";
import { log } from "./log";

// Production-ish entrypoint: serves the BlueBubbles webhook (or runs the local
// channel) and wires every inbound message through the agent loop.
const store = createStore();
const llm = createLlm(config);
const stt = createStt(config);
const deps: Deps = { store, llm, actions: stubActions, maxSteps: 6 };

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
  let text = msg.text;

  if (!text && msg.attachment && isAudio(msg.attachment.mimeType)) {
    try {
      const audio = await downloadAudio(msg);
      if (audio) {
        log("voice.transcribing", { mime: msg.attachment.mimeType });
        const wav = await convertToWav(audio, extFromMime(msg.attachment.mimeType));
        text = await stt.transcribe(wav, "audio/wav") ?? undefined;
        if (text) log("voice.transcribed", { text });
      }
    } catch (err) {
      log("voice.error", { error: String(err) });
    }
  }

  if (!text) {
    await channel.sendText(msg.chatGuid, "couldn't catch that — text me instead?");
    return;
  }

  const reply = await handleInbound({ phone: msg.phone, text }, deps);
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

const server = createServer(app);

// Voice agent WebSocket — connect with ?phone=<caller-phone> to start a session.
// Sends/receives raw linear16 audio at 16kHz.
if (config.deepgramApiKey && config.anthropicApiKey) {
  const wss = new WebSocketServer({ server, path: "/voice/stream" });
  const activeSessions = new Map<string, VoiceSession>();

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const phone = url.searchParams.get("phone");
    if (!phone) {
      ws.close(4000, "missing ?phone= query parameter");
      return;
    }

    log("voice.connect", { phone });
    const session = new VoiceSession(ws, phone, {
      store,
      actions: stubActions,
      deepgramApiKey: config.deepgramApiKey!,
      anthropicApiKey: config.anthropicApiKey!,
      model: config.model,
    });

    activeSessions.set(phone, session);
    ws.on("close", () => activeSessions.delete(phone));

    session.init().catch((err) => {
      log("voice.init.error", { phone, error: String(err) });
      ws.close(4001, "session init failed");
    });
  });

  log("voice.ready", { path: "/voice/stream" });
}

server.listen(config.port, () => log("server.listening", { port: config.port, channel: channel.name }));
await channel.start();

function isAudio(mime?: string): boolean {
  return !!mime && (mime.startsWith("audio/") || mime === "application/x-caf");
}

function extFromMime(mime?: string): string {
  const map: Record<string, string> = {
    "audio/x-caf": "caf",
    "application/x-caf": "caf",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/amr": "amr",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };
  return map[mime ?? ""] ?? "m4a";
}

async function downloadAudio(msg: InboundMessage): Promise<Buffer | null> {
  if (msg.attachment?.url) {
    const res = await fetch(msg.attachment.url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  if (msg.attachment?.guid && bluebubbles) {
    return bluebubbles.downloadAttachment(msg.attachment.guid);
  }
  return null;
}
