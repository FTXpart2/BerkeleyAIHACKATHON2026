// Browserbase's free tier allows ONE concurrent cloud-browser session. Rides and
// food both use it, and the agent sometimes fires call_ride twice in a turn — the
// overlap 429s ("max concurrent sessions limit"). This 1-slot semaphore serializes
// every cloud-browser run so overlapping/double-fired calls QUEUE instead of failing.
// One user texting sequentially: this just removes the collision.
let busy = false;
const waiters: Array<() => void> = [];

export async function acquireBrowserSlot(): Promise<() => void> {
  if (busy) await new Promise<void>((resolve) => waiters.push(resolve));
  busy = true;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    busy = false;
    waiters.shift()?.();
  };
}
