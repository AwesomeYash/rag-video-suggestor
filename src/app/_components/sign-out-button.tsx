"use client";

import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth/client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="h-12 rounded-full border border-solid border-black/[.08] px-5 font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      onClick={() =>
        authClient.signOut({ fetchOptions: { onSuccess: () => router.refresh() } })
      }
    >
      Sign out
    </button>
  );
}
