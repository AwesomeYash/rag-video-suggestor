import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchResult } from "@/lib/search/searchContent";
import { SearchResults } from "./search-results";

const result = (overrides: Partial<SearchResult>): SearchResult => ({
  id: "1",
  title: "How To Center Vertically In CSS",
  description: "Three ways to center an element.",
  thumbnailUrl: "https://example.com/og.webp",
  url: "https://example.com/centering/",
  publishDate: new Date("2020-06-29"),
  type: "article",
  similarity: 0.617,
  startPosition: null,
  rawText: "Centering an element vertically",
  ...overrides,
});

describe("SearchResults", () => {
  it("shows the thumbnail, title, description, match percent and link", () => {
    const html = renderToStaticMarkup(<SearchResults results={[result({})]} />);

    expect(html).toContain("How To Center Vertically In CSS");
    expect(html).toContain("Three ways to center an element.");
    expect(html).toContain("62% match");
    expect(html).toContain('href="https://example.com/centering/"');
    expect(html).toContain("https://example.com/og.webp");
    expect(html).toContain("Jun 29, 2020");
  });

  it("keeps the order it is given", () => {
    const html = renderToStaticMarkup(
      <SearchResults
        results={[
          result({ id: "a", title: "First", similarity: 0.9 }),
          result({ id: "b", title: "Second", similarity: 0.6 }),
        ]}
      />,
    );

    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
  });
});
