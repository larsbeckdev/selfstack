import { NextResponse } from "next/server";

// Cache the icon list in memory for 24h
let cache: { icons: string[]; at: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ icons: cache.icons });
  }

  try {
    const res = await fetch(
      "https://api.github.com/repos/selfhst/icons/git/trees/main?recursive=1",
      {
        headers: {
          "User-Agent": "selfstack-icon-picker",
          Accept: "application/vnd.github+json",
        },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) {
      return NextResponse.json({ icons: [] }, { status: res.status });
    }
    const data = (await res.json()) as {
      tree: { path: string; type: string }[];
    };
    const icons = data.tree
      .filter(
        (e) =>
          e.type === "blob" &&
          e.path.startsWith("svg/") &&
          e.path.endsWith(".svg"),
      )
      .map((e) => e.path.slice(4, -4));

    cache = { icons, at: Date.now() };
    return NextResponse.json({ icons });
  } catch {
    return NextResponse.json({ icons: [] }, { status: 500 });
  }
}
