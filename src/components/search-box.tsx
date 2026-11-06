"use client";

import { useActionState } from "react";
import { searchAction, type SearchState } from "@/actions/search";
import { SearchResults } from "./search-results";
import { SignInButton } from "./sign-in-button";

export function SearchBox({ signedIn }: { signedIn: boolean }) {
  const [state, formAction, pending] = useActionState<SearchState, FormData>(
    searchAction,
    null,
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="flex gap-2">
        <input
          type="search"
          name="query"
          required
          maxLength={200}
          disabled={!signedIn}
          aria-label="Search the blog"
          placeholder={
            signedIn ? "What do you want to learn about?" : "Sign in to search"
          }
          className="h-12 min-w-0 flex-1 rounded-full border border-zinc-300 bg-transparent px-5 outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:focus:border-zinc-400"
        />
        <button
          type="submit"
          disabled={!signedIn || pending}
          className="h-12 rounded-full bg-foreground px-6 font-medium text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {!signedIn && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You need to sign in to search.
          </p>
          <SignInButton />
        </div>
      )}

      {state?.error != null && (
        <p role="alert" className="text-center text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state != null && state.error == null && (
        <>
          <p className="text-sm text-zinc-500">
            {state.results.length === 0
              ? `No results for "${state.query}" with at least a 50% match.`
              : `${state.results.length} result${state.results.length === 1 ? "" : "s"} for "${state.query}"`}
          </p>
          <SearchResults results={state.results} />
        </>
      )}
    </div>
  );
}
