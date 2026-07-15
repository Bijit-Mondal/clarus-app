# Clarus App — Agent Guide

## Stack
- **Framework:** Vue 3 (Composition API, `<script setup lang="ts">`)
- **Build:** Vite 8, TypeScript 6
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Components:** shadcn-vue (New York style) — always use these for UI primitives
- **Icons:** Phosphor Icons (via `@phosphor-icons/vue` or `<i>`) — import from the `@phosphor-icons/vue` package
- **State:** Pinia
- **Router:** Vue Router (file-based or manual routes in `src/router/index.ts`)
- **Path alias:** `@/` → `./src/`

## Conventions

### General
- All new files use TypeScript. Avoid `any` — prefer `unknown` and narrow with guards.
- Components go in `src/components/`, pages/views in `src/views/`, composables in `src/composables/`.
- Use PascalCase for `.vue` component filenames (e.g. `UserProfile.vue`).
- Use camelCase for composable files (e.g. `useAuth.ts`).
- Keep components focused and small. Extract logic into composables when a component exceeds ~200 lines.

### Vue / Template
- Always use `<script setup lang="ts">`. No Options API.
- Prefer `v-if`/`v-else` over `v-show` unless toggling frequently.
- Use `:key` on `v-for` — prefer a unique id over index.
- Bind classes with the `:class` object syntax (`:class="{ 'bg-red-500': isError }"`).
- Use kebab-case for custom event names (`@update:model-value`).

### shadcn-vue
- Install components via `yarn dlx shadcn-vue@latest add <component>`.
- Never hand-write UI primitives — extend or compose existing shadcn-vue components.
- Import from `@/components/ui/<component>` (e.g. `import { Button } from '@/components/ui/button'`).
- Components already accept Tailwind classes via `class` prop for overrides. Use that before wrapping.

### Icons (Phosphor)
- Import from `@phosphor-icons/vue`:
  ```ts
  import { MagnifyingGlass } from '@phosphor-icons/vue'
  ```
- Use the `<component :is="MagnifyingGlass" />` pattern or the Phosphor Vue component directly.
- Prefer the regular weight by default; use `weight="bold"` / `weight="fill"` when needed.
- Size with `size` prop (e.g. `:size="20"`).

### Styling
- Tailwind v4 — no `tailwind.config.ts`. Use `@theme` directives in `src/style.css` for custom tokens.
- Prefer utility classes. Extract to a shared component when a pattern repeats 3+ times.
- Use `@apply` sparingly — only in `@layer base` or for component shadcn-vue overrides.
- Color variables are defined in `src/style.css` as CSS custom properties (OKLCH).

### State (Pinia)
- One store per domain concern. Use `defineStore` with the setup function style:
  ```ts
  export const useUserStore = defineStore('user', () => {
    const name = ref('')
    const updateName = (n: string) => { name.value = n }
    return { name, updateName }
  })
  ```
- Keep stores flat — avoid deeply nested reactive objects.

### Routing
- Define routes in `src/router/index.ts`. Use lazy loading:
  ```ts
  { path: '/dashboard', component: () => import('@/views/Dashboard.vue') }
  ```

### Data Fetching (TanStack Query)
- **Never call `src/api/*` directly from views or components.** API modules are transport-only.
- Wrap every API surface in a composable under `src/composables/` using `@tanstack/vue-query`:
  - `useQuery` for reads — export stable `queryKey` factories (e.g. `membershipKeys.list(tenantId)`).
  - `useMutation` for writes — invalidate related query keys in `onSuccess`.
- Views and components import composables only. Importing **types** from `src/api/*` is fine when needed for props or local state.
- One composable file per API domain (e.g. `useMemberships.ts` for `memberships.ts`).

### Linting & Formatting
- `yarn lint` — runs oxlint + ESLint
- `yarn format` — runs oxfmt
- No semicolons. Single quotes. Trailing commas where valid.
- Run lint before committing. Fix warnings — don't ignore them.

### Testing
- Vitest + jsdom. Tests live next to what they test as `*.test.ts` or `*.spec.ts`.
- Use `@vue/test-utils` for component tests. Prefer `mount` over `shallowMount` for integration confidence.

## Design Context

Strategic and visual design specs live at the project root. Read both before UI work:

- **PRODUCT.md** — register (`product`), users, purpose, brand personality (Confident · Modern · Effortless), anti-references, and design principles. Clarus is a **compliance / GRC platform** (SOC 2, ISO 27001; controls, evidence, findings, auditors) serving three roles on one surface — owners, contributors, and external auditors. Clarity is the through-line; trust is the product.
- **DESIGN.md** — tokens and visual system, drawn from **Windows 11 / Fluent Design**. Creative North Star: *The Clear Frame*. Primary accent: **Verified Mint** (`oklch(0.594 0.123 166)`, doubles as `--success`). Achromatic Fluent surface layers; full status vocabulary (success/warning/info/destructive) — pair status with icon/label, never color alone; 8px radii; subtle lift on elevated layers only; calm functional motion. shadcn-vue (New York) for primitives. WCAG 2.1 AA.

Impeccable live mode is configured (`.impeccable/live/config.json`). Run `$impeccable live` for in-browser variant iteration.
