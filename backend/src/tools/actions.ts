// External real-world actions sit behind this interface (brief §5: "mock the
// edges, nail the spine"). Phase 1 ships stubs; Phase 2/3 swap in Browserbase,
// deep links, ElevenLabs, the vitals sim, etc. without touching the agent.

export interface AlertContact {
  name: string;
  phone: string;
}

export interface Actions {
  callRide(input: { phone: string; destination: string }): Promise<string>;
  orderFood(input: { phone: string; query: string }): Promise<string>;
  alertCircle(input: {
    phone: string;
    reason: string;
    location?: string;
    contacts: AlertContact[];
  }): Promise<string>;
  blockIntercept(input: {
    phone: string;
    target_name: string;
    draft?: string;
    blocklist: string[];
  }): Promise<{ allow: boolean; line: string }>;
  getVitals(input: { phone: string }): Promise<string>;
}

export const stubActions: Actions = {
  async callRide({ destination }) {
    return `[stub] ride booked to ${destination} — blue Civic, 4 min out`;
  },
  async orderFood({ query }) {
    return `[stub] ordered ${query} — eta ~25 min`;
  },
  async alertCircle({ reason, location, contacts }) {
    const who = contacts.map((c) => c.name).join(", ") || "emergency contacts";
    return `[stub] alerted ${who}${location ? ` with location ${location}` : ""}: ${reason}`;
  },
  async blockIntercept({ target_name, blocklist }) {
    const blocked = blocklist.includes(target_name.toLowerCase());
    return {
      allow: !blocked,
      line: blocked
        ? `no. absolutely not. you are NOT texting ${target_name} right now. sleep on it, talk to me tomorrow.`
        : `ok — but keep it together.`,
    };
  },
  async getVitals() {
    return "[stub] hr 78, hrv 55, moving around — looks normal";
  },
};
