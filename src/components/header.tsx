import Image from "next/image";
import { getSession } from "@/lib/auth/getSession";
import { SignInButton } from "./sign-in-button";
import { SignOutButton } from "./sign-out-button";

export function HeaderShell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[.08] bg-background/80 backdrop-blur dark:border-white/[.145]">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <span className="text-lg font-semibold">Blog Search</span>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}

export async function Header() {
  const session = await getSession();

  return (
    <HeaderShell>
      {session == null ? (
        <SignInButton />
      ) : (
        <>
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={`${session.user.name}'s profile picture`}
              width={36}
              height={36}
              className="rounded-full"
            />
          )}
          <span className="text-sm font-medium">{session.user.name}</span>
          <SignOutButton />
        </>
      )}
    </HeaderShell>
  );
}
