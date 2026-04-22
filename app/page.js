"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "./landing.css";

export default function LandingPage() {
  const explodeRef = useRef(null);
  const graphRef = useRef(null);
  const gridRef = useRef(null);
  const balanceRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      
      // Global scroll parsing for parallax/marquees
      document.documentElement.style.setProperty("--scroll", scrollY);

      // Utility for calculating sticky section progress
      const getProgress = (ref) => {
        if (!ref.current) return 0;
        const rect = ref.current.getBoundingClientRect();
        const trackHeight = rect.height - vh;
        let p = -rect.top / trackHeight;
        return Math.max(0, Math.min(1, p));
      };

      document.documentElement.style.setProperty("--explode", getProgress(explodeRef));
      document.documentElement.style.setProperty("--graph", getProgress(graphRef));
      document.documentElement.style.setProperty("--grid", getProgress(gridRef));
      
      // Balance progress will trace a sine wave to emulate "weighing" options
      const rawBalance = getProgress(balanceRef);
      // Damps out to 0 at the end
      const tipAmount = Math.sin(rawBalance * Math.PI * 5) * (1 - rawBalance) * 25; 
      document.documentElement.style.setProperty("--tip", tipAmount);
      document.documentElement.style.setProperty("--balance", rawBalance);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if(e.isIntersecting) e.target.classList.add("visible");
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  // Generate 25 scatter blocks for the timetable grid puzzle
  const generateBlocks = () => {
    const blocks = [];
    const colors = ["#0071E3", "#34C759", "#FF9500", "#5856D6", "#FF2D55"];
    for (let i = 0; i < 20; i++) {
        // Random scatter origin positions
        const xStart = (Math.random() - 0.5) * 1000;
        const yStart = (Math.random() - 0.5) * 1000;
        const rotStart = (Math.random() - 0.5) * 360;
        
        blocks.push(
          <div 
            key={i} 
            className="puzzle-block" 
            style={{
              backgroundColor: colors[i % colors.length],
              '--x-start': `${xStart}px`,
              '--y-start': `${yStart}px`,
              '--rot-start': `${rotStart}deg`
            }}
          ></div>
        );
    }
    return blocks;
  };

  return (
    <div className="landing-wrapper">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="nav">
        <span className="nav-brand">Schedula</span>
        <div className="nav-actions">
          <Link href="/signin" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-eyebrow reveal stagger-1">Intelligent Timetabling</span>
          <h1 className="hero-title reveal stagger-2">
            Scheduling that <em>clicks</em> into place.
          </h1>
          <p className="hero-subtitle reveal stagger-3">
            Watch how Schedula dissects your university constraints into a flawless, conflict-free master timetable.
          </p>
          <div className="hero-actions reveal stagger-4">
            <Link href="/signup" className="btn-hero-primary">Start your instance</Link>
          </div>
        </div>
      </section>

      {/* ── Infinite Scroll Marquee ───────────────────────────────────────── */}
      <div className="marquee-wrapper">
        <div className="marquee-track">
          <span>NO DOUBLE BOOKINGS • 100% CONSTRAINTS MET • ZERO GUESSWORK • PERFECT BALANCE •</span>
          <span>NO DOUBLE BOOKINGS • 100% CONSTRAINTS MET • ZERO GUESSWORK • PERFECT BALANCE •</span>
          <span>NO DOUBLE BOOKINGS • 100% CONSTRAINTS MET • ZERO GUESSWORK • PERFECT BALANCE •</span>
        </div>
      </div>

      {/* ── Explode Section ───────────────────────────────────────────────── */}
      <section className="explode-track" ref={explodeRef}>
        <div className="sticky-viewport">
          <div className="explode-text-wrap">
            <h2 className="explode-title">Taking apart the complexity.</h2>
            <p className="explode-desc">
              Every course session has multiple constraints. Schedula unpacks the data — combining staff availability, room capacity, and curriculum rules.
            </p>
          </div>

          <div className="shatter-container">
            <div className="composite-card">
              <div className="comp-header">CS 101: Introduction to Programming</div>
              <div className="comp-meta">Room 404 &nbsp;•&nbsp; Prof. Alan Turing &nbsp;•&nbsp; Monday 09:30</div>
            </div>

            <div className="fly-card piece-course">
              <span className="piece-icon">📚</span>
              <strong>Course Req</strong>
              <span>3 Credits, Level 1</span>
            </div>
            
            <div className="fly-card piece-room">
              <span className="piece-icon">🏫</span>
              <strong>Room Capacity</strong>
              <span>Min 120 seats needed</span>
              <div className="micro-bar"><div className="micro-fill" style={{width: '80%'}}></div></div>
            </div>

            <div className="fly-card piece-staff">
              <span className="piece-icon">👤</span>
              <strong>Prof. Turing</strong>
              <span>Prefers Morning</span>
              <div className="times-grid">
                <span className="day-dot active"></span><span className="day-dot"></span><span className="day-dot active"></span>
              </div>
            </div>

            <div className="fly-card piece-conflict">
              <span className="piece-icon">⚡</span>
              <strong>No Overlaps</strong>
              <span>Strict Rule Enforcement</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dynamic Constraint Balancer Section ───────────────────────────── */}
      <section className="balance-track" ref={balanceRef}>
        <div className="sticky-viewport">
          <div className="balance-text">
            <h2>Weighing Human Preferences</h2>
            <p>Conflicts are hard limits, but preferences are delicate. Schedula evaluates thousands of paths to maximize happiness.</p>
          </div>
          
          <div className="seesaw-container">
            {/* The Pivot Triangle */}
            <div className="pivot-base"></div>
            
            {/* The Rotating Beam */}
            <div className="see-saw-beam">
              <div className="weight-left">
                <div className="weight-box">Room Utilization</div>
              </div>
              <div className="weight-right">
                <div className="weight-box box-accent">Staff Happiness</div>
              </div>
            </div>
            
            <div className="balance-meter">
              <div className="bm-track">
                <div className="bm-indicator"></div>
              </div>
              <div className="bm-label opacity-reveal">Perfect Harmony</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Timetable Puzzle Builder ──────────────────────────────────────── */}
      <section className="grid-track" ref={gridRef}>
        <div className="sticky-viewport dark-mode">
          <div className="grid-layout">
            <div className="grid-copy">
              <h2>The puzzle solves itself.</h2>
              <p>Watch as scattered fragments independently snap into a perfectly validated, zero-conflict weekly calendar.</p>
            </div>
            
            <div className="timetable-puzzle">
              <div className="table-skeleton">
                <div className="skel-row"><div/><div/><div/><div/></div>
                <div className="skel-row"><div/><div/><div/><div/></div>
                <div className="skel-row"><div/><div/><div/><div/></div>
                <div className="skel-row"><div/><div/><div/><div/></div>
                <div className="skel-row"><div/><div/><div/><div/></div>
              </div>
              <div className="puzzle-overlay">
                {generateBlocks()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Graph / Metrics Section ───────────────────────────────────────── */}
      <section className="graph-track" ref={graphRef}>
        <div className="sticky-viewport">
          <div className="graph-layout">
            <div className="graph-copy">
              <h2>From weeks to seconds.</h2>
              <p>
                As the OR-Tools constraint solver runs, hundreds of thousands of permutations are tested. 
                What once took coordinators weeks of spreadsheet wrangling is compressed into a 60-second optimization pass.
              </p>
            </div>
            
            <div className="interactive-chart">
              <div className="chart-bars">
                <div className="chart-col">
                  <div className="bar bar-old">
                    <span className="bar-label">Manual (Weeks)</span>
                  </div>
                </div>
                <div className="chart-col">
                  <div className="bar bar-new">
                    <span className="bar-label">Schedula (60s)</span>
                  </div>
                </div>
              </div>
              
              <div className="conflict-graph">
                <div className="cg-label">Double-booking Conflicts</div>
                <div className="cg-track">
                  <div className="cg-line"></div>
                  <div className="cg-dot"></div>
                </div>
                <div className="cg-value">0</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Visual Process Cards ──────────────────────────────────────────── */}
      <section className="process-section reveal">
        <div className="process-container">
          <h2 className="section-title">The Master Pipeline</h2>
          <div className="process-cards">
            <div className="p-card reveal stagger-1">
              <div className="p-icon">1</div>
              <h3>Intelligent Import</h3>
              <p>Upload your messy CSVs. Schedula's fuzzy-matching engine automatically assigns courses and headers.</p>
            </div>
            <div className="p-card reveal stagger-2">
              <div className="p-icon">2</div>
              <h3>Availability Sync</h3>
              <p>Professors log in to an intuitive mobile-friendly portal to drag-and-drop their teaching availability.</p>
            </div>
            <div className="p-card reveal stagger-3">
              <div className="p-icon">3</div>
              <h3>Publish & Export</h3>
              <p>One click to publish to the whole institution. Students instantly access gorgeous, personalized PDF timetables.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom Marquee ────────────────────────────────────────────────── */}
      <div className="marquee-wrapper invert">
        <div className="marquee-track reverse">
          <span>OR-TOOLS SOLVER ENGINE • DYNAMIC HEURISTICS • FLEXIBLE CSV INGESTION • EDGE MIDDLEWARE AUTH •</span>
          <span>OR-TOOLS SOLVER ENGINE • DYNAMIC HEURISTICS • FLEXIBLE CSV INGESTION • EDGE MIDDLEWARE AUTH •</span>
          <span>OR-TOOLS SOLVER ENGINE • DYNAMIC HEURISTICS • FLEXIBLE CSV INGESTION • EDGE MIDDLEWARE AUTH •</span>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div className="cta-banner reveal">
        <div className="cta-glass">
          <h2>Ready to revolutionize your semester?</h2>
          <p>Join the institutions managing thousands of sessions without a single conflict.</p>
          <Link href="/signup" className="btn-hero-primary mt-4">Create your instance</Link>
        </div>
      </div>

      <footer className="footer">
        <span className="footer-brand">Schedula</span>
        <div className="footer-links">
          <Link href="/signin">Sign in</Link>
          <Link href="/signup">Sign up</Link>
        </div>
      </footer>
    </div>
  );
}
