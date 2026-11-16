export default function AccessDenied() {
  return (
    <div className="rounded-lg border border-red-200 bg-white p-8">
      <h1 className="text-xl font-semibold text-red-800">Access denied</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-600">You are not authorized to view that record or section. It is outside your role or jurisdiction, and the attempt has been recorded in the audit trail.</p>
    </div>
  );
}
