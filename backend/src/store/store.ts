import type {
  UserProfile,
  Friend,
  PartyMode,
  VitalsTick,
  MemoryItem,
  ChatMessage,
} from "@drunk-buddy/shared";

// State behind an interface so the agent never touches Redis directly.
// MemoryStore (default) and RedisStore both implement it; swap via REDIS_URL.
export interface Store {
  getProfile(phone: string): Promise<UserProfile | null>;
  setProfile(phone: string, profile: UserProfile): Promise<void>;

  getFriends(phone: string): Promise<Friend[]>;
  addFriend(phone: string, friend: Friend): Promise<void>;

  getBlocklist(phone: string): Promise<string[]>;
  addBlocklist(phone: string, name: string): Promise<void>;

  getParty(phone: string): Promise<PartyMode>;
  setParty(phone: string, party: PartyMode): Promise<void>;

  pushVitals(phone: string, tick: VitalsTick): Promise<void>;
  getVitals(phone: string): Promise<VitalsTick[]>;

  addMemory(phone: string, fact: string): Promise<void>;
  recallMemory(phone: string, query?: string): Promise<MemoryItem[]>;

  getLastSeen(phone: string): Promise<number | null>;
  setLastSeen(phone: string, ts: number): Promise<void>;

  getConversation(phone: string): Promise<ChatMessage[]>;
  appendConversation(phone: string, msg: ChatMessage): Promise<void>;
}

export const VITALS_CAP = 50;
export const CONVO_CAP = 20;

// Idempotent add: the agent often re-saves an already-known contact, which used
// to append a duplicate (and would double-alert in an emergency). Match on phone
// when both have one, else on name (case-insensitive); update in place if found.
export function upsertFriend(friends: Friend[], friend: Friend): Friend[] {
  const sameContact = (a: Friend, b: Friend) =>
    a.phone && b.phone
      ? a.phone === b.phone
      : a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  const idx = friends.findIndex((f) => sameContact(f, friend));
  if (idx >= 0) friends[idx] = friend;
  else friends.push(friend);
  return friends;
}
