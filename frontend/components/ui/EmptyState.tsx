export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M2 4a2 2 0 012-2h8a2 2 0 012 2v2h2a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-2H2a2 2 0 01-2-2V4zm4 10v2h10V8h-2v4a2 2 0 01-2 2H6zM4 4v8h8V4H4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}
