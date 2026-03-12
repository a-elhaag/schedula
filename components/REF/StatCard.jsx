import React from "react";

const BookOpenIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 6.253v13m0-13C6.228 6.228 2 7.486 2 12s4.228 5.772 10 5.772m0-13c5.771 0 10 1.258 10 5.772m0 0c0 4.514-4.229 5.772-10 5.772m0 0c-5.771 0-10-1.258-10-5.772"
    />
  </svg>
);

export default function StatCard({
  label = "Active Sessions",
  value = "8",
  icon: Icon = BookOpenIcon,
  trend = null,
}) {
  return (
    <div className="group cursor-pointer">
      <div className="bg-white rounded-[44px] p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.04]">
        {/* Icon */}
        <div className="w-14 h-14 rounded-[28px] bg-accent/8 flex items-center justify-center text-accent mb-6 group-hover:bg-accent/12 transition-colors">
          <Icon className="w-7 h-7" />
        </div>

        {/* Label */}
        <p className="text-label text-text-muted mb-3">{label}</p>

        {/* Value */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-accent">{value}</span>
          {trend && (
            <span
              className={`text-xs font-semibold tracking-wider ${trend.positive ? "text-emerald-600" : "text-red-600"}`}
            >
              {trend.positive ? "↑" : "↓"} {trend.percent}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
