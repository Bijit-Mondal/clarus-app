<script setup lang="ts">
import type { Component } from 'vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  PhArrowClockwise,
  PhArrowLeft,
  PhCalendar,
  PhCheckCircle,
  PhDotsThree,
  PhFolder,
  PhPlus,
  PhShieldCheck,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import AICPALogo from '@/components/brand/AICPALogo.vue'
import HIPAALogo from '@/components/brand/HIPAALogo.vue'
import ISOLogo from '@/components/brand/ISOLogo.vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import {
  adoptFramework,
  getFrameworkReleases,
  getFrameworks,
  getTenantFrameworks,
  type Framework,
  type FrameworkRelease,
  type TenantFramework,
} from '@/api/frameworks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getApiErrorMessage } from '@/lib/api'
import { useOrganizationStore } from '@/stores/organization'

// --- Enriched type for display ---
type AdoptedFrameworkDisplay = {
  tenantFramework: TenantFramework
  framework: Framework | undefined
  release: FrameworkRelease | undefined
}

const organizationStore = useOrganizationStore()
const router = useRouter()
const route = useRoute()

function navigateToRequirements(item: AdoptedFrameworkDisplay) {
  const slug = route.params.organizationSlug as string
  void router.push({
    name: 'controls-framework-requirements',
    params: {
      organizationSlug: slug,
      frameworkId: item.tenantFramework.frameworkReleaseId,
    },
    query: {
      name: item.framework?.name ?? '',
      publisher: item.framework?.publisher ?? '',
    },
  })
}

// --- Adopted frameworks state (page body) ---
const adoptedFrameworks = ref<TenantFramework[]>([])
const isLoadingAdopted = ref(true)
const adoptedError = ref('')

// --- Catalog data for enrichment ---
const frameworks = ref<Framework[]>([])
const allReleases = ref<Map<string, FrameworkRelease>>(new Map())
const isLoadingFrameworks = ref(false)
const frameworksError = ref('')

// --- Adoption dialog state ---
const isAdoptionDialogOpen = ref(false)
const selectedFramework = ref<Framework>()
const dialogReleases = ref<FrameworkRelease[]>([])
const isLoadingReleases = ref(false)
const releasesError = ref('')
const selectedReleaseId = ref('')
const mapControls = ref(true)
const isAdopting = ref(false)
const adoptionError = ref('')
const adoptedReleaseTitle = ref('')

const selectedRelease = computed(() =>
  dialogReleases.value.find((release) => release.$id === selectedReleaseId.value),
)

const mappingMode = computed<'recommended' | 'assessments_only'>(() =>
  mapControls.value ? 'recommended' : 'assessments_only',
)

const dialogStep = computed<'pick-framework' | 'pick-release' | 'adopted'>(() => {
  if (adoptedReleaseTitle.value) return 'adopted'
  if (selectedFramework.value) return 'pick-release'
  return 'pick-framework'
})

/**
 * Build enriched display items by joining tenant frameworks with
 * the catalog frameworks + releases. The API doesn't embed these
 * yet, so we cross-reference client-side.
 */
const adoptedDisplay = computed<AdoptedFrameworkDisplay[]>(() => {
  return adoptedFrameworks.value.map((tf) => {
    const release = allReleases.value.get(tf.frameworkReleaseId)
    const framework = release
      ? frameworks.value.find((fw) => fw.$id === release.frameworkId)
      : undefined
    return { tenantFramework: tf, framework, release }
  })
})

function frameworkLogo(framework: Framework): Component {
  if (framework.publisher === 'AICPA') return AICPALogo
  if (framework.publisher === 'ISO') return ISOLogo
  if (framework.key === 'hipaa' || framework.publisher === 'HHS') return HIPAALogo
  return PhShieldCheck
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

// --- Data loading ---

async function loadAdopted() {
  const tenantId = organizationStore.activeOrganization?.id
  if (!tenantId) return

  isLoadingAdopted.value = true
  adoptedError.value = ''

  try {
    const response = await getTenantFrameworks(tenantId)
    adoptedFrameworks.value = response.tenantFrameworks
  } catch (error: unknown) {
    adoptedError.value = getApiErrorMessage(error, 'Unable to load adopted frameworks. Try again.')
  } finally {
    isLoadingAdopted.value = false
  }
}

async function loadFrameworksCatalog() {
  isLoadingFrameworks.value = true
  frameworksError.value = ''

  try {
    const response = await getFrameworks()
    frameworks.value = response.frameworks

    // Fetch releases for every framework so we can enrich the page + dialog
    const releasesMap = new Map<string, FrameworkRelease>()
    const releaseResponses = await Promise.allSettled(
      response.frameworks.map((fw) => getFrameworkReleases(fw.$id)),
    )
    for (const result of releaseResponses) {
      if (result.status === 'fulfilled') {
        for (const release of result.value.frameworkReleases) {
          releasesMap.set(release.$id, release)
        }
      }
    }
    allReleases.value = releasesMap
  } catch (error: unknown) {
    frameworksError.value = getApiErrorMessage(error, 'Unable to load frameworks. Try again.')
  } finally {
    isLoadingFrameworks.value = false
  }
}

async function selectFramework(framework: Framework) {
  selectedFramework.value = framework
  dialogReleases.value = []
  selectedReleaseId.value = ''
  releasesError.value = ''
  adoptionError.value = ''
  adoptedReleaseTitle.value = ''
  isLoadingReleases.value = true

  try {
    const response = await getFrameworkReleases(framework.$id)
    dialogReleases.value = response.frameworkReleases.filter((release) => release.status === 'published')
    selectedReleaseId.value = dialogReleases.value[0]?.$id ?? ''
  } catch (error: unknown) {
    releasesError.value = getApiErrorMessage(error, 'Unable to load framework releases. Try again.')
  } finally {
    isLoadingReleases.value = false
  }
}

function openAdoptionDialog() {
  isAdoptionDialogOpen.value = true
  if (!frameworks.value.length) void loadFrameworksCatalog()
}

function goBackToFrameworks() {
  selectedFramework.value = undefined
  dialogReleases.value = []
  selectedReleaseId.value = ''
  releasesError.value = ''
  adoptionError.value = ''
}

function resetAdoptionFlow() {
  selectedFramework.value = undefined
  dialogReleases.value = []
  selectedReleaseId.value = ''
  releasesError.value = ''
  adoptionError.value = ''
  adoptedReleaseTitle.value = ''
  mapControls.value = true
}

async function adoptSelectedFramework() {
  if (!selectedRelease.value) return

  const tenantId = organizationStore.activeOrganization?.id
  if (!tenantId) {
    adoptionError.value = 'Select an organization before adopting a framework.'
    return
  }

  isAdopting.value = true
  adoptionError.value = ''
  try {
    await adoptFramework(tenantId, {
      frameworkReleaseId: selectedRelease.value.$id,
      mappingMode: mappingMode.value,
    })
    adoptedReleaseTitle.value = selectedRelease.value.title
    // Refresh adopted list so the page shows the new framework
    void loadAdopted()
  } catch (error: unknown) {
    adoptionError.value = getApiErrorMessage(error, 'Unable to adopt this framework. Try again.')
  } finally {
    isAdopting.value = false
  }
}

watch(isAdoptionDialogOpen, (isOpen) => {
  if (!isOpen) resetAdoptionFlow()
})

onMounted(async () => {
  // Load catalog first (for enrichment), then adopted frameworks
  await loadFrameworksCatalog()
  await loadAdopted()
})
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button size="sm" @click="openAdoptionDialog()">
          <PhPlus :size="16" weight="bold" aria-hidden="true" />
          Add framework
        </Button>
      </template>
    </PageHeader>

    <!-- Adopted frameworks -->
    <section aria-labelledby="adopted-heading">
      <!-- Loading -->
      <div v-if="isLoadingAdopted" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading adopted frameworks">
        <div v-for="item in 3" :key="item" class="h-36 animate-pulse rounded-lg border border-border bg-muted/50" />
      </div>

      <!-- Error -->
      <div v-else-if="adoptedError" class="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <div class="flex items-start gap-3">
          <PhWarningCircle :size="20" class="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p class="font-medium text-foreground">Adopted frameworks could not be loaded</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ adoptedError }}</p>
            <Button class="mt-4" size="sm" variant="outline" @click="loadAdopted">Try again</Button>
          </div>
        </div>
      </div>

      <!-- Adopted list -->
      <div v-else-if="adoptedDisplay.length" class="space-y-5">
        <div class="flex items-center justify-between gap-4">
          <p class="text-sm text-muted-foreground">
            {{ adoptedDisplay.length }} {{ adoptedDisplay.length === 1 ? 'framework' : 'frameworks' }} adopted
          </p>
          <Button
            variant="ghost"
            size="sm"
            :disabled="isLoadingAdopted"
            @click="loadAdopted"
          >
            <PhArrowClockwise :size="16" :class="{ 'animate-spin': isLoadingAdopted }" aria-hidden="true" />
            Refresh
          </Button>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in adoptedDisplay"
            :key="item.tenantFramework.$id"
            class="group relative flex cursor-pointer flex-col rounded-lg border border-border bg-card transition-shadow hover:shadow-sm"
            tabindex="0"
            :aria-label="`Open requirements for ${item.framework?.name ?? 'framework'}`"
            role="button"
            @click="navigateToRequirements(item)"
            @keydown.enter="navigateToRequirements(item)"
            @keydown.space.prevent="navigateToRequirements(item)"
          >
            <!-- Top section: logo + three-dot menu -->
            <div class="flex items-start justify-between p-5 pb-3">
              <!-- Large logo -->
              <div class="flex items-center justify-center rounded-md bg-muted/60 p-3 text-foreground">
                <component
                  :is="item.framework ? frameworkLogo(item.framework) : PhShieldCheck"
                  :size="48"
                  aria-hidden="true"
                />
              </div>

              <!-- Three-dot menu -->
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    class="flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :aria-label="`Options for ${item.framework?.name ?? 'framework'}`"
                    @click.stop
                  >
                    <PhDotsThree :size="20" weight="bold" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-44">
                  <DropdownMenuItem @click.stop="navigateToRequirements(item)">View requirements</DropdownMenuItem>
                  <DropdownMenuItem>View controls</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem class="text-destructive focus:text-destructive">Remove framework</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <!-- Framework name -->
            <div class="px-5 pb-4">
              <h3 class="text-lg font-semibold leading-tight text-foreground">
                {{ item.framework?.name ?? 'Framework' }}
              </h3>
              <p v-if="item.release" class="mt-0.5 font-mono text-xs text-muted-foreground">
                {{ item.release.title }} &middot; v{{ item.release.version }}
              </p>
            </div>

            <!-- Bottom strip: adopted date -->
            <div class="mt-auto flex items-center gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <PhCalendar :size="13" aria-hidden="true" class="shrink-0" />
              <span>Adopted {{ formatDate(item.tenantFramework.adoptedAt) }}</span>
            </div>
          </article>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="rounded-lg border border-dashed border-border px-6 py-16 text-center">
        <div
          class="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          <PhFolder :size="24" aria-hidden="true" />
        </div>
        <h3 class="mt-4 font-medium text-foreground">
          No frameworks adopted yet
        </h3>
        <p class="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Adopt a compliance framework to begin mapping controls and tracking readiness for
          {{ organizationStore.activeOrganization?.name ?? 'your organization' }}.
        </p>
        <Button class="mt-5" size="sm" @click="openAdoptionDialog()">
          <PhPlus :size="16" weight="bold" aria-hidden="true" />
          Add framework
        </Button>
      </div>
    </section>

    <!-- Adoption dialog — stepped flow -->
    <Dialog v-model:open="isAdoptionDialogOpen">
      <DialogContent class="max-h-[min(44rem,calc(100vh-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div class="flex items-center gap-2">
            <button
              v-if="dialogStep === 'pick-release'"
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to frameworks"
              @click="goBackToFrameworks"
            >
              <PhArrowLeft :size="16" aria-hidden="true" />
            </button>
            <DialogTitle>
              <template v-if="dialogStep === 'adopted'">Framework adopted</template>
              <template v-else-if="dialogStep === 'pick-release'">{{ selectedFramework?.name }}</template>
              <template v-else>Add a framework</template>
            </DialogTitle>
          </div>
          <DialogDescription>
            <template v-if="dialogStep === 'adopted'">You can now begin tracking its requirements.</template>
            <template v-else-if="dialogStep === 'pick-release'">Choose a published release to adopt.</template>
            <template v-else>Browse available compliance frameworks and choose one to adopt.</template>
          </DialogDescription>
        </DialogHeader>

        <!-- Step indicator -->
        <div
          v-if="dialogStep !== 'adopted'"
          class="flex items-center gap-2 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          <span
            class="inline-flex items-center gap-1.5 font-medium"
            :class="{ 'text-foreground': dialogStep === 'pick-framework' }"
          >
            <span
              class="flex size-5 items-center justify-center rounded-full text-[11px] font-semibold"
              :class="{
                'bg-primary text-primary-foreground': dialogStep === 'pick-framework',
                'bg-muted text-muted-foreground': dialogStep !== 'pick-framework',
              }"
            >1</span>
            Framework
          </span>
          <span class="h-px w-6 bg-border" />
          <span
            class="inline-flex items-center gap-1.5 font-medium"
            :class="{ 'text-foreground': dialogStep === 'pick-release' }"
          >
            <span
              class="flex size-5 items-center justify-center rounded-full text-[11px] font-semibold"
              :class="{
                'bg-primary text-primary-foreground': dialogStep === 'pick-release',
                'bg-muted text-muted-foreground': dialogStep !== 'pick-release',
              }"
            >2</span>
            Release
          </span>
        </div>

        <!-- Success state -->
        <div v-if="adoptedReleaseTitle" class="rounded-lg border border-success/30 bg-success/10 p-4">
          <div class="flex gap-3">
            <PhCheckCircle :size="20" weight="fill" class="shrink-0 text-success" aria-hidden="true" />
            <div>
              <p class="font-medium text-foreground">{{ adoptedReleaseTitle }} was adopted</p>
              <p class="mt-1 text-sm text-muted-foreground">You can now begin tracking its requirements.</p>
            </div>
          </div>
        </div>

        <!-- Step 1: Pick a framework -->
        <template v-else-if="!selectedFramework">
          <div v-if="isLoadingFrameworks" class="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Loading frameworks">
            <div v-for="item in 4" :key="item" class="h-16 animate-pulse rounded-lg bg-muted" />
          </div>

          <div v-else-if="frameworksError" class="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div class="flex items-start gap-3">
              <PhWarningCircle :size="20" class="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <p class="font-medium text-foreground">Frameworks could not be loaded</p>
                <p class="mt-1 text-sm text-muted-foreground">{{ frameworksError }}</p>
                <Button class="mt-3" size="sm" variant="outline" @click="loadFrameworksCatalog">Try again</Button>
              </div>
            </div>
          </div>

          <div v-else-if="frameworks.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              v-for="framework in frameworks"
              :key="framework.$id"
              type="button"
              class="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="framework.status !== 'active'"
              @click="selectFramework(framework)"
            >
              <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <component :is="frameworkLogo(framework)" :size="22" aria-hidden="true" />
              </div>
              <span class="min-w-0 flex-1">
                <span class="block font-medium text-foreground">{{ framework.name }}</span>
                <span class="block truncate text-sm text-muted-foreground">{{ framework.publisher }}</span>
              </span>
              <span
                v-if="framework.status !== 'active'"
                class="shrink-0 text-xs text-muted-foreground"
              >
                {{ framework.status }}
              </span>
            </button>
          </div>

          <div v-else class="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No frameworks are available. Contact your administrator.
          </div>
        </template>

        <!-- Step 2: Pick a release -->
        <template v-else-if="!adoptedReleaseTitle">
          <div v-if="isLoadingReleases" class="space-y-3" aria-label="Loading releases">
            <div v-for="item in 2" :key="item" class="h-20 animate-pulse rounded-lg bg-muted" />
          </div>

          <div v-else-if="releasesError" class="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p class="font-medium text-foreground">Releases could not be loaded</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ releasesError }}</p>
            <Button class="mt-3" size="sm" variant="outline" @click="selectFramework(selectedFramework!)">Try again</Button>
          </div>

          <template v-else>
            <div v-if="dialogReleases.length" class="space-y-2">
              <p class="text-sm font-medium text-foreground">Published releases</p>
              <button
                v-for="release in dialogReleases"
                :key="release.$id"
                type="button"
                class="flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="{
                  'border-primary bg-primary/5': selectedReleaseId === release.$id,
                  'border-border hover:bg-muted/50': selectedReleaseId !== release.$id,
                }"
                @click="selectedReleaseId = release.$id"
              >
                <span
                  class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border"
                  :class="{
                    'border-primary bg-primary text-primary-foreground': selectedReleaseId === release.$id,
                    'border-muted-foreground': selectedReleaseId !== release.$id,
                  }"
                >
                  <PhCheckCircle v-if="selectedReleaseId === release.$id" :size="14" weight="fill" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span class="font-medium text-foreground">{{ release.title }}</span>
                    <span class="font-mono text-xs text-muted-foreground">v{{ release.version }}</span>
                  </span>
                  <span class="mt-1 block text-sm text-muted-foreground">Published {{ formatDate(release.publishedAt) }}</span>
                  <span v-if="release.releaseNotes" class="mt-2 block text-sm text-muted-foreground">{{ release.releaseNotes }}</span>
                </span>
              </button>
            </div>

            <div v-else class="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              There are no published releases available for {{ selectedFramework.name }}.
            </div>

            <div v-if="selectedRelease" class="mt-5 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <Label for="map-controls">Map controls</Label>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ mapControls ? 'Apply recommended control mappings.' : 'Adopt assessments only without control mappings.' }}
                </p>
              </div>
              <Switch id="map-controls" v-model="mapControls" aria-label="Map controls" />
            </div>

            <p v-if="adoptionError" class="mt-4 text-sm text-destructive" role="alert">{{ adoptionError }}</p>
          </template>
        </template>

        <DialogFooter>
          <Button variant="outline" @click="isAdoptionDialogOpen = false">
            {{ adoptedReleaseTitle ? 'Close' : 'Cancel' }}
          </Button>
          <Button
            v-if="!adoptedReleaseTitle"
            :disabled="!selectedRelease || isAdopting"
            @click="adoptSelectedFramework"
          >
            {{ isAdopting ? 'Adopting…' : 'Adopt framework' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
