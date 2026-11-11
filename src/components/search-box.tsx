"use client";

import { startTransition, useActionState, useState } from "react";
import { searchAction, type SearchState } from "@/actions/search";
import { SearchResults } from "./search-results";
import { SignInButton } from "./sign-in-button";

export function SearchBox({ signedIn }: { signedIn: boolean }) {
  const [state, formAction, pending] = useActionState<SearchState, FormData>(
    searchAction,
    null,
  );
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Run the action here instead of through the form's `action` prop, which
    // would clear the input after every search
    event.preventDefault();
    if (!signedIn || pending || !query.trim()) return;

    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            name="query"
            value={query}
            onChange={event => setQuery(event.target.value)}
            maxLength={200}
            disabled={!signedIn}
            autoFocus={signedIn}
            aria-label="Search the blog"
            placeholder={
              signedIn
                ? "What do you want to learn about?"
                : "Sign in to search"
            }
            className="block h-12 w-full rounded-full border border-zinc-300 bg-white pl-12 pr-4 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
          />
        </div>
        <button
          type="submit"
          disabled={!signedIn || pending || !query.trim()}
          className="flex h-12 items-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <>
              <Spinner className="h-4 w-4" />
              Searching
            </>
          ) : (
            <>
              <SearchIcon className="h-4 w-4" />
              Search
            </>
          )}
        </button>
      </form>

      {!signedIn && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You need to sign in to search.
          </p>
          <SignInButton />
        </div>
      )}

      {state?.error != null &&
        (state.errorType === "rate-limited" ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <p className="font-medium">Search limit reached</p>
            <p className="mt-1">{state.error}</p>
          </div>
        ) : (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          >
            {state.error}
          </div>
        ))}

      {state != null && state.error == null && (
        <div className={pending ? "opacity-50 transition-opacity" : undefined}>
          <p className="mb-3 text-sm text-zinc-500">
            {state.results.length === 0
              ? `No results for "${state.query}" with at least a 50% match.`
              : `${state.results.length} result${state.results.length === 1 ? "" : "s"} for "${state.query}"`}
          </p>
          <SearchResults results={state.results} />
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
