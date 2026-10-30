import * as cheerio from "cheerio";

// Elements whose contents are never prose.
const NON_TEXT_SELECTOR = "script, style, noscript";

// Descendants that should start a new line / be separated from their neighbours,
// since `.text()` concatenates adjacent elements without any whitespace.
const LINE_BREAK_SELECTOR =
  "p, li, div, tr, blockquote, pre, dt, dd, figcaption, h1, h2, h3, h4, h5, h6";
const CELL_SELECTOR = "td, th";

/**
 * Splits the HTML of an article's main content into plain-text chunks.
 *
 * - Every top-level `<h2>` starts a new chunk. The heading text is the first
 *   piece of text in that chunk, followed by everything up to the next `<h2>`.
 * - Any text before the first `<h2>` is saved as its own chunk.
 * - Only text is kept, never HTML markup.
 */
export function chunkArticle(html: string): string[] {
  const $ = cheerio.load(html, null, false);
  const chunks: string[] = [];
  let current: string[] = [];

  function flush() {
    if (current.length > 0) chunks.push(current.join("\n\n"));
    current = [];
  }

  $.root()
    .children()
    .each((_, element) => {
      const text = extractText($(element));
      if (element.type === "tag" && element.name === "h2") flush();
      if (text) current.push(text);
    });
  flush();

  return chunks;
}

function extractText($element: ReturnType<cheerio.CheerioAPI>): string {
  if ($element.is(NON_TEXT_SELECTOR)) return "";

  const $clone = $element.clone();
  $clone.find(NON_TEXT_SELECTOR).remove();
  $clone.find("br").replaceWith("\n");
  $clone.find(CELL_SELECTOR).append(" ");
  $clone.find(LINE_BREAK_SELECTOR).append("\n");

  const isPreformatted = $clone.is("pre");

  const lines = $clone
    .text()
    .split("\n")
    .map(line =>
      isPreformatted ? line.trimEnd() : line.replace(/\s+/g, " ").trim(),
    );

  // Keep code blocks verbatim; elsewhere drop the blank lines the appended
  // newlines above would otherwise leave behind.
  return (isPreformatted ? lines : lines.filter(Boolean)).join("\n").trim();
}
