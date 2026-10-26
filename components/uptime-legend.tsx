const LEGEND = [
  { className: 'bg-ok', label: '99.9–100%' },
  { className: 'bg-ok/70', label: '99–99.9%' },
  { className: 'bg-warn', label: '95–99%' },
  { className: 'bg-bad', label: 'Below 95%' },
  { className: 'bg-[#dfe3e8]', label: 'No checks' },
];

export function UptimeLegend({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-muted ${className ?? ''}`}>
      {LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 fh-bar ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
