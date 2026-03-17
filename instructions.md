---
description: Core coding standards, design identity, and architecture guidelines for Schedula
applyTo: "**"
---

# Schedula — AI Agent Instructions

This file defines the foundational principles for all development work in this codebase.
**All AI agents, GitHub Copilot, contributors, and tools must follow these standards exactly.**

---

## 1. Design Identity & System

Schedula is a university scheduling SaaS with a premium, academic design language inspired by Apple.

### Core Design Philosophy

- **Trustworthy** — feels like an institutional tool, not a startup
- **Academic** — warm, approachable, editorial without being playful
- **Minimal** — Apple-inspired restraint, generous whitespace, no decoration for its own sake
- **Light only** — no dark mode, no dark surfaces, no dark backgrounds anywhere

**See `DesignSpec.md` for complete design system details** including:

- Color tokens and semantic status colors
- Typography scale (DM Serif Display for headings, DM Sans for UI)
- Component specifications (Navbar, Session Card, Stat Card, Buttons, Inputs)
- Spacing and border radius scales
- Shadow and animation guidelines
- CSS transitions (cubic-bezier easing, no spring libraries)

### Design System Rules (Non-Negotiable)

1. **Color System:**
   - Use token-based color classes: `bg-accent`, `text-primary`, `border-border`, `bg-background`
   - **Never** hardcode Tailwind colors (`bg-blue-50`, `text-emerald-700`, etc.) for component-level colors
   - Exception: semantic status colors (Conflict red `#FF3B30`, Available green `#34C759`, Pending orange `#FF9500`) are fixed

2. **Typography:**
   - Font stack: DM Serif Display (headings), DM Sans (body/UI), system-ui monospace (code)
   - Never use Inter, Roboto, Arial, or generic system fonts as primary typeface
   - Use Tailwind typography classes: `text-display`, `text-heading`, `text-body`, `text-label`

3. **Component Consistency:**
   - All components must match specifications in `DesignSpec.md` exactly
   - Maintain consistent border-radius scale: pills (9999px), cards (36-52px), buttons (20-28px), inputs (16-20px)
   - Use generous padding and whitespace (minimum 24px card padding)
   - All shadows must be soft/diffused (no hard outlines as primary depth cue)

4. **Motion & Animation:**
   - CSS transitions only — **no Framer Motion springs or react-spring libraries**
   - Use `cubic-bezier(0.4,0,0.2,1)` for structural changes (500-520ms duration)
   - Use `ease` for micro-interactions and color shifts (200ms typical)

---

## 2. Maintainable Code Principles

Write code for clarity, longevity, and team collaboration.

### Code Organization

- **Single Responsibility:** Each component/function has one clear purpose
- **Minimal Nesting:** Keep code readable with shallow component hierarchies
- **Explicit Naming:** Variable and function names must describe intent (e.g., `isSessionExpanded` not `isOpen`)
- **Comments for Why, Not What:** Code should be self-documenting; comments explain rationale and edge cases

### React Component Standards

- Prefer functional components with hooks over class components
- Extract reusable logic into custom hooks or utility functions
- Keep components under 300 lines; split larger components
- Props should be documented with JSDoc comments for non-obvious parameters
- Avoid prop drilling — use Context when needed for deep nesting

### CSS & Styling

- Use Tailwind classes exclusively; avoid inline `style` attributes
- Never use `!important` — restructure selectors instead
- Group related Tailwind classes for readability (layout, sizing, colors, spacing, effects)
- Create Tailwind component classes in CSS modules for repeated patterns
- All spacing must respect the design system scale (8px, 16px, 24px, 32px, etc.)

### State Management

- Keep state as close to usage as possible (useState for local state)
- Lift state only when necessary for component communication
- Use meaningful state variable names that reflect the value's purpose
- Avoid storing computed values in state — derive them instead

### Error Handling

- Always handle edge cases (undefined props, empty arrays, API failures)
- Provide meaningful error messages for debugging
- Use try-catch for async operations; log errors for monitoring
- Never silently fail — surface issues to the user or logs

### Performance

- Lazy-load components and code-split by route
- Memoize expensive calculations with `useMemo`
- Prevent unnecessary re-renders with `useCallback` and `memo` when justified
- Avoid creating objects/functions inside render — define outside component body

---

## 3. Modular Design

Build systems that scale, decompose cleanly, and can be tested independently.

### File & Folder Structure

- **Feature-based organization:** group by feature/domain (components, hooks, utils by domain)
- **One responsibility per file:** one component per file (unless micro-components)
- **Clear naming:** `Button.jsx` not `btn.jsx`, `useScheduleAPI.js` not `hook.js`
- **Separation of concerns:**
  - `/components` — UI components
  - `/hooks` — custom React hooks
  - `/utils` — pure functions and helpers
  - `/lib` — third-party integrations, adapters
  - `/styles` — global styles and Tailwind overrides

### Component Modularity

- **Composable components:** small, focused components that combine easily
- **Props interface:** clearly document required/optional props with JSDoc
- **Variant pattern:** use `variant` prop for style variations (not separate components)
- **No side effects in render:** keep components pure, side effects in `useEffect`
- **Testability:** components should be easy to test in isolation

### API & Data Layer

- **Separation:** API calls isolated in custom hooks or service modules
- **Single source of truth:** centralized data fetching and caching logic
- **Error boundaries:** catch errors at component level for graceful fallbacks
- **Loading states:** always show loading/empty/error states

### Example Modular Structure

```
components/
  ├── Button/
  │   ├── Button.jsx       (component)
  │   ├── Button.module.css (styles)
  │   └── index.js         (export)
  ├── SessionCard/
  │   ├── SessionCard.jsx
  │   ├── expanded.module.css
  │   └── index.js
hooks/
  ├── useScheduleAPI.js    (fetch + cache logic)
  ├── useLocalStorage.js
  └── useMediaQuery.js
utils/
  ├── colors.js            (color token helpers)
  ├── animations.js        (animation utilities)
  └── validation.js
```

### Reusability & DRY

- Extract repeated logic into utilities or hooks
- Create component variants using props rather than copying code
- Use Tailwind @apply for repeated class patterns
- Build small, focused utilities for common operations

---

## 4. Review Checklist

Before committing code, verify:

- [ ] Design matches `DesignSpec.md` exactly (colors, spacing, typography, shadows)
- [ ] No hardcoded Tailwind color classes (use tokens from design system)
- [ ] Component has clear, single responsibility
- [ ] Props are documented with JSDoc comments
- [ ] State is managed at the lowest necessary level
- [ ] No unnecessary re-renders (`useMemo`, `useCallback` justified)
- [ ] Animations use CSS transitions + `cubic-bezier(0.4,0,0.2,1)` easing
- [ ] No `!important` in CSS
- [ ] Error handling for edge cases and API failures
- [ ] Code is self-documenting; comments explain _why_, not _what_
- [ ] No prop drilling — Context used when appropriate
- [ ] Component is testable in isolation

---

## 5. References

- **Design System:** `DesignSpec.md` (single source of truth for UI)
- **Type Scale & Components:** See DesignSpec sections 3, 4, 6
- **Motion Guidelines:** DesignSpec section 7
- **Tailwind Config:** Configured in `tailwind.config.js` with design tokens

---

**Last Updated:** March 2026
**Enforced By:** All AI agents, GitHub Copilot, and code review
