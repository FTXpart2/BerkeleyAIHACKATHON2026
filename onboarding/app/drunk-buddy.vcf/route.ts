// Serves a contact card so "Add Drunk Buddy" saves the chat under the name
// "Drunk Buddy" (and the card has a Message button that opens iMessage to it).
export function GET() {
  const num = process.env.NEXT_PUBLIC_BUDDY_NUMBER ?? "";
  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Buddy;Drunk;;;",
    "FN:Drunk Buddy",
    num ? `TEL;type=CELL:${num}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Drunk Buddy.vcf"',
    },
  });
}
