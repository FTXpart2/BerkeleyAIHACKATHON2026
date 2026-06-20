// Tiny structured logger. Writes to stderr so stdout stays clean for the chat
// REPL. This is also the seam where Arize/Phoenix tracing bolts on in Phase 3.
export function log(event: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const suffix = data ? " " + JSON.stringify(data) : "";
  console.error(`[${ts}] ${event}${suffix}`);
}
