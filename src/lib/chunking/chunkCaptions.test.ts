import { describe, expect, it } from "vitest";
import { chunkCaptions, parseCaptions, type CaptionSegment } from "./chunkCaptions";

// n segments named "s0", "s1", ..., each starting 1000ms after the last
const segments = (n: number): CaptionSegment[] =>
  Array.from({ length: n }, (_, i) => ({ text: `s${i}`, startTime: i * 1000 }));

describe("parseCaptions", () => {
  it("returns each caption's text and start time in milliseconds", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,500
Hello there

2
00:01:02,250 --> 00:01:05,000
General Kenobi
`;

    expect(parseCaptions(srt)).toEqual([
      { text: "Hello there", startTime: 1000 },
      { text: "General Kenobi", startTime: 62250 },
    ]);
  });

  it("joins multi-line captions, strips tags and entities, and drops empty ones", () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
<i>Tom &amp; Jerry</i>
are  here

2
00:00:02,000 --> 00:00:03,000
<i></i>
`;

    expect(parseCaptions(srt)).toEqual([
      { text: "Tom & Jerry are here", startTime: 0 },
    ]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseCaptions("")).toEqual([]);
  });
});

describe("chunkCaptions", () => {
  it("makes chunks of 15 segments that overlap by 3", () => {
    const chunks = chunkCaptions(segments(40));
    const words = chunks.map(chunk => chunk.text.split(" "));

    expect(words[0]).toHaveLength(15);
    expect(words[0][0]).toBe("s0");
    expect(words[0][14]).toBe("s14");
    // The next chunk starts 12 segments in, so segments 12-14 appear in both
    expect(words[1][0]).toBe("s12");
    expect(words[1].slice(0, 3)).toEqual(["s12", "s13", "s14"]);
    expect(words[0].slice(-3)).toEqual(["s12", "s13", "s14"]);
    expect(words[1]).toHaveLength(15);
  });

  it("starts each chunk at the time its first segment starts", () => {
    const chunks = chunkCaptions(segments(40));

    expect(chunks.map(chunk => chunk.startTime)).toEqual([0, 12000, 24000, 36000]);
  });

  it("covers every segment, including a shorter final chunk", () => {
    const chunks = chunkCaptions(segments(40));
    const all = new Set(chunks.flatMap(chunk => chunk.text.split(" ")));

    expect(all.size).toBe(40);
    // 0-14, 12-26, 24-38, then 36-39
    expect(chunks.at(-1)?.text).toBe("s36 s37 s38 s39");
  });

  it("makes one chunk when everything fits, with no chunk that only repeats the tail", () => {
    expect(chunkCaptions(segments(15))).toHaveLength(1);
    expect(chunkCaptions(segments(5))).toHaveLength(1);
    expect(chunkCaptions(segments(1))).toHaveLength(1);
  });

  it("makes a second chunk as soon as there is a segment past the first 15", () => {
    const chunks = chunkCaptions(segments(16));

    expect(chunks).toHaveLength(2);
    expect(chunks[1].text).toBe("s12 s13 s14 s15");
  });

  it("returns nothing when there are no segments", () => {
    expect(chunkCaptions([])).toEqual([]);
  });

  it("rejects an overlap that is not smaller than the chunk", () => {
    expect(() => chunkCaptions(segments(10), { chunkSize: 5, overlapSize: 5 })).toThrow();
  });
});
