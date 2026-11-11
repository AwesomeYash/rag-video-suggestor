"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="h-9 rounded-full border border-solid border-black/[.12] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.08]"
      onClick={() =>
        authClient.signOut({ fetchOptions: { onSuccess: () => router.refresh() } })
      }
    >
      Sign out
    </button>
  );
}
