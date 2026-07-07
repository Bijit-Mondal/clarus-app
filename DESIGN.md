---
name: Clarus App
description: A confident, Fluent-forward compliance platform — clarity as architecture, layered neutral surfaces, Verified Mint accent, restrained shadcn-vue components.
colors:
  verified-mint: "oklch(0.5940 0.1233 165.8415)"
  verified-mint-foreground: "oklch(1.0000 0 0)"
  verified-mint-dark: "oklch(0.7842 0.1532 165.5210)"
  canvas: "oklch(0.9642 0 0)"
  ink: "oklch(0.1591 0 0)"
  ink-secondary: "oklch(0.2809 0 0)"
  ink-muted: "oklch(0.4926 0 0)"
  surface: "oklch(1.0000 0 0)"
  surface-muted: "oklch(0.9821 0 0)"
  surface-secondary: "oklch(0.9340 0 0)"
  accent-cool: "oklch(0.9696 0.0110 243.6514)"
  accent-cool-foreground: "oklch(0.2350 0 0)"
  border: "oklch(0.8607 0 0)"
  success: "oklch(0.5940 0.1233 165.8415)"
  success-foreground: "oklch(1.0000 0 0)"
  warning: "oklch(0.6820 0.1520 62.0000)"
  warning-foreground: "oklch(0.2200 0.0400 62.0000)"
  destructive: "oklch(0.5844 0.2008 35.7714)"
  destructive-foreground: "oklch(1.0000 0 0)"
  info: "oklch(0.5677 0.1665 251.3134)"
  info-foreground: "oklch(1.0000 0 0)"
  nav-accent: "oklch(0.5677 0.1665 251.3134)"
  chart-1: "oklch(0.5940 0.1233 165.8415)"
  chart-2: "oklch(0.5104 0.1654 142.6681)"
  chart-3: "oklch(0.8290 0.1712 81.0381)"
  chart-4: "oklch(0.5844 0.2008 35.7714)"
  chart-5: "oklch(0.4498 0.2097 309.1018)"
  canvas-dark: "oklch(0.2393 0 0)"
  surface-dark: "oklch(0.2931 0 0)"
  ink-dark: "oklch(0.9612 0 0)"
typography:
  display:
    fontFamily: "'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)"
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Segoe UI Variable', ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "1.25rem"
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

Clarus treats clarity as architecture, not decoration. It is a compliance / GRC platform, so the frame must read as credible and calm the moment it loads — trust is the product. The visual system draws on **Windows 11 / Fluent Design**, adapted for a focused product rather than an OS: layered neutral surfaces, subtle earned depth, calm intentional motion, and clean variable-weight type (Segoe UI Variable). A single Verified Mint accent marks action and verified/passing state without shouting.

Density is comfortable — enough room to scan controls, evidence, and findings, never legacy-GRC clutter. Components follow shadcn-vue (New York) conventions with restrained 8px radii and complete interaction states. Depth is earned through surface steps (canvas → sidebar → surface → elevated) and soft Fluent-style shadows on floating layers only — never stacked ghost cards or decorative glass.

The system explicitly rejects generic SaaS scaffolding, enterprise gray mush, over-designed chrome, and playful illustration-heavy UI (per PRODUCT.md anti-references).

**Key Characteristics:**

- Achromatic neutral surfaces in Fluent-style layers; brand hue lives in accent, focus, and status — not tinted backgrounds
- Segoe UI Variable for all UI type; Fira Code for IDs, tokens, and code; Georgia reserved for rare editorial moments
- 8px base radius (`--radius: 0.5rem`) — capable and modern, never pill-shaped containers or oversized rounding
- Soft 16px-blur shadows only on popovers, dropdowns, and modals; flat by default at rest
- Full semantic status vocabulary (success / warning / info / destructive) — essential for pass/fail, open/closed compliance states
- Light and dark modes share one personality: direct, readable, WCAG AA contrast

## Colors

A restrained product palette: achromatic Fluent surface layers with Verified Mint as the primary action/verified accent, a cool blue-violet for navigation and info, and a complete status set for compliance state. Values are the live tokens in `src/style.css` (light `:root` and `.dark`).

### Primary

- **Verified Mint** (`oklch(0.594 0.123 166)`): Primary actions, focus rings, active wayfinding, and passing/verified status. The signature accent — calm confidence, not startup neon. Doubles as `--success`, reinforcing "verified = on brand." Use sparingly; its rarity carries weight.
- **Verified Mint (Dark)** (`oklch(0.784 0.153 166)`): Primary accent in dark theme; brighter for contrast on deep surfaces.

### Secondary

- **Nav Accent / Info** (`oklch(0.568 0.167 251)`): Sidebar active/primary states and informational emphasis. Cool blue-violet complements Verified Mint without competing. Maps to `--sidebar-primary` and `--info`.
- **Accent Cool** (`oklch(0.970 0.011 244)`): Subtle tinted surface for hover rows, selected-but-not-primary states, and info-adjacent backgrounds.

### Status

Compliance UI lives on state; standardize it. Every status pairs color with an icon or label — never color alone.

- **Success** (`oklch(0.594 0.123 166)`): Passing controls, verified evidence, resolved findings. (Shares Verified Mint.)
- **Warning** (`oklch(0.682 0.152 62)`): Attention needed, evidence expiring, review due soon.
- **Destructive** (`oklch(0.584 0.201 36)`): Failing controls, open findings, destructive actions.
- **Info** (`oklch(0.568 0.167 251)`): Neutral informational callouts and in-progress state.

### Neutral (Fluent surface layers)

Depth comes from stepping through these layers, not from shadow:

- **Canvas** (`oklch(0.964 0 0)`): App background and sidebar base — true neutral, not warm cream.
- **Surface** (`oklch(1 0 0)`): Cards, panels, inputs on light mode.
- **Surface Muted** (`oklch(0.982 0 0)`): Subtle section backgrounds, table stripes, the AI input rest state.
- **Surface Secondary** (`oklch(0.934 0 0)`): Secondary buttons, subdued chips.
- **Ink** (`oklch(0.159 0 0)`): Primary body text and headings.
- **Ink Secondary** (`oklch(0.281 0 0)`): Emphasis text on secondary controls.
- **Ink Muted** (`oklch(0.493 0 0)`): Secondary labels, metadata, breadcrumbs — the floor for muted text on Canvas; never lighter.
- **Border** (`oklch(0.861 0 0)`): Dividers, input strokes, card edges.

### Data Visualization

Five-step chart ramp (`--chart-1` … `--chart-5`) for analytics and reports: mint, green, amber, red-orange, violet. Distinguishable by hue and lightness; always pair with labels/patterns for colorblind safety.

### Named Rules

**The One Accent Rule.** Verified Mint appears on primary actions, focus rings, verified/success state, and one wayfinding element per view. If more than ~10% of a screen reads as accent, remove color until hierarchy returns.

**The Neutral Canvas Rule.** Backgrounds stay achromatic (chroma 0). Warmth and personality come from accent, typography, status, and content — never sand-tinted body backgrounds.

**The Status-Never-Alone Rule.** Compliance state (pass/fail, open/closed, risk level) always carries an icon or text label alongside color. Color is reinforcement, not the only signal.

## Typography

**UI / Body Font:** Segoe UI Variable (`ui-sans-serif` fallback) — the Fluent/Windows 11 face; native and modern, carries headings through labels at variable weight.
**Mono Font:** Fira Code (`ui-monospace` fallback) — precision for control IDs, evidence hashes, API keys, code.
**Serif (editorial):** Georgia — optional for rare pull quotes or marketing moments; not default UI chrome.

**Character:** Direct and capable. One family carries the whole product; contrast comes from weight and size, not font pairing. Fixed rem scale (product UI, consistent DPI) with a tight ~1.2 ratio — only the page-title Display step uses a modest `clamp()`. No display shrink-tracking below −0.04em.

### Hierarchy

- **Display** (600, `clamp(1.5rem, 2.5vw, 1.875rem)`, 1.15, −0.02em): Page titles in the app shell. `text-wrap: balance` on h1–h3.
- **Headline** (600, 1.25rem, 1.25): Section headers, panel titles.
- **Title** (600, 1.125rem, 1.35): Card titles, dialog headings.
- **Body** (400, 0.9375rem / 15px, 1.55): Default UI copy. Cap prose at 65–75ch; tables and dense data may run wider.
- **Label** (500, 0.8125rem, 0.01em): Form labels, table headers, nav items.
- **Mono** (400, 0.875rem, 1.5): Control IDs, slugs, evidence references, inline code.

### Named Rules

**The Readable Muted Rule.** Ink Muted (`oklch 0.493`) is the floor for secondary text on Canvas — never lighter grays that fail AA. Placeholders meet the same 4.5:1 body requirement.

## Elevation

Fluent-forward but restrained: most surfaces are flat at rest and separated by the surface-layer steps above. Soft shadows appear only on elevated/floating layers (dropdowns, popovers, modals, sticky subheaders). The shadow scale (`--shadow-2xs` … `--shadow-2xl`) shares a 16px-blur signature.

### Shadow Vocabulary

- **Shadow SM** (`0px 4px 16px hsl(0 0% 0% / 0.08), 0px 1px 2px -1px hsl(0 0% 0% / 0.08)`): Dropdowns, popovers, floating panels.
- **Shadow MD** (`0px 4px 16px …, 0px 2px 4px -1px …`): Modals and dialogs.
- **Dark mode**: Same structure at ~0.25 opacity — stronger separation without harsh edges.
- **Accent glow** (Verified Mint focus): reserved for the AI input active state — a purposeful, on-brand exception, not a decorative default.

### Named Rules

**The No Ghost Card Rule.** Never pair a 1px border with a wide soft shadow on the same element as decoration. Pick border OR shadow for separation.

**The Flat-By-Default Rule.** Cards and list rows use surface contrast and borders at rest. Shadow appears on interaction or elevation-tier change only.

## Components

Refined and restrained — shadcn-vue (New York) primitives (`@/components/ui/*`: button, input, avatar, dropdown-menu, scroll-area, separator, tooltip) composed with project tokens. Tight 8px radii, clear Verified Mint focus rings, complete interaction states, no decorative chrome.

### State Vocabulary

Every interactive component ships: default, hover, focus-visible, active, disabled, and — where relevant — loading, selected, and error. Don't ship half. Prefer skeletons over center-screen spinners; empty states that teach the interface over "nothing here."

### Buttons

- **Shape:** 8px radius (`--radius-lg`).
- **Primary:** Verified Mint fill, white label, 8×16px padding, medium-weight label.
- **Secondary:** Surface Secondary fill, Ink Secondary text.
- **Ghost:** Transparent, Ink text; hover uses Surface Muted.
- **Focus:** `--ring` (Verified Mint) on `:focus-visible`; no bounce or scale gimmicks.

### Cards / Containers

- **Corner:** 8px radius. **Background:** Surface on Canvas; Surface Dark on Canvas Dark.
- **Shadow:** Flat at rest; Shadow SM only when floating or in a modal stack.
- **Border:** 1px Border token — no colored side stripes.
- **Padding:** 16–24px (`md`–`lg`). One surface level per grouping — never nested cards.

### Inputs / Fields

- **Style:** Surface (or Muted) background, 1px Border, 8px radius, Body text.
- **Focus:** Verified Mint ring; border shifts to ring color.
- **Error:** Destructive border + message; icon or text always present.
- **Disabled:** Reduced opacity, no pointer events; readable contrast maintained.

### Navigation (app shell)

- **Structure:** Fluent-style two-tier left rail — a module rail (icons) plus a contextual module sidebar (pages), then a top bar with breadcrumb and the Clarus AI search.
- **Active state:** `--sidebar-primary` (Nav Accent) or Verified Mint indicator, max 1px — not a thick stripe.
- **Typography:** Label size, medium weight; active state bold or accent color.
- **Mobile:** Collapsible drawer; same tokens, no separate visual language.

## Motion

Fluent-calm and functional. 150–250ms on most transitions; motion conveys state (theme handoff, route crossfade, popover open, focus), never decoration. No orchestrated page-load sequences — the product loads into a task.

- Theme changes cross-fade color/border/shadow (~200ms, `cubic-bezier(0.4, 0, 0.2, 1)`).
- Route changes use a short opacity crossfade (`mode="out-in"`).
- The Clarus AI input's rotating conic glow is one deliberate signature moment, gated behind an active state and `prefers-reduced-motion`.
- **Reduced motion is not optional.** `prefers-reduced-motion: reduce` collapses transitions/animations to near-instant; every effect has an alternative.

## Do's and Don'ts

### Do

- **Do** use Verified Mint for one primary action per view, focus rings, and verified/success state.
- **Do** create depth with Fluent surface layers (canvas → sidebar → surface → elevated) before reaching for shadow.
- **Do** pair every compliance status with an icon or label — never color alone.
- **Do** use shadcn-vue components from `@/components/ui/*` — extend, don't hand-roll primitives.
- **Do** honor `prefers-reduced-motion`; keep motion functional and calm.
- **Do** verify muted text and placeholders at WCAG AA on Canvas and Surface.

### Don't

- **Don't** ship enterprise-GRC clutter — tiny gray text, cramped tables, walls of undifferentiated data.
- **Don't** use generic SaaS scaffolding — cream backgrounds, gradient heroes, hero metrics, per-section eyebrow kickers, identical icon-card grids.
- **Don't** over-design — decorative glassmorphism, paired border-plus-wide-shadow ghost cards, oversized radii (24px+ on cards), motion for its own sake.
- **Don't** go playful — sketchy illustrations, bouncy elastic motion, loud decorative color that erodes trust.
- **Don't** use gradient text, side-stripe borders (>1px colored accent), or decorative grid/stripe backgrounds.
- **Don't** stack nested cards — one surface level per grouping.
