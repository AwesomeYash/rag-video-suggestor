import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./config";

// Cached for the duration of a request, so the header and the search box can
// both read the session without two database lookups.
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
