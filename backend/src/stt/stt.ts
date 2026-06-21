export interface Stt {
  transcribe(audio: Buffer, mimeType?: string): Promise<string | null>;
}
