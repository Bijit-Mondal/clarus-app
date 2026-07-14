<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhArrowLeft,
  PhClipboardText,
  PhFileText,
  PhGavel,
  PhMagnifyingGlass,
  PhPlus,
  PhShieldCheck,
} from '@phosphor-icons/vue'
import AICPALogo from '@/components/brand/AICPALogo.vue'
import CCPALogo from '@/components/brand/CCPALogo.vue'
import GDPRLogo from '@/components/brand/GDPRLogo.vue'
import HIPAALogo from '@/components/brand/HIPAALogo.vue'
import ISOLogo from '@/components/brand/ISOLogo.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Requirement = {
  id: string
  code: string
  title: string
  description: string
  bestPractice: boolean
  maturityLevel: string
  category: string
}

type LinkSection = {
  id: 'controls' | 'documents' | 'audits' | 'obligations'
  label: string
  icon: object
  searchPlaceholder: string
  columns: string[]
  emptyLabel: string
  items: LinkItem[]
}

type LinkItem = {
  id: string
  name: string
  state?: string
  type?: string
  source?: string
  area?: string
  owner?: string
}

// ---------------------------------------------------------------------------
// Dummy data — swap with API calls when ready
// ---------------------------------------------------------------------------

const DUMMY_REQUIREMENTS: Requirement[] = [
  {
    id: 'cc1.1',
    code: 'CC1.1',
    title: 'COSO Principle 1',
    description:
      'The entity demonstrates a commitment to integrity and ethical values. The tone at the top and throughout the organisation is established and communicated, and employees are held accountable for adherence to standards of conduct.',
    bestPractice: false,
    maturityLevel: '2 - Repeatable',
    category: 'Common Criteria',
  },
  {
    id: 'cc1.2',
    code: 'CC1.2',
    title: 'COSO Principle 2',
    description:
      'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.',
    bestPractice: true,
    maturityLevel: '1 - Initial',
    category: 'Common Criteria',
  },
  {
    id: 'cc1.3',
    code: 'CC1.3',
    title: 'COSO Principle 3',
    description:
      'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.',
    bestPractice: false,
    maturityLevel: '3 - Defined',
    category: 'Common Criteria',
  },
  {
    id: 'cc1.4',
    code: 'CC1.4',
    title: 'COSO Principle 4',
    description:
      'The entity demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives.',
    bestPractice: true,
    maturityLevel: '2 - Repeatable',
    category: 'Common Criteria',
  },
  {
    id: 'cc1.5',
    code: 'CC1.5',
    title: 'COSO Principle 5',
    description:
      'The entity holds individuals accountable for their internal control responsibilities in the pursuit of objectives.',
    bestPractice: false,
    maturityLevel: '1 - Initial',
    category: 'Common Criteria',
  },
  {
    id: 'a1.1',
    code: 'A1.1',
    title: 'Availability — Current Capacity',
    description:
      'The entity maintains, monitors, and evaluates current processing capacity and use of system components capacity demand and to enable the implementation of additional capacity to help meet its objectives.',
    bestPractice: false,
    maturityLevel: '1 - Initial',
    category: 'Availability',
  },
  {
    id: 'a1.2',
    code: 'A1.2',
    title: 'Availability — Recovery Plan',
    description:
      'The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections, software, data back-up processes, and recovery infrastructure to meet its objectives.',
    bestPractice: true,
    maturityLevel: '2 - Repeatable',
    category: 'Availability',
  },
  {
    id: 'a1.3',
    code: 'A1.3',
    title: 'Availability — Testing',
    description:
      'The entity tests recovery plan procedures supporting system recovery to meet its objectives. Recovery plan tests are evaluated and resultant corrective actions are taken.',
    bestPractice: false,
    maturityLevel: '1 - Initial',
    category: 'Availability',
  },
  {
    id: 'c1.1',
    code: 'C1.1',
    title: 'Confidentiality — Identification',
    description:
      "The entity identifies and maintains confidential information to meet the entity's objectives related to confidentiality.",
    bestPractice: true,
    maturityLevel: '2 - Repeatable',
    category: 'Confidentiality',
  },
  {
    id: 'c1.2',
    code: 'C1.2',
    title: 'Confidentiality — Disposal',
    description:
      "The entity disposes of confidential information to meet the entity's objectives related to confidentiality.",
    bestPractice: false,
    maturityLevel: '3 - Defined',
    category: 'Confidentiality',
  },
]

const DUMMY_CONTROLS: LinkItem[] = [
  { id: 'ctrl-1', name: 'Access Control Policy', state: 'In place' },
  { id: 'ctrl-2', name: 'Password Management Procedure', state: 'In review' },
  { id: 'ctrl-3', name: 'Vulnerability Management', state: 'In place' },
  { id: 'ctrl-4', name: 'Incident Response Plan', state: 'Draft' },
  { id: 'ctrl-5', name: 'Data Classification Standard', state: 'In place' },
  { id: 'ctrl-6', name: 'Change Management Process', state: 'In review' },
  { id: 'ctrl-7', name: 'Business Continuity Plan', state: 'Draft' },
  { id: 'ctrl-8', name: 'Third-Party Risk Assessment', state: 'In place' },
]

const DUMMY_DOCUMENTS: LinkItem[] = [
  { id: 'doc-1', name: 'Security Policy v3.2', type: 'Policy', state: 'Approved' },
  { id: 'doc-2', name: 'Risk Assessment Report Q1', type: 'Report', state: 'Draft' },
  { id: 'doc-3', name: 'Employee Handbook', type: 'Procedure', state: 'Approved' },
  { id: 'doc-4', name: 'Vendor Agreement Template', type: 'Contract', state: 'In review' },
  { id: 'doc-5', name: 'Infrastructure Architecture Diagram', type: 'Diagram', state: 'Approved' },
]

const DUMMY_AUDITS: LinkItem[] = [
  { id: 'audit-1', name: 'SOC 2 Type II Audit 2024', state: 'Completed' },
  { id: 'audit-2', name: 'Pen Test — Q2 2025', state: 'In progress' },
  { id: 'audit-3', name: 'ISO Internal Audit', state: 'Scheduled' },
  { id: 'audit-4', name: 'GDPR Compliance Review', state: 'Completed' },
]

const DUMMY_OBLIGATIONS: LinkItem[] = [
  {
    id: 'obl-1',
    name: 'GDPR Art. 32 — Security measures',
    area: 'Data Privacy',
    source: 'GDPR',
    state: 'Active',
  },
  {
    id: 'obl-2',
    name: 'HIPAA §164.312 — Access control',
    area: 'Healthcare',
    source: 'HIPAA',
    state: 'Active',
  },
  {
    id: 'obl-3',
    name: 'PCI DSS Req. 8 — Authentication',
    area: 'Payment',
    source: 'PCI DSS',
    state: 'Under review',
  },
]

// ---------------------------------------------------------------------------
// Route / navigation
// ---------------------------------------------------------------------------

const route = useRoute()
const router = useRouter()

const frameworkId = computed(() => route.params.frameworkId as string)
const frameworkName = computed(() => (route.query.name as string) || 'Framework')
const frameworkPublisher = computed(() => (route.query.publisher as string) || '')

function logoComponent() {
  const p = frameworkPublisher.value
  const n = frameworkName.value.toLowerCase()
  if (p === 'AICPA') return AICPALogo
  if (p === 'ISO') return ISOLogo
  if (p === 'HHS' || p === 'hipaa' || n.includes('hipaa')) return HIPAALogo
  if (p === 'GDPR' || p === 'EU' || n.includes('gdpr')) return GDPRLogo
  if (p === 'CCPA' || n.includes('ccpa')) return CCPALogo
  return PhShieldCheck
}

function goBack() {
  router.back()
}

// ---------------------------------------------------------------------------
// Requirements list state
// ---------------------------------------------------------------------------

const selectedId = ref<string>(DUMMY_REQUIREMENTS[0]!.id)

const selectedRequirement = computed(
  () => DUMMY_REQUIREMENTS.find((r) => r.id === selectedId.value) ?? DUMMY_REQUIREMENTS[0]!,
)

/** Group requirements by category for the left panel */
const groupedRequirements = computed(() => {
  const map = new Map<string, Requirement[]>()
  for (const req of DUMMY_REQUIREMENTS) {
    const group = map.get(req.category) ?? []
    group.push(req)
    map.set(req.category, group)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
})

// ---------------------------------------------------------------------------
// Per-requirement linked items (keyed by req id + section)
// In production these come from the API; here we seed a few for demo
// ---------------------------------------------------------------------------

type LinkedState = Record<string, Record<LinkSection['id'], LinkItem[]>>

const linkedItems = ref<LinkedState>({
  'cc1.1': {
    controls: [DUMMY_CONTROLS[0]!],
    documents: [],
    audits: [DUMMY_AUDITS[0]!],
    obligations: [],
  },
})

function getLinked(reqId: string, section: LinkSection['id']): LinkItem[] {
  return linkedItems.value[reqId]?.[section] ?? []
}

function addLinked(reqId: string, section: LinkSection['id'], item: LinkItem) {
  if (!linkedItems.value[reqId]) {
    linkedItems.value[reqId] = { controls: [], documents: [], audits: [], obligations: [] }
  }
  const existing = linkedItems.value[reqId][section]
  if (!existing.some((i) => i.id === item.id)) {
    existing.push(item)
  }
}

// ---------------------------------------------------------------------------
// Link dialog state
// ---------------------------------------------------------------------------

const activeLinkSection = ref<LinkSection | null>(null)
const linkSearchQuery = ref('')
const activeTab = ref<LinkSection['id']>('controls')

watch(selectedId, () => {
  activeTab.value = 'controls'
})

const LINK_SECTIONS: Omit<LinkSection, 'items'>[] = [
  {
    id: 'controls',
    label: 'Controls',
    icon: PhShieldCheck,
    searchPlaceholder: 'Search controls…',
    columns: ['Name', 'State'],
    emptyLabel: 'No controls linked',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: PhFileText,
    searchPlaceholder: 'Search documents…',
    columns: ['Name', 'Type', 'State'],
    emptyLabel: 'No documents linked',
  },
  {
    id: 'audits',
    label: 'Audits',
    icon: PhClipboardText,
    searchPlaceholder: 'Search audits…',
    columns: ['Name', 'State'],
    emptyLabel: 'No audits linked',
  },
  {
    id: 'obligations',
    label: 'Obligations',
    icon: PhGavel,
    searchPlaceholder: 'Search obligations…',
    columns: ['Name', 'Area', 'Source', 'State'],
    emptyLabel: 'No obligations linked',
  },
]

function allItemsForSection(sectionId: LinkSection['id']): LinkItem[] {
  if (sectionId === 'controls') return DUMMY_CONTROLS
  if (sectionId === 'documents') return DUMMY_DOCUMENTS
  if (sectionId === 'audits') return DUMMY_AUDITS
  return DUMMY_OBLIGATIONS
}

const dialogSearchResults = computed(() => {
  if (!activeLinkSection.value) return []
  const all = allItemsForSection(activeLinkSection.value.id)
  const q = linkSearchQuery.value.trim().toLowerCase()
  if (!q) return all
  return all.filter((item) => item.name.toLowerCase().includes(q))
})

function openLinkDialog(sectionId: LinkSection['id']) {
  const def = LINK_SECTIONS.find((s) => s.id === sectionId)!
  activeLinkSection.value = { ...def, items: [] }
  linkSearchQuery.value = ''
}

function closeLinkDialog() {
  activeLinkSection.value = null
  linkSearchQuery.value = ''
}

function isAlreadyLinked(item: LinkItem): boolean {
  if (!activeLinkSection.value) return false
  return getLinked(selectedId.value, activeLinkSection.value.id).some((i) => i.id === item.id)
}

function toggleLink(item: LinkItem) {
  if (!activeLinkSection.value) return
  addLinked(selectedId.value, activeLinkSection.value.id, item)
}
</script>

<template>
  <div class="flex h-[calc(100dvh-3.5rem-4rem)] flex-col overflow-hidden">
    <!--
      Escape the DashboardLayout's px-6 py-8 wrapper so we can own our own
      full-height surface. h-[calc(100dvh-3.5rem)] = viewport height minus the
      h-14 AppTopBar. Each panel scrolls independently; the page header is
      sticky within the outer flex container.
    -->
    <!-- ─── Sticky page header ──────────────────────────────────────────── -->
    <header class="flex shrink-0 items-center gap-3 pb-5">
      <button
        type="button"
        class="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Back to frameworks"
        @click="goBack"
      >
        <PhArrowLeft :size="18" aria-hidden="true" />
      </button>

      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div
          class="flex shrink-0 items-center justify-center rounded-md bg-muted/60 p-1.5 text-foreground"
        >
          <component :is="logoComponent()" :size="32" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <h1 class="truncate text-xl font-semibold tracking-tight text-foreground">
            {{ frameworkName }}
          </h1>
          <p class="text-xs text-muted-foreground">Requirement categories</p>
        </div>
      </div>
    </header>

    <!-- ─── Two-panel body ──────────────────────────────────────────────── -->
    <div class="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
      <!-- Left: independently scrolling requirement list -->
      <aside
        class="clarus-scroll w-64 shrink-0 overflow-y-auto border-r border-border bg-sidebar"
        aria-label="Requirements list"
      >
        <div v-for="group in groupedRequirements" :key="group.category" class="py-3">
          <p
            class="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
          >
            {{ group.category }}
          </p>
          <button
            v-for="req in group.items"
            :key="req.id"
            type="button"
            class="w-full px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring"
            :class="{
              'bg-background': selectedId === req.id,
              'hover:bg-sidebar-accent/60': selectedId !== req.id,
            }"
            @click="selectedId = req.id"
          >
            <span
              class="mb-1 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold"
              :class="{
                'bg-primary/10 text-primary': selectedId === req.id,
                'bg-muted text-muted-foreground': selectedId !== req.id,
              }"
            >
              {{ req.code }}
            </span>
            <p
              class="line-clamp-2 text-xs leading-relaxed"
              :class="{
                'text-foreground': selectedId === req.id,
                'text-muted-foreground': selectedId !== req.id,
              }"
            >
              {{ req.description }}
            </p>
          </button>
        </div>
      </aside>

      <!-- Right: independently scrolling requirement detail -->
      <div class="clarus-scroll min-w-0 flex-1 overflow-y-auto bg-background">
        <div v-if="selectedRequirement">
          <!-- Requirement description block -->
          <div class="border-b border-border px-6 py-6 lg:px-8">
            <span
              class="mb-3 inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary"
            >
              {{ selectedRequirement.code }}
            </span>
            <p
              class="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-foreground text-pretty"
            >
              {{ selectedRequirement.description }}
            </p>

            <!-- Inline metadata chips -->
            <div
              class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4"
            >
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] text-muted-foreground">Best Practice</span>
                <span
                  class="text-sm font-medium"
                  :class="selectedRequirement.bestPractice ? 'text-success' : 'text-foreground'"
                >
                  {{ selectedRequirement.bestPractice ? 'Yes' : 'No' }}
                </span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] text-muted-foreground">Maturity level</span>
                <span class="text-sm font-medium text-foreground">{{
                  selectedRequirement.maturityLevel
                }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] text-muted-foreground">Category</span>
                <span class="text-sm font-medium text-foreground">{{
                  selectedRequirement.category
                }}</span>
              </div>
            </div>
          </div>

          <!-- ─── Tabbed link sections ──────────────────────────────────── -->
          <div class="px-6 py-5 lg:px-8">
            <!-- Tab bar -->
            <div
              class="mb-5 flex items-end border-b border-border"
              role="tablist"
              aria-label="Linked items"
            >
              <button
                v-for="section in LINK_SECTIONS"
                :key="section.id"
                type="button"
                role="tab"
                :id="`tab-${section.id}`"
                :aria-selected="activeTab === section.id"
                :aria-controls="`tabpanel-${section.id}`"
                class="relative flex items-center gap-1.5 px-3.5 pb-2.5 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 first:pl-0"
                :class="{
                  'text-foreground': activeTab === section.id,
                  'text-muted-foreground hover:text-foreground': activeTab !== section.id,
                }"
                @click="activeTab = section.id"
              >
                <component :is="section.icon" :size="14" aria-hidden="true" />
                {{ section.label }}
                <span
                  v-if="getLinked(selectedId, section.id).length"
                  class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/12 px-1 text-[10px] font-semibold text-primary"
                >
                  {{ getLinked(selectedId, section.id).length }}
                </span>
                <!-- Active underline -->
                <span
                  v-if="activeTab === section.id"
                  class="absolute inset-x-0 bottom-0 h-[2px] rounded-t-full bg-primary transition-transform"
                  aria-hidden="true"
                />
              </button>
            </div>

            <!-- Tab panels, shown one at a time -->
            <div
              v-for="section in LINK_SECTIONS"
              v-show="activeTab === section.id"
              :id="`tabpanel-${section.id}`"
              :key="section.id"
              role="tabpanel"
              :aria-labelledby="`tab-${section.id}`"
            >
              <!-- Link action button -->
              <div class="mb-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  class="gap-1.5 text-xs"
                  @click="openLinkDialog(section.id)"
                >
                  <PhPlus :size="13" weight="bold" aria-hidden="true" />
                  Link
                  {{
                    section.id === 'audits'
                      ? 'audit'
                      : section.id === 'obligations'
                        ? 'obligation'
                        : section.id === 'documents'
                          ? 'document'
                          : 'control'
                  }}
                </Button>
              </div>

              <!-- Controls -->
              <template v-if="section.id === 'controls'">
                <div class="overflow-hidden rounded-lg border border-border">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-border bg-muted/40">
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Name
                        </th>
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          State
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in getLinked(selectedId, 'controls')"
                        :key="item.id"
                        class="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20"
                      >
                        <td class="px-4 py-3 text-sm text-foreground">{{ item.name }}</td>
                        <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.state }}</td>
                      </tr>
                      <tr v-if="!getLinked(selectedId, 'controls').length">
                        <td colspan="2" class="py-10 text-center">
                          <div class="flex flex-col items-center gap-2">
                            <PhShieldCheck :size="24" class="text-border" aria-hidden="true" />
                            <p class="text-sm text-muted-foreground">No controls linked yet</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- Documents -->
              <template v-else-if="section.id === 'documents'">
                <div class="overflow-hidden rounded-lg border border-border">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-border bg-muted/40">
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Name
                        </th>
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Type
                        </th>
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          State
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in getLinked(selectedId, 'documents')"
                        :key="item.id"
                        class="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20"
                      >
                        <td class="px-4 py-3 text-sm text-foreground">{{ item.name }}</td>
                        <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.type }}</td>
                        <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.state }}</td>
                      </tr>
                      <tr v-if="!getLinked(selectedId, 'documents').length">
                        <td colspan="3" class="py-10 text-center">
                          <div class="flex flex-col items-center gap-2">
                            <PhFileText :size="24" class="text-border" aria-hidden="true" />
                            <p class="text-sm text-muted-foreground">No documents linked yet</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- Audits -->
              <template v-else-if="section.id === 'audits'">
                <div class="overflow-hidden rounded-lg border border-border">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-border bg-muted/40">
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Name
                        </th>
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          State
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in getLinked(selectedId, 'audits')"
                        :key="item.id"
                        class="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20"
                      >
                        <td class="px-4 py-3 text-sm text-foreground">{{ item.name }}</td>
                        <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.state }}</td>
                      </tr>
                      <tr v-if="!getLinked(selectedId, 'audits').length">
                        <td colspan="2" class="py-10 text-center">
                          <div class="flex flex-col items-center gap-2">
                            <PhClipboardText :size="24" class="text-border" aria-hidden="true" />
                            <p class="text-sm text-muted-foreground">No audits linked yet</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- Obligations -->
              <template v-else-if="section.id === 'obligations'">
                <div class="overflow-hidden rounded-lg border border-border">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-border bg-muted/40">
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Name
                        </th>
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Area
                        </th>
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Source
                        </th>
                        <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="item in getLinked(selectedId, 'obligations')"
                        :key="item.id"
                        class="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20"
                      >
                        <td class="px-4 py-3 text-sm text-foreground">{{ item.name }}</td>
                        <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.area }}</td>
                        <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.source }}</td>
                        <td class="px-4 py-3 text-sm text-muted-foreground">{{ item.state }}</td>
                      </tr>
                      <tr v-if="!getLinked(selectedId, 'obligations').length">
                        <td colspan="4" class="py-10 text-center">
                          <div class="flex flex-col items-center gap-2">
                            <PhGavel :size="24" class="text-border" aria-hidden="true" />
                            <p class="text-sm text-muted-foreground">No obligations linked yet</p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Link items dialog ───────────────────────────────────────────── -->
    <Dialog :open="!!activeLinkSection" @update:open="(v) => !v && closeLinkDialog()">
      <DialogContent
        class="flex max-h-[min(36rem,calc(100vh-4rem))] flex-col gap-0 p-0 sm:max-w-lg overflow-hidden"
      >
        <DialogHeader class="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle class="flex items-center gap-2 text-base">
            <component
              :is="LINK_SECTIONS.find((s) => s.id === activeLinkSection?.id)?.icon"
              :size="18"
              class="text-muted-foreground"
              aria-hidden="true"
            />
            Link {{ activeLinkSection?.label }}
          </DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground">
            Search and select {{ activeLinkSection?.label?.toLowerCase() }} to link to this
            requirement.
          </DialogDescription>
        </DialogHeader>

        <!-- Search bar -->
        <div class="shrink-0 border-b border-border px-4 py-3">
          <div class="relative">
            <PhMagnifyingGlass
              :size="16"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              v-model="linkSearchQuery"
              :placeholder="activeLinkSection?.searchPlaceholder ?? 'Search…'"
              class="pl-9"
              type="search"
              autocomplete="off"
            />
          </div>
        </div>

        <!-- Results list -->
        <div class="clarus-scroll min-h-0 flex-1 overflow-y-auto">
          <ul role="list" class="divide-y divide-border">
            <li
              v-for="item in dialogSearchResults"
              :key="item.id"
              class="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-foreground">{{ item.name }}</p>
                <p class="mt-0.5 truncate text-xs text-muted-foreground">
                  <template v-if="item.type">{{ item.type }} · </template>
                  <template v-if="item.source">{{ item.source }} · </template>
                  <template v-if="item.area">{{ item.area }} · </template>
                  {{ item.state }}
                </p>
              </div>
              <Button
                size="sm"
                :variant="isAlreadyLinked(item) ? 'secondary' : 'outline'"
                class="shrink-0 text-xs"
                @click="toggleLink(item)"
              >
                {{ isAlreadyLinked(item) ? 'Linked' : 'Link' }}
              </Button>
            </li>
            <li
              v-if="!dialogSearchResults.length"
              class="px-5 py-8 text-center text-sm text-muted-foreground"
            >
              No results for "{{ linkSearchQuery }}"
            </li>
          </ul>
        </div>

        <DialogFooter class="shrink-0 border-t border-border px-5 py-3">
          <Button variant="outline" @click="closeLinkDialog">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
