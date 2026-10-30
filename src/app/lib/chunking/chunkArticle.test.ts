import { describe, expect, it } from "vitest";
import { chunkArticle } from "./chunkArticle";

describe("chunkArticle", () => {
  it("puts text before the first h2 in its own chunk", () => {
    const chunks = chunkArticle(`
      <p>Intro one.</p>
      <p>Intro two.</p>
      <h2>First</h2>
      <p>Body of first.</p>
    `);

    expect(chunks).toEqual([
      "Intro one.\n\nIntro two.",
      "First\n\nBody of first.",
    ]);
  });

  it("starts the chunk with the h2 heading and runs to the next h2", () => {
    const chunks = chunkArticle(`
      <h2>One</h2>
      <p>a</p>
      <h3>Sub</h3>
      <p>b</p>
      <h2>Two</h2>
      <p>c</p>
    `);

    expect(chunks).toEqual(["One\n\na\n\nSub\n\nb", "Two\n\nc"]);
  });

  it("returns a single chunk for an article with no h2", () => {
    expect(chunkArticle("<p>Only</p><p>text</p>")).toEqual(["Only\n\ntext"]);
  });

  it("returns no chunks for empty content", () => {
    expect(chunkArticle("")).toEqual([]);
    expect(chunkArticle("  <p> </p>  ")).toEqual([]);
  });

  it("keeps only text, never markup", () => {
    const [chunk] = chunkArticle(
      `<p>Use <a href="/x">the <code>fetch</code></a> <strong>API</strong>.</p>`,
    );

    expect(chunk).toBe("Use the fetch API.");
  });

  it("drops script and style content", () => {
    const chunks = chunkArticle(`
      <p>Visible</p>
      <script>window.secret = 1</script>
      <style>.a { color: red }</style>
    `);

    expect(chunks).toEqual(["Visible"]);
  });

  it("separates list items and table cells", () => {
    const chunks = chunkArticle(`
      <ul><li>One</li><li>Two</li></ul>
      <div><table><tr><td>A</td><td>B</td></tr></table></div>
    `);

    expect(chunks).toEqual(["One\nTwo\n\nA B"]);
  });

  it("keeps code block line breaks and indentation", () => {
    const [chunk] = chunkArticle(
      `<pre><code>if (a) {\n  b()\n}</code></pre>`,
    );

    expect(chunk).toBe("if (a) {\n  b()\n}");
  });

  it("does not split on an h2 nested inside another element", () => {
    const chunks = chunkArticle(`
      <p>Intro</p>
      <div><h2>Demo heading</h2><p>demo</p></div>
      <h2>Real</h2>
      <p>body</p>
    `);

    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toBe("Real\n\nbody");
  });
});
