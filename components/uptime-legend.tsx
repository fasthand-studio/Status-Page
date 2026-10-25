const LEGEND = [
  { className: 'bg-ok', label: '99.9–100%' },
  { className: 'bg-ok/70', label: '99–99.9%' },
  { className: 'bg-warn', label: '95–99%' },
  { className: 'bg-bad', label: 'Below 95%' },
  { className: 'bg-ink/10', label: 'No checks' },
];

export function UptimeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 fh-r-sm border border-line/80 bg-surface/60 px-4 py-3">
      <span className="font-sans text-[13px] text-muted">One bar = one UTC day</span>
      {LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <span className={`h-2.5 w-2.5 fh-bar ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
