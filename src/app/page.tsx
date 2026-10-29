import { Suspense } from "react";
import { AuthStatus } from "./_components/auth-status";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <AuthStatus />
      </Suspense>
    </main>
  );
}
