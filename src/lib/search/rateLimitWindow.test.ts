import { describe, expect, it } from "vitest";
import {
  formatWait,
  getRateLimitStatus,
  getWindowStart,
  rateLimitMessage,
} from "./rateLimitWindow";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const at = (iso: string) => new Date(iso);

describe("getRateLimitStatus", () => {
  const options = { maxRequests: 3, windowMs: HOUR };

  it("allows a search while the user is under the limit", () => {
    expect(getRateLimitStatus([], options)).toEqual({ allowed: true });
    expect(
      getRateLimitStatus(
        [at("2026-01-01T10:30:00Z"), at("2026-01-01T10:10:00Z")],
        options,
      ),
    ).toEqual({ allowed: true });
  });

  it("blocks a search at the limit until the oldest counted search leaves the window", () => {
    // Newest first
    const recent = [
      at("2026-01-01T10:50:00Z"),
      at("2026-01-01T10:20:00Z"),
      at("2026-01-01T10:10:00Z"),
    ];

    expect(getRateLimitStatus(recent, options)).toEqual({
      allowed: false,
      retryAt: at("2026-01-01T11:10:00Z"),
    });
  });

  it("only looks at the newest searches when there are more than the limit", () => {
    const recent = [
      at("2026-01-01T10:55:00Z"),
      at("2026-01-01T10:50:00Z"),
      at("2026-01-01T10:20:00Z"),
      at("2026-01-01T10:10:00Z"),
    ];

    expect(getRateLimitStatus(recent, options)).toEqual({
      allowed: false,
      retryAt: at("2026-01-01T11:20:00Z"),
    });
  });
});

describe("getWindowStart", () => {
  it("goes back the number of hours from the current time", () => {
    const now = at("2026-01-02T12:00:00Z");

    expect(getWindowStart(now, 24)).toEqual(at("2026-01-01T12:00:00Z"));
    expect(getWindowStart(now, 0.5)).toEqual(at("2026-01-02T11:30:00Z"));
  });
});

describe("formatWait", () => {
  it("rounds up to whole minutes", () => {
    expect(formatWait(0)).toBe("less than a minute");
    expect(formatWait(30_000)).toBe("less than a minute");
    expect(formatWait(61_000)).toBe("2 minutes");
    expect(formatWait(12 * MINUTE)).toBe("12 minutes");
  });

  it("includes hours for long waits", () => {
    expect(formatWait(HOUR)).toBe("1 hour");
    expect(formatWait(HOUR + 5 * MINUTE)).toBe("1 hour 5 minutes");
    expect(formatWait(3 * HOUR)).toBe("3 hours");
  });
});

describe("rateLimitMessage", () => {
  it("says the limit, the window and how long to wait", () => {
    const now = at("2026-01-01T11:00:00Z");

    expect(
      rateLimitMessage({
        maxRequests: 10,
        windowHours: 24,
        retryAt: at("2026-01-01T11:12:00Z"),
        now,
      }),
    ).toBe("You've used your 10 searches for the last 24 hours. Try again in 12 minutes.");

    expect(
      rateLimitMessage({
        maxRequests: 1,
        windowHours: 1,
        retryAt: at("2026-01-01T11:30:00Z"),
        now,
      }),
    ).toBe("You've used your 1 search for the last 1 hour. Try again in 30 minutes.");
  });
});
