"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/Button";
import DownloadIcon from "@/components/icons/Download";
import EyeIcon from "@/components/icons/Eye";
import CopyIcon from "@/components/icons/Copy";
import TrashIcon from "@/components/icons/Trash";
import GearIcon from "@/components/icons/Gear";
import XIcon from "@/components/icons/X";

export default function Home() {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const components = [
    {
      id: "button",
      label: "Button Component",
      description: "Primary, Secondary, Ghost, Destructive",
    },
    // Add more components here as we create them
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/75 backdrop-blur-[20px] border-b border-border">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <h1 className="text-xl font-serif font-bold text-text-primary">
            Schedula
          </h1>

          {/* Component Showcase Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() =>
                setOpenDropdown(
                  openDropdown === "components" ? null : "components",
                )
              }
              className="px-4 py-2 rounded-full bg-accent text-white font-sans font-bold text-sm hover:scale-105 transition-transform duration-200 flex items-center gap-2"
            >
              {openDropdown === "components" ? (
                <XIcon size={18} />
              ) : (
                <>
                  <GearIcon size={18} />
                  Components
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {openDropdown === "components" && (
              <div className="absolute right-0 mt-2 w-72 bg-surface rounded-3xl shadow-lg border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border">
                  <p className="text-xs font-label text-text-muted">
                    UI Components
                  </p>
                </div>
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {components.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => {
                        document
                          .getElementById(comp.id)
                          ?.scrollIntoView({ behavior: "smooth" });
                        setOpenDropdown(null);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-background transition-colors duration-150"
                    >
                      <p className="font-sans font-bold text-sm text-text-primary">
                        {comp.label}
                      </p>
                      <p className="font-sans text-xs text-text-muted mt-1">
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
      <main className="max-w-6xl mx-auto px-8 py-24">
        {/* Hero Section */}
        <section className="mb-32">
          <h2 className="text-display font-serif font-black text-text-primary mb-4">
            Component Library
          </h2>
          <p className="text-body text-text-muted max-w-2xl">
            A curated collection of Schedula UI components built according to
            our design specification. Explore each component in its various
            states and configurations.
          </p>
        </section>

        {/* Button Component Showcase */}
        <section id="button" className="mb-32 scroll-mt-20">
          <div className="mb-8">
            <h3 className="text-heading font-serif font-black text-text-primary mb-2">
              Button
            </h3>
            <p className="text-body text-text-muted">
              Versatile button component supporting 4 variants and multiple
              sizes.
            </p>
          </div>

          {/* Variants Grid */}
          <div className="space-y-12">
            {/* Primary Buttons */}
            <div>
              <h4 className="text-subheading font-sans font-bold text-text-primary mb-6">
                Primary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-surface rounded-3xl shadow-sm border border-border">
                <div className="flex flex-col gap-3">
                  <Button variant="primary" size="sm">
                    Small
                  </Button>
                  <p className="text-label text-text-muted text-center">sm</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="primary" size="md">
                    Medium
                  </Button>
                  <p className="text-label text-text-muted text-center">md</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="primary" size="lg">
                    Large
                  </Button>
                  <p className="text-label text-text-muted text-center">lg</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="primary" disabled>
                    Disabled
                  </Button>
                  <p className="text-label text-text-muted text-center">
                    disabled
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div>
              <h4 className="text-subheading font-sans font-bold text-text-primary mb-6">
                Secondary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-surface rounded-3xl shadow-sm border border-border">
                <div className="flex flex-col gap-3">
                  <Button variant="secondary" size="sm">
                    Small
                  </Button>
                  <p className="text-label text-text-muted text-center">sm</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="secondary" size="md">
                    Medium
                  </Button>
                  <p className="text-label text-text-muted text-center">md</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="secondary" size="lg">
                    Large
                  </Button>
                  <p className="text-label text-text-muted text-center">lg</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="secondary" disabled>
                    Disabled
                  </Button>
                  <p className="text-label text-text-muted text-center">
                    disabled
                  </p>
                </div>
              </div>
            </div>

            {/* Ghost Buttons */}
            <div>
              <h4 className="text-subheading font-sans font-bold text-text-primary mb-6">
                Ghost
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-surface rounded-3xl shadow-sm border border-border">
                <div className="flex flex-col gap-3">
                  <Button variant="ghost" size="sm">
                    Small
                  </Button>
                  <p className="text-label text-text-muted text-center">sm</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="ghost" size="md">
                    Medium
                  </Button>
                  <p className="text-label text-text-muted text-center">md</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="ghost" size="lg">
                    Large
                  </Button>
                  <p className="text-label text-text-muted text-center">lg</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="ghost" disabled>
                    Disabled
                  </Button>
                  <p className="text-label text-text-muted text-center">
                    disabled
                  </p>
                </div>
              </div>
            </div>

            {/* Destructive Buttons */}
            <div>
              <h4 className="text-subheading font-sans font-bold text-text-primary mb-6">
                Destructive
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-surface rounded-3xl shadow-sm border border-border">
                <div className="flex flex-col gap-3">
                  <Button variant="destructive" size="sm">
                    Small
                  </Button>
                  <p className="text-label text-text-muted text-center">sm</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="destructive" size="md">
                    Medium
                  </Button>
                  <p className="text-label text-text-muted text-center">md</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="destructive" size="lg">
                    Large
                  </Button>
                  <p className="text-label text-text-muted text-center">lg</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="destructive" disabled>
                    Disabled
                  </Button>
                  <p className="text-label text-text-muted text-center">
                    disabled
                  </p>
                </div>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <h4 className="text-subheading font-sans font-bold text-text-primary mb-6">
                With Icons
              </h4>
              <div className="flex flex-wrap gap-6 p-8 bg-surface rounded-3xl shadow-sm border border-border">
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
        </section>

        {/* Code Reference */}
        <section className="mb-16">
          <h3 className="text-heading font-serif font-black text-text-primary mb-6">
            Usage
          </h3>
          <div className="bg-surface rounded-3xl shadow-sm border border-border p-8">
            <pre className="text-xs font-mono text-text-primary overflow-x-auto">
              {`import Button from '@/components/Button';
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
<Button disabled>Disabled</Button>`}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
