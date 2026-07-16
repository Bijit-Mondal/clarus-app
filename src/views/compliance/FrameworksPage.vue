<script setup lang="ts">
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
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
import CCPALogo from '@/components/brand/CCPALogo.vue'
import GDPRLogo from '@/components/brand/GDPRLogo.vue'
import HIPAALogo from '@/components/brand/HIPAALogo.vue'
import ISOLogo from '@/components/brand/ISOLogo.vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ClarusLoadingState from '@/components/feedback/ClarusLoadingState.vue'
import type { Framework, TenantFramework, FrameworkRelease } from '@/api/frameworks'
import {
  useAdoptFrameworkMutation,
  useFrameworkReleasesQuery,
  useFrameworksCatalogQuery,
  useTenantFrameworksQuery,
} from '@/composables/useFrameworks'
import { useOrganizationStore } from '@/stores/organization'
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

// --- Enriched type for display ---
type AdoptedFrameworkDisplay = {
  tenantFramework: TenantFramework
  framework: Framework | undefined
  release: FrameworkRelease | undefined
}

const router = useRouter()
const route = useRoute()
const organizationStore = useOrganizationStore()

function navigateToRequirements(item: AdoptedFrameworkDisplay) {
  const slug = route.params.organizationSlug as string
  void router.push({
    name: 'compliance-framework-requirements',
    params: {
      organizationSlug: slug,
      frameworkId: item.tenantFramework.$id,
    },
    query: {
      name: item.framework?.name ?? '',
      publisher: item.framework?.publisher ?? '',
    },
  })
}

function navigateToNewlyAdopted() {
  if (!newlyAdopted.value) return
  navigateToRequirements({
    tenantFramework: newlyAdopted.value,
    framework: newlyAdopted.value.framework,
    release: newlyAdopted.value.frameworkRelease,
  })
}

// --- Adopted frameworks (page body) ---
const {
  data: tenantFrameworksData,
  isPending: isLoadingAdopted,
  isFetching: isFetchingAdopted,
  error: adoptedQueryError,
  refetch: refetchAdopted,
} = useTenantFrameworksQuery()

const adoptedFrameworks = computed(() => tenantFrameworksData.value?.tenantFrameworks ?? [])
const adoptedError = computed(() =>
  adoptedQueryError.value
    ? getApiErrorMessage(adoptedQueryError.value, 'Unable to load adopted frameworks. Try again.')
    : '',
)

// --- Adoption dialog state ---
const isAdoptionDialogOpen = ref(false)
const selectedFramework = ref<Framework>()
const selectedReleaseId = ref('')
const mapControls = ref(true)
const adoptionError = ref('')
const newlyAdopted = ref<TenantFramework | null>(null)

const {
  data: frameworksCatalogData,
  isPending: isLoadingFrameworks,
  error: frameworksQueryError,
  refetch: refetchFrameworksCatalog,
} = useFrameworksCatalogQuery(isAdoptionDialogOpen)

const frameworks = computed(() => frameworksCatalogData.value?.frameworks ?? [])
const frameworksError = computed(() =>
  frameworksQueryError.value
    ? getApiErrorMessage(frameworksQueryError.value, 'Unable to load frameworks. Try again.')
    : '',
)

const selectedFrameworkId = computed(() => selectedFramework.value?.$id)
const {
  data: releasesData,
  isPending: isLoadingReleases,
  error: releasesQueryError,
} = useFrameworkReleasesQuery(selectedFrameworkId)

const dialogReleases = computed(() =>
  (releasesData.value?.frameworkReleases ?? []).filter((release) => release.status === 'published'),
)
const releasesError = computed(() =>
  releasesQueryError.value
    ? getApiErrorMessage(releasesQueryError.value, 'Unable to load framework releases. Try again.')
    : '',
)

const adoptFrameworkMutation = useAdoptFrameworkMutation()
const isAdopting = computed(() => adoptFrameworkMutation.isPending.value)

const selectedRelease = computed(() =>
  dialogReleases.value.find((release) => release.$id === selectedReleaseId.value),
)

const mappingMode = computed<'recommended' | 'assessments_only'>(() =>
  mapControls.value ? 'recommended' : 'assessments_only',
)

const dialogStep = computed<'pick-framework' | 'pick-release' | 'adopted'>(() => {
  if (newlyAdopted.value) return 'adopted'
  if (selectedFramework.value) return 'pick-release'
  return 'pick-framework'
})

const isAdopted = (frameworkId: string) => {
  return adoptedFrameworks.value.some(
    (tf) => tf.framework?.$id === frameworkId || tf.frameworkRelease?.frameworkId === frameworkId,
  )
}

/**
 * Build enriched display items using embedded framework and release
 * data from the tenant frameworks list.
 */
const adoptedDisplay = computed<AdoptedFrameworkDisplay[]>(() => {
  return adoptedFrameworks.value.map((tf) => {
    return {
      tenantFramework: tf,
      framework: tf.framework,
      release: tf.frameworkRelease,
    }
  })
})

watch(dialogReleases, (releases) => {
  if (!releases.some((release) => release.$id === selectedReleaseId.value)) {
    selectedReleaseId.value = releases[0]?.$id ?? ''
  }
})

function frameworkLogo(framework: Framework): Component {
  if (framework.publisher === 'AICPA') return AICPALogo
  if (framework.publisher === 'ISO') return ISOLogo
  if (framework.key === 'hipaa' || framework.publisher === 'HHS') return HIPAALogo
  if (framework.key === 'gdpr' || framework.publisher === 'GDPR' || framework.publisher === 'EU')
    return GDPRLogo
  if (framework.key === 'ccpa' || framework.publisher === 'CCPA') return CCPALogo
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

function loadAdopted() {
  void refetchAdopted()
}

function loadFrameworksCatalog() {
  void refetchFrameworksCatalog()
}

function selectFramework(framework: Framework) {
  selectedFramework.value = framework
  selectedReleaseId.value = ''
  adoptionError.value = ''
  newlyAdopted.value = null
}

function openAdoptionDialog() {
  isAdoptionDialogOpen.value = true
}

function goBackToFrameworks() {
  selectedFramework.value = undefined
  selectedReleaseId.value = ''
  adoptionError.value = ''
}

function resetAdoptionFlow() {
  selectedFramework.value = undefined
  selectedReleaseId.value = ''
  adoptionError.value = ''
  newlyAdopted.value = null
  mapControls.value = true
}

async function adoptSelectedFramework() {
  if (!selectedRelease.value) return

  adoptionError.value = ''
  try {
    newlyAdopted.value = await adoptFrameworkMutation.mutateAsync({
      frameworkReleaseId: selectedRelease.value.$id,
      mappingMode: mappingMode.value,
    })
  } catch (error: unknown) {
    adoptionError.value = getApiErrorMessage(error, 'Unable to adopt this framework. Try again.')
  }
}

watch(isAdoptionDialogOpen, (isOpen) => {
  if (!isOpen) resetAdoptionFlow()
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
      <ClarusLoadingState
        v-if="isLoadingAdopted"
        variant="framework-cards"
        :rows="3"
        label="Loading adopted frameworks"
      />

      <!-- Error -->
      <div
        v-else-if="adoptedError"
        class="rounded-lg border border-destructive/30 bg-destructive/5 p-5"
      >
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
            {{ adoptedDisplay.length }}
            {{ adoptedDisplay.length === 1 ? 'framework' : 'frameworks' }} adopted
          </p>
          <Button variant="ghost" size="sm" :disabled="isFetchingAdopted" @click="loadAdopted">
            <PhArrowClockwise
              :size="16"
              :class="{ 'animate-spin': isFetchingAdopted }"
              aria-hidden="true"
            />
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
              <div
                class="flex items-center justify-center rounded-md bg-muted/60 p-3 text-foreground"
              >
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
                  <DropdownMenuItem @click.stop="navigateToRequirements(item)"
                    >View requirements</DropdownMenuItem
                  >
                  <DropdownMenuItem>View controls</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem class="text-destructive focus:text-destructive"
                    >Remove framework</DropdownMenuItem
                  >
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <!-- Framework name -->
            <div class="min-w-0 px-5 pb-4">
              <h3
                class="truncate text-lg font-semibold leading-tight text-foreground"
                :title="item.framework?.name"
              >
                {{ item.framework?.name ?? 'Framework' }}
              </h3>
              <p
                v-if="item.release"
                class="mt-0.5 truncate font-mono text-xs text-muted-foreground"
                :title="item.release.title"
              >
                {{ item.release.title }} &middot; v{{ item.release.version }}
              </p>
            </div>

            <!-- Bottom strip: adopted date -->
            <div
              class="mt-auto flex items-center gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground"
            >
              <PhCalendar :size="13" aria-hidden="true" class="shrink-0" />
              <span>Adopted {{ formatDate(item.tenantFramework.adoptedAt) }}</span>
            </div>
          </article>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="mx-auto max-w-lg py-20 text-center">
        <div
          class="mx-auto flex size-16 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        >
          <PhFolder :size="28" aria-hidden="true" />
        </div>
        <h3 class="mt-5 text-lg font-semibold text-foreground">No frameworks adopted yet</h3>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
          Adopt a compliance framework to begin mapping controls and tracking readiness for
          <span class="text-foreground">{{
            organizationStore.activeOrganization?.name ?? 'your organization'
          }}</span
          >. Once adopted, requirements, controls, and evidence tracking will be available from this
          page.
        </p>
        <div class="mt-8 space-y-3">
          <Button size="sm" @click="openAdoptionDialog()">
            <PhPlus :size="16" weight="bold" aria-hidden="true" />
            Add framework
          </Button>
          <p class="text-xs text-muted-foreground">
            SOC 2, ISO 27001, HIPAA, GDPR, and more available
          </p>
        </div>
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
              <template v-else-if="dialogStep === 'pick-release'">{{
                selectedFramework?.name
              }}</template>
              <template v-else>Add a framework</template>
            </DialogTitle>
          </div>
          <DialogDescription>
            <template v-if="dialogStep === 'adopted'"
              >You can now begin tracking its requirements.</template
            >
            <template v-else-if="dialogStep === 'pick-release'"
              >Choose a published release to adopt.</template
            >
            <template v-else
              >Browse available compliance frameworks and choose one to adopt.</template
            >
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
              >1</span
            >
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
              >2</span
            >
            Release
          </span>
        </div>

        <!-- Success state -->
        <div v-if="newlyAdopted" class="rounded-lg border border-success/30 bg-success/5 p-5">
          <div class="flex gap-4">
            <!-- Large logo for the adopted framework -->
            <div
              class="flex shrink-0 items-center justify-center rounded-md bg-muted/60 p-3 text-foreground"
            >
              <component
                :is="newlyAdopted.framework ? frameworkLogo(newlyAdopted.framework) : PhShieldCheck"
                :size="40"
                aria-hidden="true"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-medium text-foreground text-base">
                {{ newlyAdopted.framework?.name || newlyAdopted.frameworkRelease?.title }} has been
                adopted
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                Version {{ newlyAdopted.frameworkRelease?.version }} &middot; Publisher:
                {{ newlyAdopted.framework?.publisher }}
              </p>
              <div
                class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
              >
                <span class="flex items-center gap-1">
                  <PhCalendar :size="13" />
                  Adopted on {{ formatDate(newlyAdopted.adoptedAt) }}
                </span>
                <span class="flex items-center gap-1">
                  <PhShieldCheck :size="13" />
                  Status:
                  <span class="capitalize text-success-emphasis font-medium">{{
                    newlyAdopted.status
                  }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1: Pick a framework -->
        <template v-else-if="!selectedFramework">
          <ClarusLoadingState
            v-if="isLoadingFrameworks"
            variant="compact"
            label="Loading framework catalog"
          />

          <div
            v-else-if="frameworksError"
            class="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <div class="flex items-start gap-3">
              <PhWarningCircle
                :size="20"
                class="mt-0.5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p class="font-medium text-foreground">Frameworks could not be loaded</p>
                <p class="mt-1 text-sm text-muted-foreground">{{ frameworksError }}</p>
                <Button class="mt-3" size="sm" variant="outline" @click="loadFrameworksCatalog"
                  >Try again</Button
                >
              </div>
            </div>
          </div>

          <div v-else-if="frameworks.length" class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              v-for="framework in frameworks"
              :key="framework.$id"
              type="button"
              class="group relative flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-muted/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="framework.status !== 'active' || isAdopted(framework.$id)"
              @click="selectFramework(framework)"
            >
              <!-- Typography mirroring the tenant framework card on the left -->
              <div class="min-w-0 flex-1">
                <span
                  class="block truncate text-lg font-semibold leading-tight text-foreground"
                  :title="framework.name"
                >
                  {{ framework.name }}
                </span>
                <div class="mt-0.5 flex flex-wrap items-center gap-2">
                  <span class="block font-mono text-xs text-muted-foreground">
                    {{ framework.publisher }}
                  </span>
                  <span
                    v-if="framework.status !== 'active'"
                    class="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {{ framework.status }}
                  </span>
                  <span
                    v-if="isAdopted(framework.$id)"
                    class="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success-emphasis"
                  >
                    <PhCheckCircle :size="10" weight="fill" />
                    Adopted
                  </span>
                </div>
              </div>

              <!-- Logo Container on the right -->
              <div
                class="flex shrink-0 items-center justify-center rounded-md bg-muted/60 p-2 text-foreground transition-colors group-hover:bg-muted/80"
              >
                <component :is="frameworkLogo(framework)" :size="24" aria-hidden="true" />
              </div>
            </button>
          </div>

          <div
            v-else
            class="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground"
          >
            No frameworks are available. Contact your administrator.
          </div>
        </template>

        <!-- Step 2: Pick a release -->
        <template v-else-if="!newlyAdopted">
          <ClarusLoadingState
            v-if="isLoadingReleases"
            variant="compact"
            label="Loading framework releases"
          />

          <div
            v-else-if="releasesError"
            class="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <p class="font-medium text-foreground">Releases could not be loaded</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ releasesError }}</p>
            <Button
              class="mt-3"
              size="sm"
              variant="outline"
              @click="selectFramework(selectedFramework!)"
              >Try again</Button
            >
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
                    'border-primary bg-primary text-primary-foreground':
                      selectedReleaseId === release.$id,
                    'border-muted-foreground': selectedReleaseId !== release.$id,
                  }"
                >
                  <PhCheckCircle
                    v-if="selectedReleaseId === release.$id"
                    :size="14"
                    weight="fill"
                    aria-hidden="true"
                  />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span class="truncate font-medium text-foreground" :title="release.title">{{
                      release.title
                    }}</span>
                    <span class="shrink-0 font-mono text-xs text-muted-foreground"
                      >v{{ release.version }}</span
                    >
                  </span>
                  <span class="mt-1 block text-sm text-muted-foreground"
                    >Published {{ formatDate(release.publishedAt) }}</span
                  >
                  <span
                    v-if="release.releaseNotes"
                    class="mt-2 line-clamp-3 text-sm text-muted-foreground"
                    >{{ release.releaseNotes }}</span
                  >
                </span>
              </button>
            </div>

            <div
              v-else
              class="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground"
            >
              There are no published releases available for
              <span class="font-medium text-foreground">{{ selectedFramework.name }}</span
              >.
            </div>

            <div
              v-if="selectedRelease"
              class="mt-5 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4"
            >
              <div>
                <Label for="map-controls">Map controls</Label>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{
                    mapControls
                      ? 'Apply recommended control mappings.'
                      : 'Adopt assessments only without control mappings.'
                  }}
                </p>
              </div>
              <Switch id="map-controls" v-model="mapControls" aria-label="Map controls" />
            </div>

            <p v-if="adoptionError" class="mt-4 text-sm text-destructive" role="alert">
              {{ adoptionError }}
            </p>
          </template>
        </template>

        <DialogFooter>
          <template v-if="newlyAdopted">
            <Button variant="outline" @click="isAdoptionDialogOpen = false"> Close </Button>
            <Button @click="navigateToNewlyAdopted"> View requirements </Button>
          </template>
          <template v-else>
            <Button variant="outline" @click="isAdoptionDialogOpen = false"> Cancel </Button>
            <Button
              v-if="dialogStep === 'pick-release'"
              :disabled="!selectedRelease || isAdopting"
              @click="adoptSelectedFramework"
            >
              {{ isAdopting ? 'Adopting…' : 'Adopt framework' }}
            </Button>
          </template>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
