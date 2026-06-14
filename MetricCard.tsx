import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    text: string;
    isPositive: boolean;
  };
  highlightClass?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlightClass = "border-slate-100",
}: MetricCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-5 border ${highlightClass} shadow-xs transition-transform hover:-translate-y-0.5 duration-200`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-medium text-slate-500 tracking-wider uppercase block">{title}</span>
          <span className="text-2xl font-bold font-display text-slate-900 block mt-1 leading-none">{value}</span>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
          {icon}
        </div>
      </div>
      
      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend && (
            <span 
              className={`font-semibold px-1.5 py-0.5 rounded-sm ${
                trend.isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {trend.text}
            </span>
          )}
          {subtitle && <span className="text-slate-500 select-none">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
