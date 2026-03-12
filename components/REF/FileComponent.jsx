import React from "react";

const FileIcon = ({ className = "w-5 h-5" }) => (
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
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export default function FileComponent({
  name = "document.pdf",
  size = "2.4 MB",
  date = "Mar 12, 2025",
  type = "PDF",
}) {
  return (
    <div className="group cursor-pointer transition-all duration-300 ease-out">
      <div className="bg-white rounded-[44px] p-6 shadow-sm hover:shadow-lg transition-all duration-300">
        {/* Icon and info row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* File icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-[28px] bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300">
              <FileIcon className="w-6 h-6" />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-primary text-sm truncate group-hover:text-accent transition-colors">
                {name}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-block bg-accent/8 text-accent rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
                  {type}
                </span>
                <span className="text-xs text-text-muted">{size}</span>
              </div>
              <p className="text-xs text-text-muted mt-2">{date}</p>
            </div>
          </div>

          {/* Download icon */}
          <button className="flex-shrink-0 w-10 h-10 rounded-[28px] hover:bg-background transition-colors opacity-0 group-hover:opacity-100">
            <svg
              className="w-5 h-5 text-text-primary mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
