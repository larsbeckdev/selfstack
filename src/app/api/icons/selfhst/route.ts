import { NextResponse } from "next/server";

// Cache the icon list in memory for 24h. We pull a small (~800KB) curated
// index.json from the selfhst/icons repo (via jsDelivr) which lists ~2700
// icons by reference name. This avoids GitHub's anonymous tree-API rate
// limit (60/h) that previously caused the picker to silently render empty.
let cache: { icons: string[]; at: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000;

const SOURCES = [
  "https://cdn.jsdelivr.net/gh/selfhst/icons/index.json",
  "https://raw.githubusercontent.com/selfhst/icons/main/index.json",
];

type IndexEntry = { Reference?: string; SVG?: string };

async function fetchIndex(): Promise<string[] | null> {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "selfstack-icon-picker" },
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as IndexEntry[];
      if (!Array.isArray(data)) continue;
      const icons = data
        .filter((e) => e?.Reference && e?.SVG === "Yes")
        .map((e) => e!.Reference as string)
        .sort();
      if (icons.length > 0) return icons;
    } catch {
      // try next source
    }
  }
  return null;
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ icons: cache.icons });
  }

  const icons = await fetchIndex();
  if (icons) {
    cache = { icons, at: Date.now() };
    return NextResponse.json({ icons });
  }

  // Fall back to the previously cached list (even if stale) before giving up
  // so a transient upstream failure doesn't blank out the picker.
  if (cache) {
    return NextResponse.json({ icons: cache.icons });
  }

  return NextResponse.json({ icons: [] }, { status: 502 });
}
