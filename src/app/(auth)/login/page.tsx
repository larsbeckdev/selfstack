import { LoginForm } from "@/components/auth/login-form";
import { isRegistrationEnabled } from "@/lib/actions/settings";

export default async function LoginPage() {
  const registrationEnabled = await isRegistrationEnabled();
  return <LoginForm registrationEnabled={registrationEnabled} />;
}
