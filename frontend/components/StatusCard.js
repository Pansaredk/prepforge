export default function StatusCard({ title, status, description, badgeColor = 'green' }) {
  const badgeClasses = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const dotClasses = {
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-500',
  };

  const selectedBadgeClass = badgeClasses[badgeColor] || badgeClasses.green;
  const selectedDotClass = dotClasses[badgeColor] || dotClasses.green;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${selectedBadgeClass}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${selectedDotClass}`} />
          {status}
        </span>
      </div>
      {description && (
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
