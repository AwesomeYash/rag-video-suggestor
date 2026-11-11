// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchState } from "@/actions/search";

const searchAction = vi.hoisted(() =>
  vi.fn<(previous: SearchState, formData: FormData) => Promise<SearchState>>(),
);

vi.mock("@/actions/search", () => ({ searchAction }));
vi.mock("@/lib/auth/client", () => ({ authClient: { signIn: { social: vi.fn() } } }));

const { SearchBox } = await import("./search-box");

const article = {
  id: "1",
  title: "How To Center Vertically In CSS",
  description: "Three ways to center an element.",
  thumbnailUrl: "https://example.com/og.webp",
  url: "https://example.com/centering/",
  publishDate: new Date("2020-06-29"),
  type: "article" as const,
  similarity: 0.617,
  startPosition: null,
  rawText: "Centering an element vertically",
};

describe("SearchBox", () => {
  beforeEach(() => searchAction.mockReset());
  afterEach(cleanup);

  it("is disabled when signed out and prompts the user to sign in", () => {
    render(<SearchBox signedIn={false} />);

    expect(screen.getByLabelText("Search the blog")).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /^search$/i })).toHaveProperty("disabled", true);
    expect(screen.getByText("You need to sign in to search.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in with github/i })).toBeTruthy();
  });

  it("is enabled and focused when signed in, with Search disabled until you type", async () => {
    const user = userEvent.setup();
    render(<SearchBox signedIn />);

    const input = screen.getByLabelText("Search the blog");
    expect(input).toHaveProperty("disabled", false);
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole("button", { name: /sign in with github/i })).toBeNull();

    const button = screen.getByRole("button", { name: /^search$/i });
    expect(button).toHaveProperty("disabled", true);
    await user.type(input, "css");
    expect(button).toHaveProperty("disabled", false);
  });

  it("searches, shows the results and keeps the typed query", async () => {
    searchAction.mockResolvedValue({ query: "center a div", results: [article] });
    const user = userEvent.setup();
    render(<SearchBox signedIn />);

    const input = screen.getByLabelText("Search the blog");
    await user.type(input, "center a div{Enter}");

    expect(await screen.findByText("How To Center Vertically In CSS")).toBeTruthy();
    expect(screen.getByText("62% match")).toBeTruthy();
    expect(searchAction.mock.calls[0][1].get("query")).toBe("center a div");
    expect(input).toHaveProperty("value", "center a div");
  });

  it("says when nothing matches well enough", async () => {
    searchAction.mockResolvedValue({ query: "banana bread", results: [] });
    const user = userEvent.setup();
    render(<SearchBox signedIn />);

    await user.type(screen.getByLabelText("Search the blog"), "banana bread{Enter}");

    expect(await screen.findByText(/no results for "banana bread"/i)).toBeTruthy();
  });

  it("shows an error from the server", async () => {
    searchAction.mockResolvedValue({
      query: "css",
      results: [],
      error: "Something went wrong with the search. Try again.",
    });
    const user = userEvent.setup();
    render(<SearchBox signedIn />);

    await user.type(screen.getByLabelText("Search the blog"), "css{Enter}");

    expect((await screen.findByRole("alert")).textContent).toContain("Something went wrong");
  });

  it("shows a searching state while the request is running", async () => {
    let finish: (state: SearchState) => void = () => {};
    searchAction.mockReturnValue(new Promise<SearchState>(resolve => (finish = resolve)));
    const user = userEvent.setup();
    render(<SearchBox signedIn />);

    await user.type(screen.getByLabelText("Search the blog"), "css{Enter}");
    expect(await screen.findByRole("button", { name: /searching/i })).toHaveProperty("disabled", true);

    finish({ query: "css", results: [article] });
    await waitFor(() => expect(screen.getByRole("button", { name: /^search$/i })).toBeTruthy());
  });
});
