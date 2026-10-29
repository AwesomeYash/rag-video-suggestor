import Image from "next/image";
import { headers } from "next/headers";
import { auth } from "../lib/auth/config";
import { SignInButton } from "./sign-in-button";
import { SignOutButton } from "./sign-out-button";

export async function AuthStatus() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session == null) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-zinc-600 dark:text-zinc-400">You are not signed in.</p>
        <SignInButton />
      </div>
    );
  }

  const { name, image } = session.user;

  return (
    <div className="flex flex-col items-center gap-4">
      {image && (
        <Image
          src={image}
          alt={`${name}'s profile picture`}
          width={96}
          height={96}
          className="rounded-full"
        />
      )}
      <p className="text-xl font-semibold">{name}</p>
      <SignOutButton />
    </div>
  );
}
