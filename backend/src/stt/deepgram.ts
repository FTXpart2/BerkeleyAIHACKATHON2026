import { createClient } from "@deepgram/sdk";
import type { Stt } from "./stt";

export class DeepgramStt implements Stt {
  private client: ReturnType<typeof createClient>;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  async transcribe(audio: Buffer, mimeType?: string): Promise<string | null> {
    const { result } = await this.client.listen.prerecorded.transcribeFile(audio, {
      model: "nova-2",
      smart_format: true,
      mimetype: mimeType ?? "audio/wav",
    });

    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    return transcript || null;
  }
}
