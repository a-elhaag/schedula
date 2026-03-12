"use client";

import React, { useState } from "react";
import FileComponent from "../FileComponent";
import SessionCard from "../SessionCard";
import StatCard from "../StatCard";

const DownloadIcon = ({ className = "w-5 h-5" }) => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
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
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export default function DesignShowcase() {
  const [expandedCard, setExpandedCard] = useState(null);

  return (
    <main className="min-h-screen bg-background p-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-16">
        <h1 className="text-display text-text-primary mb-4">
          Schedula Design System
        </h1>
        <p className="text-text-muted text-lg max-w-2xl">
          Clean, institutional design inspired by Apple minimalism. Built with
          DM Sans and DM Serif Display for academic elegance.
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-20">
        {/* Stat Cards Section */}
        <section>
          <h2 className="text-heading text-text-primary mb-8">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Active Sessions"
              value="8"
              trend={{ positive: true, percent: 12 }}
            />
            <StatCard
              label="Hours Scheduled"
              value="24.5"
              trend={{ positive: true, percent: 8 }}
            />
            <StatCard
              label="Completion Rate"
              value="94%"
              trend={{ positive: false, percent: 3 }}
            />
          </div>
        </section>

        {/* Session Cards Section */}
        <section>
          <h2 className="text-heading text-text-primary mb-8">
            This Week's Sessions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SessionCard
              title="Discrete Mathematics"
              time="Mon, 09:30 AM"
              type="Lecture"
              instructor="Dr. Sarah Chen"
              room="Building A, Room 201"
              credits={3}
              enrollment={42}
              description="Study of fundamental discrete mathematics concepts including logic, set theory, combinatorics, and graph theory."
              startDate="Jan 15, 2025"
              endDate="May 10, 2025"
              isStandalone={true}
            />
            <SessionCard
              title="Web Development Workshop"
              time="Wed, 02:00 PM"
              type="Lab"
              instructor="Prof. James Wilson"
              room="Tech Hub, Lab 3"
              credits={2}
              enrollment={28}
              description="Hands-on workshop covering modern web development with React, Node.js, and cloud deployment practices."
              startDate="Jan 20, 2025"
              endDate="May 15, 2025"
              isStandalone={true}
            />
            <SessionCard
              title="Algorithms Discussion"
              time="Thu, 10:15 AM"
              type="Tutorial"
              instructor="Dr. Maria Rodriguez"
              room="Virtual - Zoom"
              credits={1}
              enrollment={35}
              description="In-depth discussion and problem-solving session for advanced algorithmic concepts and optimization techniques."
              startDate="Jan 25, 2025"
              endDate="May 20, 2025"
              isStandalone={true}
            />
            <SessionCard
              title="Database Design"
              time="Fri, 03:30 PM"
              type="Lecture"
              instructor="Dr. Robert Park"
              room="Building B, Room 412"
              credits={4}
              enrollment={52}
              description="Comprehensive course on relational and NoSQL database design, normalization, and scalable data architecture."
              startDate="Jan 10, 2025"
              endDate="May 5, 2025"
              isStandalone={true}
            />
          </div>
        </section>

        {/* Files Section */}
        <section>
          <h2 className="text-heading text-text-primary mb-8">
            Recent Materials
          </h2>
          <div className="space-y-4">
            <FileComponent
              name="lecture-notes-week-5.pdf"
              size="3.2 MB"
              date="2 days ago"
              type="PDF"
            />
            <FileComponent
              name="Assignment-2-completed.docx"
              size="1.8 MB"
              date="Yesterday"
              type="Document"
            />
            <FileComponent
              name="project-requirements.xlsx"
              size="892 KB"
              date="3 days ago"
              type="Spreadsheet"
            />
          </div>
        </section>

        {/* Button Showcase */}
        <section>
          <h2 className="text-heading text-text-primary mb-8">
            Interactive Elements
          </h2>
          <div className="bg-white rounded-[48px] p-8 shadow-sm">
            <div className="flex flex-wrap gap-4">
              {/* Primary Button */}
              <button className="px-8 py-3 bg-accent text-white rounded-full font-semibold text-sm tracking-wide hover:shadow-lg hover:scale-105 transition-all duration-200 ease-out flex items-center gap-2">
                <DownloadIcon className="w-4 h-4" />
                Primary Button
              </button>

              {/* Secondary Button */}
              <button className="px-8 py-3 border-2 border-accent text-accent rounded-full font-semibold text-sm tracking-wide hover:bg-accent/8 transition-all duration-200">
                Secondary Button
              </button>

              {/* Ghost Button */}
              <button className="px-8 py-3 text-text-primary rounded-full font-semibold text-sm tracking-wide hover:bg-background transition-all duration-200">
                Ghost Button
              </button>

              {/* Status Badge */}
              <div className="px-6 py-3 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Completed
              </div>
            </div>

            {/* Text styles showcase */}
            <div className="mt-12 space-y-6 border-t border-border pt-8">
              <div>
                <p className="text-label text-text-muted mb-2">
                  Display Heading
                </p>
                <p className="text-display">Premium academic tool</p>
              </div>
              <div>
                <p className="text-label text-text-muted mb-2">Heading</p>
                <p className="text-heading">Trustworthy, modern, and elegant</p>
              </div>
              <div>
                <p className="text-label text-text-muted mb-2">Body Text</p>
                <p className="text-body text-text-primary max-w-2xl">
                  This design system emphasizes clarity and institutional trust.
                  Every element is carefully crafted with generous spacing,
                  subtle shadows, and smooth interactions to create a premium
                  experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section>
          <h2 className="text-heading text-text-primary mb-8">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="w-full aspect-video rounded-[36px] bg-accent shadow-sm mb-4"></div>
              <p className="text-label text-text-muted mb-1">Accent</p>
              <p className="text-text-primary font-mono text-sm">#0071E3</p>
            </div>
            <div>
              <div className="w-full aspect-video rounded-[36px] bg-surface border border-border shadow-sm mb-4"></div>
              <p className="text-label text-text-muted mb-1">Surface</p>
              <p className="text-text-primary font-mono text-sm">#FFFFFF</p>
            </div>
            <div>
              <div className="w-full aspect-video rounded-[36px] bg-background shadow-sm mb-4"></div>
              <p className="text-label text-text-muted mb-1">Background</p>
              <p className="text-text-primary font-mono text-sm">#F5F5F7</p>
            </div>
            <div>
              <div className="w-full aspect-video rounded-[36px] bg-border shadow-sm mb-4"></div>
              <p className="text-label text-text-muted mb-1">Border</p>
              <p className="text-text-primary font-mono text-sm">#E8E8ED</p>
            </div>
            <div>
              <div className="w-full aspect-video rounded-[36px] bg-text-muted/20 shadow-sm mb-4"></div>
              <p className="text-label text-text-muted mb-1">Text Muted</p>
              <p className="text-text-primary font-mono text-sm">#6E6E73</p>
            </div>
            <div>
              <div className="w-full aspect-video rounded-[36px] bg-text-primary shadow-sm mb-4"></div>
              <p className="text-label text-text-muted mb-1">Text Primary</p>
              <p className="text-text-primary font-mono text-sm">#1D1D1F</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
