"use client";

import React, { useRef, useState } from "react";

const ChevronDownIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 14l-7 7m0 0l-7-7m7 7V3"
    />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const CalendarIcon = ({ className = "w-4 h-4" }) => (
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
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const DocumentIcon = ({ className = "w-4 h-4" }) => (
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

const UsersIcon = ({ className = "w-4 h-4" }) => (
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
      d="M17 20h5v-2a3 3 0 00-5.856-1.487M7 20H2v-2a3 3 0 015.856-1.487M15 7a3 3 0 11-6 0 3 3 0 016 0zM4 9a2 2 0 11-4 0 2 2 0 014 0zm16 0a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const MapPinIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const UserIcon = ({ className = "w-4 h-4" }) => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const BadgeVariant = ({ type }) => {
  const variants = {
    Lecture: { bg: "bg-blue-50", text: "text-blue-700", label: "Lecture" },
    Tutorial: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      label: "Tutorial",
    },
    Lab: { bg: "bg-purple-50", text: "text-purple-700", label: "Lab" },
  };

  const variant = variants[type] || variants["Lecture"];

  return (
    <span
      className={`${variant.bg} ${variant.text} text-xs font-bold tracking-wider rounded-full px-3 py-1 inline-block`}
    >
      {variant.label}
    </span>
  );
};

export default function SessionCard({
  title = "Discrete Mathematics",
  time = "09:30 AM",
  type = "Lecture",
  instructor = "Dr. Sarah Chen",
  room = "Building A, Room 201",
  credits = 3,
  enrollment = 42,
  description = "Study of fundamental discrete mathematics concepts including logic, set theory, combinatorics, and graph theory.",
  syllabus = "/downloads/course-syllabus.pdf",
  startDate = "Jan 15, 2025",
  endDate = "May 10, 2025",
  isStandalone = false,
}) {
  const cardRef = useRef(null);
  const [overlayStyle, setOverlayStyle] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const getExpandedBounds = () => {
    const maxWidth = Math.min(960, window.innerWidth - 32);
    const width = maxWidth;
    const height = Math.min(720, window.innerHeight - 32);

    return {
      top: Math.max(16, (window.innerHeight - height) / 2),
      left: Math.max(16, (window.innerWidth - width) / 2),
      width,
      height,
      borderRadius: 52,
    };
  };

  const getCollapsedBounds = () => {
    if (!cardRef.current) {
      return null;
    }

    const rect = cardRef.current.getBoundingClientRect();

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      borderRadius: 44,
    };
  };

  const handleExpand = () => {
    if (!isStandalone) {
      return;
    }

    const collapsedBounds = getCollapsedBounds();

    if (!collapsedBounds) {
      return;
    }

    setIsClosing(false);
    setOverlayStyle(collapsedBounds);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsExpanded(true);
        setOverlayStyle(getExpandedBounds());
      });
    });
  };

  const handleClose = () => {
    const collapsedBounds = getCollapsedBounds();

    if (!collapsedBounds) {
      setIsExpanded(false);
      setOverlayStyle(null);
      return;
    }

    setIsClosing(true);
    setIsExpanded(false);
    setOverlayStyle(collapsedBounds);

    window.setTimeout(() => {
      setOverlayStyle(null);
      setIsClosing(false);
    }, 520);
  };

  const durationWeeks = Math.ceil(
    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 7),
  );

  const renderCard = ({ expandedView = false, floating = false } = {}) => {
    const shellClassName = expandedView
      ? "bg-white rounded-[52px] shadow-[0_32px_90px_rgba(29,29,31,0.16)] overflow-hidden border-l-4 border-accent h-full flex flex-col"
      : "bg-white rounded-[44px] shadow-sm overflow-hidden border-l-4 border-accent h-full flex flex-col transition-[transform,box-shadow,border-color,border-width] duration-300 hover:shadow-lg hover:scale-[1.03] hover:border-l-[8px] hover:border-accent/90";

    const contentPadding = expandedView ? "p-8 md:p-10" : "p-6";
    const titleClassName = expandedView
      ? "text-3xl md:text-4xl font-serif text-text-primary"
      : "text-heading font-serif text-lg text-text-primary";
    const metaGap = expandedView ? "space-y-4 mb-8" : "space-y-3 mb-6";
    const statsGridClassName = expandedView
      ? "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      : "grid grid-cols-3 gap-4";

    return (
      <div className={shellClassName}>
        <div className={`${contentPadding} flex-1 overflow-y-auto`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted font-medium tracking-wide mb-1">
                {time}
              </p>
              <h3 className={titleClassName}>{title}</h3>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <BadgeVariant type={type} />
              {!expandedView && isStandalone && !floating && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleExpand();
                  }}
                  className="flex-shrink-0 p-2 rounded-[26px] hover:bg-background transition-all duration-300"
                >
                  <ChevronDownIcon className="w-5 h-5 text-accent" />
                </button>
              )}
              {expandedView && (
                <button
                  onClick={handleClose}
                  className="p-3 rounded-[26px] bg-background text-text-primary hover:bg-border transition-colors duration-200"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div
            className={`h-px bg-border ${expandedView ? "my-6" : "my-4"}`}
          ></div>

          <div className={metaGap}>
            <div
              className={`flex items-center gap-3 ${expandedView ? "text-base" : "text-sm"}`}
            >
              <UserIcon
                className={`${expandedView ? "w-5 h-5" : "w-4 h-4"} text-text-muted flex-shrink-0`}
              />
              <span className="text-text-primary font-medium">
                {instructor}
              </span>
            </div>
            <div
              className={`flex items-center gap-3 ${expandedView ? "text-base" : "text-sm"}`}
            >
              <MapPinIcon
                className={`${expandedView ? "w-5 h-5" : "w-4 h-4"} text-text-muted flex-shrink-0`}
              />
              <span className="text-text-muted">{room}</span>
            </div>
          </div>

          {(expandedView || !isStandalone) && (
            <div className="space-y-5">
              <div>
                <p className="text-label text-text-muted mb-2">About</p>
                <p
                  className={`${expandedView ? "text-lg leading-8" : "text-body leading-relaxed"} text-text-primary`}
                >
                  {description}
                </p>
              </div>

              <div className={statsGridClassName}>
                <div
                  className={`${expandedView ? "rounded-[32px] p-6" : "rounded-[28px] p-4"} bg-background`}
                >
                  <span className="text-xs text-label text-text-muted block mb-2">
                    Credits
                  </span>
                  <span
                    className={`${expandedView ? "text-3xl" : "text-2xl"} font-bold text-accent`}
                  >
                    {credits}
                  </span>
                </div>
                <div
                  className={`${expandedView ? "rounded-[32px] p-6" : "rounded-[28px] p-4"} bg-background`}
                >
                  <span className="text-xs text-label text-text-muted block mb-2">
                    Enrolled
                  </span>
                  <span
                    className={`${expandedView ? "text-3xl" : "text-2xl"} font-bold text-accent`}
                  >
                    {enrollment}
                  </span>
                </div>
                <div
                  className={`${expandedView ? "rounded-[32px] p-6" : "rounded-[28px] p-4"} bg-background`}
                >
                  <span className="text-xs text-label text-text-muted block mb-2">
                    Duration
                  </span>
                  <span
                    className={`${expandedView ? "text-sm" : "text-xs"} text-text-primary font-medium`}
                  >
                    {durationWeeks} weeks
                  </span>
                </div>
                {expandedView && (
                  <div className="rounded-[32px] p-6 bg-background">
                    <span className="text-xs text-label text-text-muted block mb-2">
                      Status
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  </div>
                )}
              </div>

              <div
                className={`${expandedView ? "rounded-[32px] p-5 mb-2" : "rounded-[28px] p-4 text-sm"} flex items-center gap-3 bg-background/80`}
              >
                <CalendarIcon
                  className={`${expandedView ? "w-5 h-5" : "w-4 h-4"} text-text-muted flex-shrink-0`}
                />
                <span className="text-text-primary font-medium">
                  {startDate} → {endDate}
                </span>
              </div>

              <div
                className={`flex ${expandedView ? "gap-4 pt-2" : "gap-3 pt-4"}`}
              >
                <button
                  className={`${expandedView ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"} flex-1 rounded-full bg-accent font-semibold text-white transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2`}
                >
                  <DocumentIcon
                    className={`${expandedView ? "w-5 h-5" : "w-4 h-4"}`}
                  />
                  {expandedView ? "Download Syllabus" : "Syllabus"}
                </button>
                <button
                  className={`${expandedView ? "px-6 py-3 text-base" : "px-4 py-2 text-sm"} flex-1 rounded-full border-2 border-accent text-accent font-semibold transition-all duration-200 hover:bg-accent/8 flex items-center justify-center gap-2`}
                >
                  <UsersIcon
                    className={`${expandedView ? "w-5 h-5" : "w-4 h-4"}`}
                  />
                  {expandedView ? "View Roster" : "Roster"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (overlayStyle && isStandalone) {
    return (
      <>
        <div
          className={`fixed inset-0 z-40 bg-[rgba(20,20,24,0.12)] backdrop-blur-sm transition-all duration-500 ${
            isExpanded && !isClosing ? "opacity-100" : "opacity-0"
          }`}
          onClick={handleClose}
        />
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="pointer-events-auto absolute overflow-hidden transition-[top,left,width,height,border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              top: overlayStyle.top,
              left: overlayStyle.left,
              width: overlayStyle.width,
              height: overlayStyle.height,
              borderRadius: overlayStyle.borderRadius,
            }}
          >
            {renderCard({ expandedView: isExpanded, floating: true })}
          </div>
        </div>
        <div ref={cardRef} className="opacity-0 pointer-events-none">
          {renderCard()}
        </div>
      </>
    );
  }

  if (isStandalone) {
    return (
      <div
        ref={cardRef}
        className="group cursor-pointer"
        onClick={handleExpand}
      >
        {renderCard()}
      </div>
    );
  }

  return <div>{renderCard({ expandedView: true })}</div>;
}
