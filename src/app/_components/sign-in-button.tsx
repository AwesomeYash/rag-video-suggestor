"use client";

import { authClient } from "../lib/auth/client";

export function SignInButton() {
  return (
    <button
      className="h-12 rounded-full bg-foreground px-5 font-medium text-background transition-opacity hover:opacity-80"
      onClick={() =>
        authClient.signIn.social({ provider: "github", callbackURL: "/" })
      }
    >
      Sign in with GitHub
    </button>
  );
}
