import { LoginForm } from "@/components/auth/login-form";
import { isRegistrationEnabled } from "@/lib/actions/settings";

// Login page talks to the DB (via isRegistrationEnabled) — never prerender.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const registrationEnabled = await isRegistrationEnabled();
  return <LoginForm registrationEnabled={registrationEnabled} />;
}
