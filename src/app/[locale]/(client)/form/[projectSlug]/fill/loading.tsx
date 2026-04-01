'use client';

export default function FormFillLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header skeleton */}
      <header className="border-b border-border/40 glass-v2">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="h-8 w-32 rounded-md bg-muted animate-pulse" />
          <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress bar skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted animate-pulse mb-8" />

        {/* Section title skeleton */}
        <div className="h-7 w-60 rounded bg-muted animate-pulse mb-6" />

        {/* Question cards skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4 rounded-xl border-0 bg-card/80 shadow-md p-5">
            {/* Question label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
            </div>
            {/* Input area */}
            <div className={`rounded-lg bg-muted animate-pulse ${i === 2 ? 'h-32' : 'h-10'}`} />
            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40">
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}

        {/* Navigation skeleton */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <div className="h-10 w-28 rounded-md bg-muted animate-pulse" />
          <div className="h-10 w-28 rounded-md bg-muted animate-pulse" />
        </div>
      </main>
    </div>
  );
}
