# Schedula — Design Specification

> This file is the single source of truth for all UI decisions in this codebase.
> GitHub Copilot, all contributors, and all AI tools must follow this document exactly.

---

## 1. Philosophy

Schedula is a university scheduling SaaS. The design language is:

- **Trustworthy** — feels like a premium institutional tool, not a startup
- **Academic** — warm, approachable, editorial without being playful
- **Minimal** — Apple-inspired restraint, generous whitespace, no decoration for its own sake
- **Light only** — no dark mode, no dark surfaces, no dark backgrounds anywhere

The experience should feel like using a well-designed university portal crossed with a modern Apple product page. Every element earns its place.

---

## 2. Color System

### Active Palette: Apple Blue

| Token          | Hex       | Role                    | Usage                                                               |
| -------------- | --------- | ----------------------- | ------------------------------------------------------------------- |
| `background`   | `#F5F5F7` | Page background         | `<body>`, page wrappers                                             |
| `surface`      | `#FFFFFF` | Card / panel background | Cards, modals, sidebars, dropdowns                                  |
| `accent`       | `#0071E3` | Primary brand color     | Buttons, links, left-border indicators, badge accents, stat numbers |
| `text-primary` | `#1D1D1F` | Primary text            | Headings, body copy, labels                                         |
| `text-muted`   | `#6E6E73` | Secondary text          | Captions, placeholders, nav items, metadata                         |
| `border`       | `#E8E8ED` | Structural lines        | Dividers, input borders, card outlines                              |

### Available Palettes (for future theme switching)

#### Prussian Blue

```
background: #F0F4F8  |  surface: #FFFFFF  |  accent: #5B8DD9
text: #1C2E4A        |  muted: #6A7A9A    |  border: #E0E8F4
```

#### Navy

```
background: #F5F7FC  |  surface: #FFFFFF  |  accent: #1B3A6B
text: #0A1220        |  muted: #4A5E7A    |  border: #DDE4F0
```

#### Navy Teal

```
background: #F4F7FF  |  surface: #FFFFFF  |  accent: #00C2A8
text: #0D1F3C        |  muted: #6B7A99    |  border: #E8EDF9
```

### Tailwind Config

Add this to `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      background: '#F5F5F7',
      surface: '#FFFFFF',
      accent: '#0071E3',
      border: '#E8E8ED',
      text: {
        primary: '#1D1D1F',
        muted: '#6E6E73',
      },
    },
  },
}
```

### Color Rules

- **Never** hardcode Tailwind color classes (`bg-blue-50`, `text-emerald-700`, `bg-purple-50`) for component-level colors — they break palette switching
- **Always** use token classes: `bg-accent`, `text-accent`, `bg-accent/10`, `text-text-primary`, `bg-background`, `border-border`
- **Exception:** semantic status colors (Conflict red, Available green, Pending orange) may use fixed values since they carry meaning independent of palette

### Status / Badge Colors (fixed, not palette-dependent)

| Status    | Background   | Text      |
| --------- | ------------ | --------- |
| Lecture   | `accent/10`  | `accent`  |
| Tutorial  | `accent/20`  | `accent`  |
| Lab       | `accent/30`  | `accent`  |
| Conflict  | `#FF3B30/10` | `#FF3B30` |
| Available | `#34C759/10` | `#34C759` |
| Pending   | `#FF9500/10` | `#FF9500` |
| Active    | `#34C759/10` | `#34C759` |

---

## 3. Typography

### Font Stack

```
Display / Headings: "DM Serif Display", serif
UI / Body:          "DM Sans", sans-serif
Code / Hex:         ui-monospace, monospace
```

**Google Fonts import:**

```html
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap"
  rel="stylesheet"
/>
```

**Never use:** Inter, Roboto, Arial, system-ui, or any system font as the primary typeface.

### Type Scale

| Role                 | Font             | Weight | Size    | Tracking         | Class             |
| -------------------- | ---------------- | ------ | ------- | ---------------- | ----------------- |
| Display heading (H1) | DM Serif Display | 800    | 40–48px | -0.04em          | `text-display`    |
| Section heading (H2) | DM Serif Display | 800    | 26–32px | -0.03em          | `text-heading`    |
| Card heading (H3)    | DM Sans          | 700    | 16–18px | -0.01em          | `text-subheading` |
| Body text            | DM Sans          | 400    | 14–15px | normal           | `text-body`       |
| Label / overline     | DM Sans          | 700    | 10–11px | 0.08em uppercase | `text-label`      |
| Nav / UI             | DM Sans          | 500    | 13px    | normal           | —                 |
| Monospace            | system mono      | 400    | 10–11px | normal           | `font-mono`       |

### Tailwind Typography Extension

```js
fontSize: {
  display: ['48px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '800' }],
  heading: ['28px', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '800' }],
  subheading: ['17px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
  body: ['14px', { lineHeight: '1.6' }],
  label: ['11px', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '700', textTransform: 'uppercase' }],
}
```

---

## 4. Spacing & Shape

All components use generous padding and large border radii. This is non-negotiable.

### Border Radius Scale

| Element                 | Radius                     |
| ----------------------- | -------------------------- |
| Page container / modal  | `52px`                     |
| Large card              | `44–48px`                  |
| Standard card           | `36–44px`                  |
| Inner card / stat block | `28–32px`                  |
| Button                  | `20–28px` (pill: `9999px`) |
| Input                   | `16–20px`                  |
| Badge / pill            | `9999px`                   |
| Icon container          | `28px`                     |
| Dynamic Island          | `30px`                     |
| Tooltip                 | `16px`                     |

### Spacing

| Context                 | Value                              |
| ----------------------- | ---------------------------------- |
| Page max-width          | `880px` (showcase), `1280px` (app) |
| Page horizontal padding | `32–48px`                          |
| Section gap             | `48–80px`                          |
| Card padding            | `24–32px`                          |
| Card gap in grid        | `16px`                             |
| Inline icon gap         | `8–12px`                           |

---

## 5. Shadows

Use soft, diffused shadows. Never hard box outlines as the primary depth cue.

```css
/* Default card — resting */
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

/* Elevated card — hover */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);

/* Large modal / expanded card */
box-shadow: 0 32px 90px rgba(29, 29, 31, 0.16);

/* Primary button — resting */
box-shadow: 0 4px 20px {accent}44;

/* Primary button — hover */
box-shadow: 0 8px 28px {accent}66;

/* Navbar (frosted, no shadow needed) */
backdrop-filter: blur(20px);
background: rgba(255, 255, 255, 0.75);
```

---

## 6. Components

### 6.1 Navbar

```
height:        52px
background:    rgba(255,255,255,0.75)
backdrop-filter: blur(20px)
border-bottom: 1px solid {border}
padding:       0 28px
position:      sticky top-0, z-50
layout:        space-between → [wordmark] [nav links] [CTA]
```

- Wordmark: DM Serif Display, 18px, weight 800, `text-primary`
- Nav links: DM Sans, 13px, weight 500, `text-muted`
- CTA: accent fill, border-radius 28px (pill), white text, hover scale(1.05)

---

### 6.2 Session Card

The most important component. Two states: collapsed (card) and expanded (morphed overlay).

**Collapsed state:**

```
background:   {surface}
border-radius: 44px
border-left:  4px solid {accent}
padding:      24px
shadow:       0 2px 12px rgba(0,0,0,0.06)
hover:        scale(1.03), shadow elevation, border-left → 8px
```

**Expanded state (overlay morph):**

```
background:   {surface}
border-radius: 52px
shadow:       0 32px 90px rgba(29,29,31,0.16)
max-width:    960px
max-height:   720vh
centered:     fixed, centered in viewport
backdrop:     rgba(20,20,24,0.12) + blur(4px)
```

**Morph animation:**

```
Expand:  card rect → centered overlay, duration 500ms, cubic-bezier(0.4,0,0.2,1)
Collapse: centered overlay → card rect, duration 520ms, same easing
Properties animated: top, left, width, height, border-radius, box-shadow
```

**Content layout (collapsed):**

```
[time — small muted label]
[title — DM Serif Display] [type badge] [expand chevron]
[divider]
[instructor row] [room row]
```

**Content layout (expanded):**

```
[time] [title — larger] [type badge] [close button]
[divider]
[instructor] [room]
[about — description body]
[stats grid: Credits | Enrolled | Duration | Status]
[date range row]
[action buttons: Download Syllabus | View Roster]
```

**Type badges (use accent-based tokens, not hardcoded Tailwind colors):**

```
Lecture:  bg-accent/10, text-accent
Tutorial: bg-accent/20, text-accent
Lab:      bg-accent/30, text-accent
```

---

### 6.3 Stat Card

```
background:    {surface}
border-radius: 44px
padding:       32px
shadow:        0 2px 12px rgba(0,0,0,0.06)
hover:         scale(1.04), shadow elevation
```

**Content:**

- Icon container: 56px × 56px, border-radius 28px, `bg-accent/8`, icon in accent color
- Label: `text-label` class, `text-muted`
- Value: 40px, weight 800 (font-black), `text-accent`
- Trend indicator: `↑ 12%` in emerald-600 or `↓ 3%` in red-600 (fixed status colors, not palette)

---

### 6.4 File Component

```
background:    {surface}
border-radius: 44px
padding:       24px
shadow:        0 2px 12px rgba(0,0,0,0.06)
hover:         shadow elevation
```

**Content layout:**

```
[file icon container] [filename + type badge + size + date] [download button — hidden until hover]
```

- Icon container: 48px, border-radius 28px, `bg-blue-50` → change to `bg-accent/8`
- Type badge: `bg-accent/8`, `text-accent`, pill shape
- Download button: `opacity-0 group-hover:opacity-100` — keep this pattern
- Filename hover: `text-accent` transition

---

### 6.5 Buttons

| Variant     | Background  | Border               | Text             | Hover effect                   |
| ----------- | ----------- | -------------------- | ---------------- | ------------------------------ |
| Primary     | `{accent}`  | none                 | `#FFFFFF`        | scale(1.04–1.05) + glow shadow |
| Secondary   | transparent | `2px solid {accent}` | `{accent}`       | `bg-accent/8`                  |
| Ghost       | transparent | none                 | `{text-primary}` | `bg-background`                |
| Destructive | `#FF3B30`   | none                 | `#FFFFFF`        | scale + red glow               |

All buttons:

- Font: DM Sans, 13–14px, weight 700
- Border-radius: `9999px` (full pill) for standalone, `20px` for inline
- Transition: `all 200ms ease-out`
- Icon gap: `8px`

---

### 6.6 Inputs

```
background:    {background}
border:        1.5px solid {border}
border-radius: 16–20px
padding:       12–13px 16–18px
font:          DM Sans, 14px, weight 400
color:         {text-primary}
placeholder:   {text-muted}
outline:       none
focus:         border-color → {accent}, box-shadow → 0 0 0 3px {accent}20
transition:    border-color 200ms ease, box-shadow 200ms ease
```

---

### 6.7 Dynamic Island Switcher

```
position:      fixed, top: 20px, left: 50%, translateX(-50%)
z-index:       100
background:    #1D1D1F
border-radius: 30px

collapsed:     width 210px, height 44px
expanded:      width 420px, height 310px
transition:    width/height 450ms cubic-bezier(0.4,0,0.2,1)
```

Collapsed content:

- Accent color dot (10px circle)
- "Schedula" wordmark in white, DM Sans 700
- Current palette name in `#6E6E73`

Expanded content:

- Palette list: 3 color dots + name + active indicator dot
- Selected item: `background: #2C2C2E`
- Content fade: `opacity 0→1, 250ms ease, delay 150ms`

---

### 6.8 Color Role Cards (expandable)

```
background:    {surface}
border-radius: 28px
cursor:        pointer
shadow:        resting → elevated on expand
```

States:

- **Collapsed:** color swatch 56px tall + label + hex code
- **Expanded:** swatch grows to 100px + role description + color bar
- **Toggle indicator:** circle (22px), rotates 45deg on expand, fills with accent

Transition: `height 400ms cubic-bezier(0.4,0,0.2,1)`

---

## 7. Motion & Animation

**Rule: CSS transitions only. No spring physics libraries (no Framer Motion springs, no react-spring).**

Use `cubic-bezier(0.4,0,0.2,1)` (Material standard easing) for structural changes.
Use `ease` for micro-interactions and color transitions.

### Transition Reference

| Interaction                          | Properties                              | Duration  | Easing                    |
| ------------------------------------ | --------------------------------------- | --------- | ------------------------- |
| Session card expand/collapse (morph) | top, left, width, height, border-radius | 500–520ms | cubic-bezier(0.4,0,0.2,1) |
| Dynamic Island open/close            | width, height                           | 450ms     | cubic-bezier(0.4,0,0.2,1) |
| Color role card expand               | height, max-height                      | 400ms     | cubic-bezier(0.4,0,0.2,1) |
| Palette theme switch                 | color, background, border-color         | 400ms     | ease                      |
| Hover scale (cards)                  | transform                               | 250–300ms | ease                      |
| Hover scale (buttons)                | transform                               | 200ms     | ease-out                  |
| Shadow elevation (hover)             | box-shadow                              | 250ms     | ease                      |
| Button glow                          | box-shadow                              | 200ms     | ease                      |
| Island content fade                  | opacity                                 | 200–250ms | ease                      |
| Page load reveal                     | opacity + translateY                    | 600–900ms | ease                      |
| File download button reveal          | opacity                                 | 300ms     | ease                      |

### Page Load Stagger Pattern

```
Initial state: opacity: 0, transform: translateY(20–32px)
Final state:   opacity: 1, transform: translateY(0)

Section 1 (hero):    delay 0s,     duration 600ms
Section 2 (stats):   delay 100ms,  duration 700ms
Section 3 (cards):   delay 180ms,  duration 800ms
Section 4 (preview): delay 250ms,  duration 900ms
```

---

## 8. Layout Structure

```
<body bg={background}>
  <DynamicIsland />              ← fixed top-center, always visible

  <main maxWidth=880px padding=32–48px>

    <HeroSection>
      eyebrow tag (accent, uppercase, 11px)
      H1 title (DM Serif Display)
      subtitle (DM Sans, muted)
    </HeroSection>

    <StatCardsRow>               ← 4-column flex, gap 16px
      <StatCard × 4 />
    </StatCardsRow>

    <ColorRoleSection>           ← 3-column grid, expandable
      <ColorRoleCard × 6 />
    </ColorRoleSection>

    <UIPreviewCard borderRadius=36px>
      <Navbar />
      <SessionList>
        <SessionCard × 3 />      ← shuffleable pool of 8
      </SessionList>
      <ButtonSystem />
      <StatusBadges />
    </UIPreviewCard>

  </main>
</body>
```

---

## 9. Patterns to Keep (from existing components)

These patterns were implemented correctly — preserve them:

| Pattern                      | Location             | Notes                                                                 |
| ---------------------------- | -------------------- | --------------------------------------------------------------------- |
| Card morph expand animation  | `SessionCard.jsx`    | Animates card rect → centered overlay using `getBoundingClientRect()` |
| Backdrop blur overlay        | `SessionCard.jsx`    | `rgba(20,20,24,0.12) + blur(4px)` on expand                           |
| Group hover file reveal      | `FileComponent.jsx`  | `opacity-0 group-hover:opacity-100` on download button                |
| Hover scale on cards         | `StatCard.jsx`       | `hover:scale-[1.04]`                                                  |
| Border-left accent indicator | `SessionCard.jsx`    | `border-l-4 border-accent`, grows to `border-l-8` on hover            |
| Staggered page load          | `DesignShowcase.jsx` | `opacity + translateY` with delays                                    |

---

## 10. Patterns to Fix (from existing components)

These need to be updated to match the spec:

| Issue                    | Location                         | Fix                                                                                                                                                                                          |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded badge colors   | `SessionCard.jsx` `BadgeVariant` | Replace `bg-blue-50 text-blue-700`, `bg-emerald-50 text-emerald-700`, `bg-purple-50 text-purple-700` with `bg-accent/10 text-accent`, `bg-accent/20 text-accent`, `bg-accent/30 text-accent` |
| Hardcoded icon bg        | `FileComponent.jsx`              | Replace `bg-blue-50 text-blue-600` with `bg-accent/8 text-accent`                                                                                                                            |
| Generic icon in StatCard | `StatCard.jsx`                   | Replace `BookOpenIcon` default with schedule-relevant icons per use case                                                                                                                     |
| Color palette section    | `DesignShowcase.jsx`             | Hardcoded hex values — should pull from Tailwind config tokens                                                                                                                               |

---

## 11. Do's and Don'ts

### Do

- Use `DM Serif Display` for all headings and the wordmark
- Use `DM Sans` for all UI text, labels, inputs, buttons
- Keep border-radius ≥ 20px on all interactive elements
- Use `bg-accent/N` opacity utilities for tinted backgrounds
- Use `backdrop-filter: blur(20px)` on navbar and modal overlays
- Animate structural layout changes with `cubic-bezier(0.4,0,0.2,1)`
- Add hover scale + shadow elevation on all interactive cards
- Use soft diffused shadows — never hard outlines as the primary depth signal
- Reference color tokens (`bg-accent`, `text-text-primary`) — never hardcode hex in components

### Don't

- Use dark backgrounds, dark surfaces, or dark mode anywhere
- Use Inter, Roboto, Arial, or system-ui as the primary font
- Use hardcoded Tailwind color classes (`bg-blue-50`, `text-emerald-700`) for palette-dependent colors
- Use spring physics or `animate()` from Framer Motion — CSS transitions only
- Add neon colors, gradients, or decorative patterns
- Use border-radius below 16px on any visible UI element
- Mix multiple accent colors within a single palette
- Add shadows with opacity above 0.16 on resting state cards
