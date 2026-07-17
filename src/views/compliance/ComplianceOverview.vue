<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhArrowUpRight, PhExport, PhListChecks, PhPlus } from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { frameworkProgress, summarize } from '@/data/controls'
import { useControlsStore } from '@/stores/controls'
import TasksManager from '@/components/compliance/TasksManager.vue'

const controlsStore = useControlsStore()
const tasksManagerRef = ref<InstanceType<typeof TasksManager> | null>(null)

const summary = computed(() => summarize(controlsStore.list))
const frameworks = computed(() => frameworkProgress(controlsStore.list))

const chartStyle = computed(() => {
  const total = summary.value.total || 1
  const passing = (summary.value.passing / total) * 100
  const attention = (summary.value.attention / total) * 100
  return {
    background: `conic-gradient(var(--success) 0 ${passing}%, var(--warning) ${passing}% ${passing + attention}%, var(--destructive) ${passing + attention}% 100%)`,
  }
})
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button variant="outline" size="sm">
          <PhExport :size="16" aria-hidden="true" />
          Export
        </Button>
        <Button size="sm" @click="tasksManagerRef?.openTaskDialog()">
          <PhPlus :size="16" weight="bold" aria-hidden="true" />
          Add task
        </Button>
      </template>
    </PageHeader>

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
            {{ summary.readiness }}% ready
          </Badge>
        </div>
        <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div
            class="relative flex size-40 shrink-0 items-center justify-center rounded-full"
            :style="chartStyle"
            role="img"
            :aria-label="`${summary.passing} passing, ${summary.attention} need attention, ${summary.failing} failing`"
          >
            <div class="flex size-28 flex-col items-center justify-center rounded-full bg-card">
              <span class="text-3xl font-semibold tracking-tight text-foreground">{{
                summary.total
              }}</span>
              <span class="text-xs text-muted-foreground">controls</span>
            </div>
          </div>
          <ul class="grid w-full grid-cols-3 gap-3" role="list">
            <li
              v-for="item in [
                {
                  label: 'Passing',
                  value: summary.passing,
                  color: 'bg-success',
                  text: 'text-success-emphasis',
                },
                {
                  label: 'Attention',
                  value: summary.attention,
                  color: 'bg-warning',
                  text: 'text-warning-emphasis',
                },
                {
                  label: 'Failing',
                  value: summary.failing,
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
          <li v-for="framework in frameworks" :key="framework.id">
            <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span class="font-medium text-foreground">{{ framework.label }}</span>
              <span class="tabular-nums text-muted-foreground"
                >{{ framework.summary.readiness }}%</span
              >
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
              <div
                class="h-full rounded-full bg-success transition-[width] duration-300"
                :style="{ width: `${framework.summary.readiness}%` }"
              />
            </div>
          </li>
        </ul>
      </article>
    </section>

    <TasksManager ref="tasksManagerRef" />
  </div>
</template>
