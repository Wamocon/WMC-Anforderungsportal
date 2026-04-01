'use client';

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded bg-muted animate-pulse mb-2" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-muted animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-20 rounded bg-muted animate-pulse mb-2" />
                <div className="h-7 w-12 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b last:border-0 p-4">
            <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/5 rounded bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
            <div className="ml-auto h-8 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
