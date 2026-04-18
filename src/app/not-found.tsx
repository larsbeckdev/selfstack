import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Seite nicht gefunden</p>
        <Button asChild>
          <Link href="/dashboard">Zurück zum Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
