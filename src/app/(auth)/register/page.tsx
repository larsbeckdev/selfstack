import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { isRegistrationEnabled } from "@/lib/actions/settings";

export default async function RegisterPage() {
  const enabled = await isRegistrationEnabled();
  if (!enabled) redirect("/login");
  return <RegisterForm />;
}
