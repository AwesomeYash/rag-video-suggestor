import Image from "next/image";
import type { SearchResult } from "@/lib/search/searchContent";

export function SearchResults({ results }: { results: SearchResult[] }) {
  return (
    <ul className="space-y-3">
      {results.map(result => (
        <li key={result.id}>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            {/* Thumbnails are small and already optimized, so skip Next's image optimizer */}
            <Image
              src={result.thumbnailUrl}
              alt=""
              width={176}
              height={96}
              unoptimized
              className="h-24 w-44 shrink-0 rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <h2 className="line-clamp-2 text-sm font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {result.title}
                </h2>
                <span className="shrink-0 text-sm font-semibold text-green-600 dark:text-green-400">
                  {Math.round(result.similarity * 100)}% match
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {result.description}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-medium capitalize dark:bg-zinc-800">
                  {result.type}
                </span>
                <span className="ml-2">
                  {result.publishDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </p>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
