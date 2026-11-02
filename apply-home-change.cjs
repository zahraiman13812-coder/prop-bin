// One-time targeted edit, preserving the rest of the existing homepage.
const fs = require('node:fs');
const path = require('node:path');
const pagePath = path.join(process.cwd(), 'app', 'page.tsx');
let source = fs.readFileSync(pagePath, 'utf8');
const carouselImport = 'import HomeFirmCarousel from "@/components/HomeFirmCarousel";';
if (!source.includes(carouselImport)) {
  const anchor = 'import FirmCard from "@/components/FirmCard";';
  if (!source.includes(anchor)) throw new Error('Cannot find original FirmCard import in app/page.tsx; no changes written.');
  source = source.replace(anchor, carouselImport);
} else {
  source = source.replace('import FirmCard from "@/components/FirmCard";', '');
}
const startMarker = '<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">\n          {firms.slice(0, 3).map((firm) => (';
const endMarker = '</div>';
if (source.includes(startMarker)) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start) + endMarker.length;
  if (start < 0 || end < endMarker.length) throw new Error('Could not locate homepage firm grid.');
  source = source.slice(0, start) + '<HomeFirmCarousel firms={firms} />' + source.slice(end);
} else if (!source.includes('<HomeFirmCarousel firms={firms} />')) {
  throw new Error('Homepage company grid differs from the expected version; no changes written.');
}
// Preserve existing feature links, append cooperation exactly once.
if (!source.includes('title: "همکاری با ما"')) {
  const anchor = '  {\n    title: "کد تخفیف",\n    href: "/discounts",\n    Icon: TicketPercent,\n  },';
  if (source.includes(anchor)) {
    source = source.replace(anchor, anchor + '\n  { title: "همکاری با ما", href: "/cooperation", Icon: MessageSquare },');
  }
}
fs.writeFileSync(pagePath, source, 'utf8');
console.log('Updated app/page.tsx. The carousel only scrolls horizontally, never the page.');
