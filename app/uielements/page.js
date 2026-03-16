"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/Button";
import { Input } from "@/components/Input";
import { StatCard } from "@/components/StatCard";
import { SessionCard } from "@/components/SessionCard";
import DownloadIcon from "@/components/icons/Download";
import EyeIcon from "@/components/icons/Eye";
import CopyIcon from "@/components/icons/Copy";
import TrashIcon from "@/components/icons/Trash";
import GearIcon from "@/components/icons/Gear";
import XIcon from "@/components/icons/X";
import "./page.css";

export default function Home() {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownClosing, setDropdownClosing] = useState(false);
  const dropdownRef = useRef(null);

  const handleDropdownClose = () => {
    setDropdownClosing(true);
    setTimeout(() => {
      setOpenDropdown(null);
      setDropdownClosing(false);
    }, 180);
  };

  // Close dropdown when clicking outside — only active while open
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownClosing(true);
        setTimeout(() => {
          setOpenDropdown(null);
          setDropdownClosing(false);
        }, 180);
      }
    };
    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const components = [
    {
      id: "button",
      label: "Button Component",
      description: "Primary, Secondary, Ghost, Destructive",
    },
    {
      id: "input",
      label: "Input Component",
      description: "Standard text, email, and password fields",
    },
    {
      id: "stat-card",
      label: "Stat Card",
      description: "Analytics dashboard metric card",
    },
    {
      id: "session-card",
      label: "Session Card",
      description: "Course and class scheduling card",
    },
    // Add more components here as we create them
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-brand">Schedula</h1>

          {/* Component Showcase Dropdown */}
          <div className="dropdown-container" ref={dropdownRef}>
            <button
              onClick={() =>
                openDropdown === "components" || dropdownClosing
                  ? handleDropdownClose()
                  : setOpenDropdown("components")
              }
              className="dropdown-trigger"
            >
              {openDropdown === "components" || dropdownClosing ? (
                <XIcon size={18} />
              ) : (
                <>
                  <GearIcon size={18} />
                  Components
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {(openDropdown === "components" || dropdownClosing) && (
              <div
                className={`dropdown-menu${dropdownClosing ? " dropdown-menu--closing" : ""}`}
              >
                <div className="dropdown-header">
                  <p className="dropdown-header-label">UI Components</p>
                </div>
                <div className="dropdown-items">
                  {components.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => {
                        document
                          .getElementById(comp.id)
                          ?.scrollIntoView({ behavior: "smooth" });
                        handleDropdownClose();
                      }}
                      className="dropdown-item"
                    >
                      <p className="dropdown-item-title">{comp.label}</p>
                      <p className="dropdown-item-description">
                        {comp.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Component Library</h2>
            <p className="section-description">
              A curated collection of Schedula UI components built according to
              our design specification. Explore each component in its various
              states and configurations.
            </p>
          </div>
        </section>

        {/* Button Component Showcase */}
        <section id="button" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Button</h3>
            <p className="section-description">
              Versatile button component supporting 4 variants and multiple
              sizes.
            </p>
          </div>

          {/* Variants Grid */}
          <div className="section">
            {/* Primary Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Primary</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="primary" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="primary" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="primary" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="primary" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Secondary</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="secondary" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="secondary" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="secondary" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="secondary" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ghost Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Ghost</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="ghost" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="ghost" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="ghost" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="ghost" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Destructive Buttons */}
            <div className="subsection">
              <h4 className="variant-title">Destructive</h4>
              <div className="card">
                <div className="grid-4-cols">
                  <div className="btn-group">
                    <Button variant="destructive" size="sm">
                      Small
                    </Button>
                    <p className="btn-label">sm</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="destructive" size="md">
                      Medium
                    </Button>
                    <p className="btn-label">md</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="destructive" size="lg">
                      Large
                    </Button>
                    <p className="btn-label">lg</p>
                  </div>
                  <div className="btn-group">
                    <Button variant="destructive" disabled>
                      Disabled
                    </Button>
                    <p className="btn-label">disabled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* With Icons */}
            <div className="subsection">
              <h4 className="variant-title">With Icons</h4>
              <div className="card">
                <div className="flex-wrap">
                  <Button variant="primary" icon={<DownloadIcon size={18} />}>
                    Download
                  </Button>
                  <Button variant="secondary" icon={<EyeIcon size={18} />}>
                    View
                  </Button>
                  <Button variant="ghost" icon={<CopyIcon size={18} />}>
                    Copy Link
                  </Button>
                  <Button variant="destructive" icon={<TrashIcon size={18} />}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Reference */}
        <section className="subsection">
          <h3 className="subsection-title">Usage</h3>
          <div className="code-block">
            <pre>{`import Button from '@/components/Button';
import DownloadIcon from '@/components/icons/Download';
import RocketIcon from '@/components/icons/Rocket';

// Primary Button
<Button variant="primary">Click me</Button>

// Secondary Button
<Button variant="secondary">Secondary</Button>

// Ghost Button
<Button variant="ghost">Ghost</Button>

// Destructive Button
<Button variant="destructive">Delete</Button>

// With Vector Icon
<Button icon={<DownloadIcon size={18} />}>
  Download
</Button>

<Button icon={<RocketIcon size={18} />}>
  Launch
</Button>

// Different Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Disabled State
<Button disabled>Disabled</Button>`}</pre>
          </div>
        </section>
        {/* Input Component Showcase */}
        <section id="input" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Input</h3>
            <p className="section-description">
              Standard inputs with the signature 20px border radius and focus
              ring.
            </p>
          </div>

          <div className="section">
            <div className="card">
              <div
                className="flex-wrap"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                  maxWidth: "400px",
                }}
              >
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="coordinator@university.edu"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                />
                <Input
                  label="Search"
                  type="text"
                  placeholder="Search courses or staff..."
                />
              </div>
            </div>
          </div>
        </section>

        {/* StatCard Showcase */}
        <section id="stat-card" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Stat Card</h3>
            <p className="section-description">
              Fixed 250x180px analytic cards with soft hover elevation.
            </p>
          </div>

          <div className="section">
            <div
              className="grid-3-cols"
              style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}
            >
              <div style={{ paddingBottom: "20px" }}>
                <StatCard
                  label="Total Students"
                  value="4,291"
                  Icon={EyeIcon}
                  trend="12%"
                  trendUp={true}
                />
              </div>
              <div style={{ paddingBottom: "20px" }}>
                <StatCard
                  label="Rooms Available"
                  value="14"
                  Icon={GearIcon}
                  trend="3%"
                  trendUp={false}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SessionCard Showcase */}
        <section id="session-card" className="subsection">
          <div className="section-header">
            <h3 className="subsection-title">Session Card</h3>
            <p className="section-description">
              Course representations with 44px border radius and dynamic left
              borders.
            </p>
          </div>

          <div className="section">
            <div
              className="grid-2-cols"
              style={{ display: "flex", flexWrap: "wrap", gap: "40px" }}
            >
              <div style={{ paddingBottom: "30px" }}>
                <SessionCard
                  time="09:00 AM - 10:30 AM"
                  title="CS 101: Introduction to Computer Science"
                  type="Lecture"
                  instructor="Dr. Alan Turing"
                  room="Turing Hall - 402"
                />
              </div>
              <div style={{ paddingBottom: "30px" }}>
                <SessionCard
                  time="11:00 AM - 12:30 PM"
                  title="CS 101L: Python Programming Lab"
                  type="Lab"
                  instructor="Ada Lovelace"
                  room="Computer Lab B"
                />
              </div>
              <div style={{ paddingBottom: "30px" }}>
                <SessionCard
                  time="02:00 PM - 03:00 PM"
                  title="CS 101T: Weekly Discussion Group"
                  type="Tutorial"
                  instructor="Grace Hopper"
                  room="Seminar Room 3"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
