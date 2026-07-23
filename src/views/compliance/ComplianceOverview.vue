<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  PhArrowUpRight,
  PhExport,
  PhListChecks,
  PhPlus,
  PhShieldCheck,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useComplianceOverviewQuery } from '@/composables/useTenants'
import { getApiErrorMessage } from '@/lib/api'
import TasksManager from '@/components/compliance/TasksManager.vue'

const router = useRouter()
const route = useRoute()
const tasksManagerRef = ref<InstanceType<typeof TasksManager> | null>(null)

const query = useComplianceOverviewQuery()

const hasFrameworks = computed(() => {
  return !!query.data.value?.frameworks?.length
})

const chartStyle = computed(() => {
  const controls = query.data.value?.controls
  if (!controls || !controls.total) {
    return {
      background: 'var(--border)',
    }
  }
  const total = controls.total
  const passing = (controls.passing / total) * 100
  const attention = (controls.attention / total) * 100
  return {
    background: `conic-gradient(var(--success) 0 ${passing}%, var(--warning) ${passing}% ${passing + attention}%, var(--destructive) ${passing + attention}% 100%)`,
  }
})

function goToFrameworks() {
  const slug = route.params.organizationSlug as string
  void router.push({
    name: 'compliance-frameworks',
    params: { organizationSlug: slug },
  })
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button variant="outline" size="sm" :disabled="!hasFrameworks">
          <PhExport :size="16" aria-hidden="true" />
          Export
        </Button>
        <Button size="sm" :disabled="!hasFrameworks" @click="tasksManagerRef?.openTaskDialog()">
          <PhPlus :size="16" weight="bold" aria-hidden="true" />
          Add task
        </Button>
      </template>
    </PageHeader>

    <!-- Error State -->
    <div
      v-if="query.error.value"
      class="rounded-lg border border-destructive/30 bg-destructive/5 p-5 mb-6"
    >
      <div class="flex items-start gap-3">
        <PhWarningCircle :size="20" class="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p class="font-medium text-foreground">Compliance overview could not be loaded</p>
          <p class="mt-1 text-sm text-muted-foreground">
            {{
              getApiErrorMessage(
                query.error.value,
                'An unexpected error occurred. Please try again.',
              )
            }}
          </p>
          <Button class="mt-4" size="sm" variant="outline" @click="query.refetch()">
            Try again
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div
      v-else-if="query.isPending.value"
      class="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]"
      aria-label="Loading compliance summary"
    >
      <!-- Readiness Overview Skeleton -->
      <div class="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-5 animate-pulse">
        <div class="flex items-center justify-between">
          <div class="space-y-2">
            <div class="h-4 w-32 rounded bg-muted" />
            <div class="h-3 w-48 rounded bg-muted/65" />
          </div>
          <div class="h-6 w-20 rounded bg-muted/50" />
        </div>
        <div class="flex flex-col items-center gap-6 sm:flex-row">
          <div
            class="size-40 rounded-full border-4 border-muted/30 flex items-center justify-center bg-card"
          >
            <div class="size-28 rounded-full bg-muted/20" />
          </div>
          <div class="grid w-full grid-cols-3 gap-3">
            <div v-for="i in 3" :key="i" class="space-y-2">
              <div class="h-3 w-12 rounded bg-muted/65" />
              <div class="h-6 w-8 rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
      <!-- Framework Coverage Skeleton -->
      <div class="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-5 animate-pulse">
        <div class="flex items-center justify-between">
          <div class="space-y-2">
            <div class="h-4 w-36 rounded bg-muted" />
            <div class="h-3 w-52 rounded bg-muted/65" />
          </div>
          <div class="size-5 rounded bg-muted/50" />
        </div>
        <div class="space-y-4">
          <div v-for="i in 2" :key="i" class="space-y-2">
            <div class="flex justify-between">
              <div class="h-4 w-20 rounded bg-muted" />
              <div class="h-4 w-8 rounded bg-muted/65" />
            </div>
            <div class="h-2 w-full rounded bg-muted/40" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State: No Adopted Frameworks -->
    <div
      v-else-if="!hasFrameworks"
      class="rounded-lg border border-border bg-card p-8 md:p-12 text-center"
    >
      <div
        class="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-4"
      >
        <PhShieldCheck :size="24" aria-hidden="true" />
      </div>
      <h2 class="text-lg font-semibold text-foreground">Adopt a compliance framework first</h2>
      <p class="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        To start tracking your organization's security posture and view readiness metrics, you must
        first adopt a compliance framework. Clarus supports industry standards like SOC 2, ISO
        27001, and more.
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <Button size="sm" @click="goToFrameworks">
          <PhPlus :size="16" weight="bold" class="mr-1" aria-hidden="true" />
          Adopt a framework
        </Button>
      </div>
    </div>

    <!-- Real Dashboard Content -->
    <template v-else-if="query.data.value">
      <section
        class="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]"
        aria-label="Compliance summary"
      >
        <article
          class="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm sm:p-6"
        >
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-semibold text-foreground">Readiness overview</h2>
              <p class="mt-1 text-sm text-muted-foreground">Your program at a glance</p>
            </div>
            <Badge variant="secondary" class="gap-1 text-success-emphasis">
              <PhArrowUpRight :size="13" aria-hidden="true" />
              {{ query.data.value.controls.progress }}% ready
            </Badge>
          </div>
          <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div
              class="relative flex size-40 shrink-0 items-center justify-center rounded-full"
              :style="chartStyle"
              role="img"
              :aria-label="`${query.data.value.controls.passing} passing, ${query.data.value.controls.attention} need attention, ${query.data.value.controls.failing} failing`"
            >
              <div class="flex size-28 flex-col items-center justify-center rounded-full bg-card">
                <span class="text-3xl font-semibold tracking-tight text-foreground">{{
                  query.data.value.controls.total
                }}</span>
                <span class="text-xs text-muted-foreground">controls</span>
              </div>
            </div>
            <ul class="grid w-full grid-cols-3 gap-3" role="list">
              <li
                v-for="item in [
                  {
                    label: 'Passing',
                    value: query.data.value.controls.passing,
                    color: 'bg-success',
                    text: 'text-success-emphasis',
                  },
                  {
                    label: 'Attention',
                    value: query.data.value.controls.attention,
                    color: 'bg-warning',
                    text: 'text-warning-emphasis',
                  },
                  {
                    label: 'Failing',
                    value: query.data.value.controls.failing,
                    color: 'bg-destructive',
                    text: 'text-destructive-emphasis',
                  },
                ]"
                :key="item.label"
                class="min-w-0"
              >
                <div class="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="size-2 rounded-full" :class="item.color" aria-hidden="true" />
                  {{ item.label }}
                </div>
                <span class="text-xl font-semibold tabular-nums" :class="item.text">{{
                  item.value
                }}</span>
              </li>
            </ul>
          </div>
        </article>

        <article
          class="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm sm:p-6"
        >
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-semibold text-foreground">Framework coverage</h2>
              <p class="mt-1 text-sm text-muted-foreground">Readiness across active frameworks</p>
            </div>
            <PhListChecks :size="20" class="text-muted-foreground" aria-hidden="true" />
          </div>
          <ul class="space-y-4" role="list">
            <li v-for="framework in query.data.value.frameworks" :key="framework.tenantFrameworkId">
              <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span class="font-medium text-foreground">{{ framework.name }}</span>
                <span class="tabular-nums text-muted-foreground"
                  >{{ framework.requirements.progress }}%</span
                >
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                <div
                  class="h-full rounded-full bg-success transition-[width] duration-300"
                  :style="{ width: `${framework.requirements.progress}%` }"
                />
              </div>
            </li>
          </ul>
        </article>
      </section>

      <TasksManager ref="tasksManagerRef" />
    </template>
  </div>
</template>
