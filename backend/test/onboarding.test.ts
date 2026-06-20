import { describe, it, expect } from "vitest";
import { onboardingStatus } from "../src/onboarding/onboarding";

describe("onboardingStatus", () => {
  it("reports the required fields that are still missing", () => {
    const s = onboardingStatus(null, []);
    expect(s.armed).toBe(false);
    expect(s.missing).toContain("name");
    expect(s.missing).toContain("home address");
    expect(s.missing).toContain("at least one emergency contact");
  });

  it("is armed once name, home, and an emergency contact exist", () => {
    const s = onboardingStatus(
      { phone: "+1", name: "Harsh", home_address: "221B", created_at: 1 },
      [{ name: "Sam", phone: "+2", is_emergency: true }],
    );
    expect(s.armed).toBe(true);
    expect(s.missing).toHaveLength(0);
  });

  it("does not arm on a non-emergency contact alone", () => {
    const s = onboardingStatus(
      { phone: "+1", name: "Harsh", home_address: "221B", created_at: 1 },
      [{ name: "Sam", phone: "+2", is_emergency: false }],
    );
    expect(s.armed).toBe(false);
  });
});
