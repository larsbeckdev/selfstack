import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });

  // If user doesn't need to change password, send them to dashboard
  if (!user?.mustChangePassword) redirect("/dashboard");

  return <ChangePasswordForm />;
}
