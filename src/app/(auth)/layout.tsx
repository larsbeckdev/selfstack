import { AuthLanguageToggle } from "@/components/auth/auth-language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <ThemeToggle />
        <AuthLanguageToggle />
      </div>
      <div className="w-full max-w-sm sm:max-w-md">{children}</div>
    </div>
  );
}
