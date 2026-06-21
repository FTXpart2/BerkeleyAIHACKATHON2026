// The buddy's iMessage number. Set it in onboarding/.env.local, e.g.:
//   NEXT_PUBLIC_BUDDY_NUMBER=+15551234567
// (the dedicated Apple ID number BlueBubbles texts from).
export const BUDDY_NUMBER = process.env.NEXT_PUBLIC_BUDDY_NUMBER ?? "";

// Opens Messages straight to the buddy with a prefilled first text, which kicks
// off onboarding the moment they hit send. Falls back to the #get anchor until
// the number is configured.
export const messageBuddyHref = BUDDY_NUMBER
  ? `sms:${BUDDY_NUMBER}&body=${encodeURIComponent("hey")}`
  : "#get";

// One-tap "Add Drunk Buddy" — downloads a contact card so the chat shows the
// name "Drunk Buddy" (and gives a Message button right on the card).
export const addBuddyHref = "/drunk-buddy.vcf";
