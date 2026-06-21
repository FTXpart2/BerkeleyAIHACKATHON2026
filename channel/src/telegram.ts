import type { Channel, InboundHandler, InboundMessage } from "@drunk-buddy/shared";

// Telegram bot adapter via long-polling (getUpdates). Needs NO public tunnel, NO
// webhook, NO carrier registration, NO cost — just a bot token from @BotFather.
// People message the bot from the Telegram app on any phone; the buddy replies.
// Join key = "tg:<user id>" (Telegram has no phone numbers); emergency contacts the
// user gives during onboarding are still real phone numbers for later alerts.

export interface TelegramConfig {
  botToken: string;
}

export function createTelegramChannel(config: TelegramConfig): Channel {
  let handler: InboundHandler | null = null;
  const api = `https://api.telegram.org/bot${config.botToken}`;
  let offset = 0;
  let running = false;

  async function send(chatId: string, text: string): Promise<void> {
    const res = await fetch(`${api}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) throw new Error(`telegram sendMessage -> ${res.status}: ${await res.text()}`);
  }

  async function pollOnce(): Promise<void> {
    const res = await fetch(`${api}/getUpdates?timeout=30&offset=${offset}`);
    if (!res.ok) throw new Error(`telegram getUpdates -> ${res.status}`);
    const data: any = await res.json();
    for (const update of data.result ?? []) {
      offset = (update.update_id ?? 0) + 1;
      const m = update.message;
      const chatId = m?.chat?.id;
      if (chatId == null) continue;
      const msg: InboundMessage = {
        phone: `tg:${m.from?.id ?? chatId}`,
        chatGuid: String(chatId),
        text: typeof m.text === "string" ? m.text : undefined,
        raw: update,
      };
      if (handler) await handler(msg);
    }
  }

  async function pollLoop(): Promise<void> {
    while (running) {
      try {
        await pollOnce();
      } catch (err) {
        console.error("[telegram] poll error", err);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return {
    name: "telegram",
    onMessage(h) {
      handler = h;
    },
    async sendText(chatGuid, text) {
      await send(chatGuid, text);
    },
    async sendAudio(chatGuid, _filePath) {
      await send(chatGuid, "[voice note — coming in phase 2]");
    },
    async start() {
      running = true;
      void pollLoop();
      console.error("[telegram] long-polling started — message your bot to begin");
    },
  };
}
