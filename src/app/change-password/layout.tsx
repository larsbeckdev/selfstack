import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {children}
    </div>
  );
}
