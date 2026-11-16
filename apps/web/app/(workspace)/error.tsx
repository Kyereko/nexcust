'use client';
export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-white p-8">
      <h1 className="text-xl font-semibold text-red-800">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">The request could not be completed. Please try again.</p>
      <button onClick={reset} className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white">Retry</button>
    </div>
  );
}
