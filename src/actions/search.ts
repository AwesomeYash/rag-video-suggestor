"use server";

import { headers } from "next/headers";
import * as z from "zod";
import { auth } from "@/lib/auth/config";
import { searchContent, type SearchResult } from "@/lib/search/searchContent";

// Every search costs an embedding request, so keep queries short
const querySchema = z.string().trim().min(1).max(200);

export type SearchState = {
  query: string;
  results: SearchResult[];
  error?: string;
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

  try {
    return { query: parsed.data, results: await searchContent(parsed.data) };
  } catch (error) {
    console.error("Search failed", error);
    return {
      query: parsed.data,
      results: [],
      error: "Something went wrong with the search. Try again.",
    };
  }
}
