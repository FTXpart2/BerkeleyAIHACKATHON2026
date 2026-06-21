import type { Stt } from "./stt";

export const stubStt: Stt = {
  async transcribe() {
    return "[voice note — stub transcription] hey can you get me a ride home";
  },
};
