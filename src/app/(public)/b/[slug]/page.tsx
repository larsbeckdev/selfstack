import { redirect } from "next/navigation";

// Legacy URL: /b/<slug> → /<slug>
export default async function LegacyPublicBoardRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}`);
}
