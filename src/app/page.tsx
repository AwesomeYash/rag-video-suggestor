import { Suspense } from "react";
import { Header, HeaderShell } from "@/components/header";
import { SearchSection } from "@/components/search-section";

export default function Home() {
  return (
    <>
      <Suspense fallback={<HeaderShell />}>
        <Header />
      </Suspense>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-center text-2xl font-semibold">
          Find the right article
        </h1>
        <Suspense
          fallback={
            <div className="h-12 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          }
        >
          <SearchSection />
        </Suspense>
      </main>
    </>
  );
}
