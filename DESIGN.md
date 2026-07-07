---
name: Clarus App
description: A confident SaaS app shell — clarity as architecture, Verified Mint accent, restrained shadcn-vue components.
colors:
  verified-mint: "oklch(0.5940 0.1233 165.8415)"
  verified-mint-foreground: "oklch(1.0000 0 0)"
  verified-mint-dark: "oklch(0.7842 0.1532 165.5210)"
  canvas: "oklch(0.9642 0 0)"
  ink: "oklch(0.1591 0 0)"
  surface: "oklch(1.0000 0 0)"
  surface-muted: "oklch(0.9821 0 0)"
  surface-secondary: "oklch(0.9340 0 0)"
  ink-muted: "oklch(0.4926 0 0)"
  ink-secondary: "oklch(0.2809 0 0)"
  accent-cool: "oklch(0.9696 0.0110 243.6514)"
  accent-cool-foreground: "oklch(0.2350 0 0)"
  nav-accent: "oklch(0.5677 0.1665 251.3134)"
  destructive: "oklch(0.5844 0.2008 35.7714)"
  destructive-foreground: "oklch(1.0000 0 0)"
  border: "oklch(0.8607 0 0)"
  canvas-dark: "oklch(0.2393 0 0)"
  ink-dark: "oklch(0.9612 0 0)"
  surface-dark: "oklch(0.2931 0 0)"
typography:
  display:
    fontFamily: "'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "1.125rem"
    lineHeight: 1.35
  body:
    fontFamily: "'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "0.9375rem"
    lineHeight: 1.55
  label:
    fontFamily: "'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 500
    fontSize: "0.8125rem"
    lineHeight: 1.4
    letterSpacing: "0.01em"
  mono:
    fontFamily: "'Fira Code', ui-monospace, monospace"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  unit: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.verified-mint}"
    textColor: "{colors.verified-mint-foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.verified-mint-dark}"
    textColor: "{colors.verified-mint-foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

# Design System: Clarus App

## Overview

**Creative North Star: "The Clear Frame"**

Clarus treats clarity as architecture, not decoration. The visual system is a confident SaaS frame: neutral surfaces, precise type, and a single Verified Mint accent that marks action without shouting. Density is comfortable — enough room to scan, never enterprise-cluttered. Components follow shadcn-vue conventions with restrained radii and purposeful states.

The system explicitly rejects generic SaaS scaffolding, over-designed chrome, enterprise gray mush, and playful illustration-heavy UI (per PRODUCT.md anti-references). Depth is earned through surface steps and subtle lift on elevated layers — not stacked ghost cards or decorative glass.

**Key Characteristics:**

- Neutral canvas with chroma-0 neutrals; brand hue lives in accent and focus, not cream-tinted backgrounds
- Segoe UI Variable for UI type; Fira Code for code and technical labels; Georgia reserved for editorial moments
- 8px base radius — tight and capable, never pill-shaped containers
- Subtle 16px-blur shadows only on popovers, dropdowns, and modals
- Light and dark modes share the same personality: direct, readable, WCAG AA contrast

## Colors

A restrained product palette: achromatic surfaces with Verified Mint as the primary action accent and a cool blue-violet for navigation emphasis.

### Primary

- **Verified Mint** (oklch(0.594 0.123 166)): Primary actions, focus rings, active wayfinding. The signature accent — calm confidence, not startup neon. Use sparingly; its rarity carries weight.
- **Verified Mint (Dark mode)** (oklch(0.784 0.153 166)): Primary accent in dark theme; brighter for contrast on deep surfaces.

### Secondary

- **Nav Accent** (oklch(0.568 0.167 251)): Sidebar active states and nav emphasis. Cool blue-violet complements Verified Mint without competing.

### Tertiary

- **Accent Cool** (oklch(0.970 0.011 244)): Subtle tinted surface for hover rows, selected-but-not-primary states, and info-adjacent backgrounds.

### Neutral

- **Canvas** (oklch(0.964 0 0)): App background — true neutral, not warm cream.
- **Surface** (oklch(1 0 0)): Cards, panels, inputs on light mode.
- **Surface Muted** (oklch(0.982 0 0)): Subtle section backgrounds, table stripes.
- **Surface Secondary** (oklch(0.934 0 0)): Secondary buttons, subdued chips.
- **Ink** (oklch(0.159 0 0)): Primary body text and headings.
- **Ink Muted** (oklch(0.493 0 0)): Secondary labels, metadata — never below AA contrast on Canvas.
- **Border** (oklch(0.861 0 0)): Dividers, input strokes, card edges.
- **Destructive** (oklch(0.584 0.201 36)): Errors, destructive actions — always paired with icon or label, never color alone.

### Named Rules

**The One Accent Rule.** Verified Mint appears on primary actions, focus rings, and one wayfinding element per view. If more than ~10% of a screen reads as accent, remove color until hierarchy returns.

**The Neutral Canvas Rule.** Backgrounds stay achromatic (chroma 0). Warmth and personality come from accent, typography, and content — not sand-tinted body backgrounds.

## Typography

**Display / UI Font:** Segoe UI Variable (ui-sans-serif fallback)
**Body Font:** Segoe UI Variable
**Mono Font:** Fira Code (ui-monospace fallback)
**Serif (editorial):** Georgia — optional for pull quotes or marketing moments inside the app; not default UI chrome.

**Character:** Direct and capable. Segoe UI Variable reads native on Windows and clean elsewhere; Fira Code signals precision for IDs, tokens, and code. No display shrink-tracking below −0.04em on large headings.

### Hierarchy

- **Display** (600, clamp(1.75rem, 4vw, 2.5rem), 1.15): Page titles in the app shell. `text-wrap: balance` on h1–h3.
- **Headline** (600, 1.25–1.5rem, 1.25): Section headers, panel titles.
- **Title** (600, 1.125rem, 1.35): Card titles, dialog headings.
- **Body** (400, 0.9375rem / 15px, 1.55): Default UI copy. Cap line length at 65–75ch in prose blocks.
- **Label** (500, 0.8125rem, 0.01em tracking): Form labels, table headers, nav items.
- **Mono** (400, 0.875rem, 1.5): API keys, slugs, inline code.

### Named Rules

**The Readable Muted Rule.** Muted foreground (oklch 0.493) is the floor for secondary text on Canvas — never lighter grays that fail AA. Placeholders match body contrast requirements.

## Elevation

Subtle lift: most surfaces are flat at rest. Depth comes from background/surface contrast first; soft shadows appear only on elevated layers (dropdowns, popovers, modals, sticky subheaders).

### Shadow Vocabulary

- **Shadow SM** (`0px 4px 16px hsl(0 0% 0% / 0.08), 0px 1px 2px -1px hsl(0 0% 0% / 0.08)`): Dropdowns, popovers, floating panels.
- **Shadow MD** (`0px 4px 16px …, 0px 2px 4px -1px …`): Modals and dialogs.
- **Dark mode**: Same structure at 25% opacity — stronger separation without harsh edges.

### Named Rules

**The No Ghost Card Rule.** Never pair a 1px border with a wide soft shadow on the same element. Pick border OR shadow for separation — not both as decoration.

**The Flat-By-Default Rule.** Cards and list rows use surface contrast and borders at rest. Shadow appears on interaction or elevation tier change only.

## Components

Refined and restrained — shadcn-vue (New York) primitives composed with project tokens. Tight 8px radii, clear focus rings in Verified Mint, no decorative chrome.

### Buttons

- **Shape:** Gently rounded (8px / `--radius-lg`)
- **Primary:** Verified Mint fill, white label, 8×16px padding, medium weight label
- **Secondary:** Surface Secondary fill, Ink Secondary text
- **Ghost:** Transparent, Ink text; hover uses Surface Muted
- **Hover / Focus:** Primary darkens slightly in light mode; `ring` token (Verified Mint) on `:focus-visible`; no bounce or scale gimmicks

### Cards / Containers

- **Corner Style:** 8px radius
- **Background:** Surface on Canvas; Surface Dark on Canvas Dark
- **Shadow Strategy:** Flat at rest; Shadow SM only when floating or in a modal stack
- **Border:** 1px Border token — no colored side stripes
- **Internal Padding:** 16–24px (`md`–`lg` spacing)

### Inputs / Fields

- **Style:** Surface background, 1px Border stroke, 8px radius, Body size text
- **Focus:** Ring in Verified Mint (`--ring`), border shifts to ring color
- **Error:** Destructive border + message in Destructive; icon or text always present
- **Disabled:** Reduced opacity, no pointer events; maintain readable contrast

### Navigation

- **App shell:** Sidebar uses Canvas/Sidebar tokens; active item uses Nav Accent or Verified Mint left indicator (1px max — not a thick stripe)
- **Typography:** Label size, medium weight; active state bold or accent color
- **Mobile:** Collapsible drawer; same tokens, no separate visual language

## Do's and Don'ts

### Do:

- **Do** use Verified Mint for one primary action per view and focus-visible rings.
- **Do** keep neutrals achromatic; let accent and typography carry brand.
- **Do** use shadcn-vue components from `@/components/ui/*` — extend, don't hand-roll primitives.
- **Do** honor `prefers-reduced-motion` — crossfade or instant state changes.
- **Do** test muted text and placeholders at WCAG AA on Canvas and Surface.

### Don't:

- **Don't** use generic SaaS scaffolding — cream backgrounds, gradient heroes, hero metrics, eyebrow kickers on every section, identical icon-card grids.
- **Don't** over-design — glassmorphism, paired border-plus-wide-shadow ghost cards, oversized radii (24px+ on cards), decorative motion.
- **Don't** clutter like enterprise dense UI — tiny gray text, cramped tables, no breathing room.
- **Don't** go overly playful — sketchy illustrations, bouncy elastic motion, loud decorative color.
- **Don't** use gradient text, side-stripe borders (>1px colored accent), or decorative grid/stripe backgrounds.
- **Don't** stack nested cards — one surface level per grouping.
