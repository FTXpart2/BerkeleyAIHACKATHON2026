import { describe, it, expect } from "vitest";
import { MemoryStore } from "../src/store/memory";

describe("MemoryStore", () => {
  it("saves and reads a profile", async () => {
    const s = new MemoryStore();
    await s.setProfile("+1", { phone: "+1", name: "Harsh", created_at: 1 });
    expect((await s.getProfile("+1"))?.name).toBe("Harsh");
  });

  it("adds friends and blocklist names", async () => {
    const s = new MemoryStore();
    await s.addFriend("+1", { name: "Sam", phone: "+2", is_emergency: true });
    await s.addBlocklist("+1", "jordan");
    await s.addBlocklist("+1", "jordan"); // dedupes
    expect(await s.getFriends("+1")).toHaveLength(1);
    expect(await s.getBlocklist("+1")).toEqual(["jordan"]);
  });

  it("does not duplicate a re-saved emergency contact", async () => {
    const s = new MemoryStore();
    // the agent often re-saves the same contact across turns
    await s.addFriend("+1", { name: "Sam", phone: "+2", is_emergency: true });
    await s.addFriend("+1", { name: "Sam", phone: "+2", is_emergency: true });
    const friends = await s.getFriends("+1");
    expect(friends).toHaveLength(1);
  });

  it("updates a contact in place when re-saved with the same phone", async () => {
    const s = new MemoryStore();
    await s.addFriend("+1", { name: "Sam", phone: "+2", is_emergency: false });
    await s.addFriend("+1", { name: "Samuel", phone: "+2", is_emergency: true });
    const friends = await s.getFriends("+1");
    expect(friends).toHaveLength(1);
    expect(friends[0]).toEqual({ name: "Samuel", phone: "+2", is_emergency: true });
  });

  it("caps the conversation buffer at 20", async () => {
    const s = new MemoryStore();
    for (let i = 0; i < 25; i++) await s.appendConversation("+1", { role: "user", content: String(i) });
    const c = await s.getConversation("+1");
    expect(c).toHaveLength(20);
    expect(c[0].content).toBe("5");
  });
});
