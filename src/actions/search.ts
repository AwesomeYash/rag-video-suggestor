"use server";

import { headers } from "next/headers";
import * as z from "zod";
import { auth } from "@/lib/auth/config";
import {
  checkRateLimit,
  deleteSearch,
  recordSearch,
  saveSearchResults,
} from "@/lib/search/rateLimit";
import { searchContent, type SearchResult } from "@/lib/search/searchContent";

// Every search costs an embedding request, so keep queries short
const querySchema = z.string().trim().min(1).max(200);

export type SearchState = {
  query: string;
  results: SearchResult[];
  error?: string;
  // Lets the UI show the user hitting their limit differently from a failure
  errorType?: "rate-limited";
} | null;

export async function searchAction(
  _previousState: SearchState,
  formData: FormData,
): Promise<SearchState> {
  // Server Actions are public endpoints, so check the session here and don't
  // rely on the search box being disabled in the UI
  const session = await auth.api.getSession({ headers: await headers() });
  if (session == null) {
    return { query: "", results: [], error: "Sign in to search." };
  }

  const parsed = querySchema.safeParse(formData.get("query"));
  if (!parsed.success) {
    return {
      query: "",
      results: [],
      error: "Enter a search between 1 and 200 characters.",
    };
  }

  const query = parsed.data;
  let searchId: string | undefined;

  try {
    // Check before doing any work, since each search costs an embedding request
    const limit = await checkRateLimit(session.user.id);
    if (!limit.allowed) {
      return {
        query,
        results: [],
        error: limit.message,
        errorType: "rate-limited",
      };
    }

    // Saved before the search runs so it counts towards the limit straight away
    searchId = await recordSearch(session.user.id, query);
    const results = await searchContent(query);

    try {
      await saveSearchResults(
        searchId,
        results.map(result => result.id),
      );
    } catch (error) {
      // The user still gets their results; the log just misses them
      console.error("Failed to save the search results", error);
    }

    return { query, results };
  } catch (error) {
    console.error("Search failed", error);

    // A search that failed shouldn't use up the user's limit
    if (searchId != null) {
      await deleteSearch(searchId).catch(deleteError =>
        console.error("Failed to remove the failed search", deleteError),
      );
    }

    return {
      query,
      results: [],
      error: "Something went wrong with the search. Try again.",
    };
  }
}
