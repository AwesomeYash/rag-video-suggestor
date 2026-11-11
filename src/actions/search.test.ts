import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  checkRateLimit: vi.fn(),
  recordSearch: vi.fn(),
  saveSearchResults: vi.fn(),
  deleteSearch: vi.fn(),
  searchContent: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/config", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("@/lib/search/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  recordSearch: mocks.recordSearch,
  saveSearchResults: mocks.saveSearchResults,
  deleteSearch: mocks.deleteSearch,
}));
vi.mock("@/lib/search/searchContent", () => ({
  searchContent: mocks.searchContent,
}));

const { searchAction } = await import("./search");

function form(query: string) {
  const formData = new FormData();
  formData.set("query", query);
  return formData;
}

describe("searchAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.recordSearch.mockResolvedValue("search-1");
    mocks.saveSearchResults.mockResolvedValue(undefined);
    mocks.deleteSearch.mockResolvedValue(undefined);
  });

  it("records the search, runs it and saves the ids of the results", async () => {
    mocks.searchContent.mockResolvedValue([{ id: "a" }, { id: "b" }]);

    const state = await searchAction(null, form("  css grid  "));

    expect(state).toEqual({ query: "css grid", results: [{ id: "a" }, { id: "b" }] });
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("user-1");
    expect(mocks.recordSearch).toHaveBeenCalledWith("user-1", "css grid");
    expect(mocks.saveSearchResults).toHaveBeenCalledWith("search-1", ["a", "b"]);
  });

  it("returns a rate limit error without recording or running the search", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      message: "Try again in 5 minutes.",
    });

    const state = await searchAction(null, form("css grid"));

    expect(state).toEqual({
      query: "css grid",
      results: [],
      error: "Try again in 5 minutes.",
      errorType: "rate-limited",
    });
    expect(mocks.recordSearch).not.toHaveBeenCalled();
    expect(mocks.searchContent).not.toHaveBeenCalled();
  });

  it("removes the saved search when the search fails, so it doesn't count", async () => {
    mocks.searchContent.mockRejectedValue(new Error("embedding down"));

    const state = await searchAction(null, form("css grid"));

    expect(state?.error).toMatch(/something went wrong/i);
    expect(state?.errorType).toBeUndefined();
    expect(mocks.deleteSearch).toHaveBeenCalledWith("search-1");
  });

  it("still returns the results when saving them to the log fails", async () => {
    mocks.searchContent.mockResolvedValue([{ id: "a" }]);
    mocks.saveSearchResults.mockRejectedValue(new Error("db down"));

    const state = await searchAction(null, form("css grid"));

    expect(state).toEqual({ query: "css grid", results: [{ id: "a" }] });
    expect(mocks.deleteSearch).not.toHaveBeenCalled();
  });

  it("does nothing for a signed-out user", async () => {
    mocks.getSession.mockResolvedValue(null);

    const state = await searchAction(null, form("css grid"));

    expect(state?.error).toBe("Sign in to search.");
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.recordSearch).not.toHaveBeenCalled();
  });

  it("does not count an invalid query", async () => {
    const state = await searchAction(null, form("   "));

    expect(state?.error).toMatch(/between 1 and 200/);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.recordSearch).not.toHaveBeenCalled();
  });
});
