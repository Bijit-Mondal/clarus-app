<script setup lang="ts">
import { computed } from 'vue'
import { PhExport, PhPlus } from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ReadinessRing from '@/components/compliance/ReadinessRing.vue'
import ControlsTable from '@/components/compliance/ControlsTable.vue'
import { Button } from '@/components/ui/button'
import { useControlsStore } from '@/stores/controls'
import { frameworkProgress, summarize } from '@/data/controls'

const controlsStore = useControlsStore()
const summary = computed(() => summarize(controlsStore.list))
const frameworks = computed(() => frameworkProgress(controlsStore.list))

const legend = computed(() => [
  { key: 'passing', label: 'Passing', count: summary.value.passing, color: 'var(--success)' },
  { key: 'attention', label: 'Attention', count: summary.value.attention, color: 'var(--warning)' },
  { key: 'failing', label: 'Failing', count: summary.value.failing, color: 'var(--destructive)' },
])

function pct(part: number, total: number) {
  return total === 0 ? 0 : (part / total) * 100
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Button variant="outline" size="sm">
          <PhExport :size="16" aria-hidden="true" />
          Export
        </Button>
        <Button size="sm">
          <PhPlus :size="16" weight="bold" aria-hidden="true" />
          Add control
        </Button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Readiness -->
      <section
        class="flex flex-col items-center gap-5 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:gap-6 lg:flex-col lg:items-center"
        aria-label="Overall readiness"
      >
        <ReadinessRing :summary="summary" />
        <ul class="w-full space-y-2.5" role="list">
          <li
            v-for="item in legend"
            :key="item.key"
            class="flex items-center justify-between gap-3 text-sm"
          >
            <span class="flex items-center gap-2 text-muted-foreground">
              <span
                class="size-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: item.color }"
                aria-hidden="true"
              />
              {{ item.label }}
            </span>
            <span class="font-semibold tabular-nums text-foreground">{{ item.count }}</span>
          </li>
        </ul>
      </section>

      <!-- Framework progress -->
      <section
        class="rounded-xl border border-border bg-card p-6 lg:col-span-2"
        aria-label="Progress by framework"
      >
        <h2 class="mb-5 text-sm font-medium text-muted-foreground">Progress by framework</h2>
        <ul class="space-y-5" role="list">
          <li v-for="fw in frameworks" :key="fw.id">
            <div class="mb-2 flex items-baseline justify-between gap-3">
              <div class="flex items-baseline gap-2">
                <span class="font-medium text-foreground">{{ fw.label }}</span>
                <span class="text-sm tabular-nums text-muted-foreground">
                  {{ fw.summary.readiness }}%
                </span>
              </div>
              <span class="text-xs text-muted-foreground">
                Review in {{ fw.reviewInDays }} days
              </span>
            </div>
            <div
              class="flex h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              :aria-label="`${fw.label}: ${fw.summary.passing} passing, ${fw.summary.attention} need attention, ${fw.summary.failing} failing of ${fw.summary.total}`"
            >
              <span
                v-if="fw.summary.passing"
                class="h-full"
                :style="{
                  width: `${pct(fw.summary.passing, fw.summary.total)}%`,
                  backgroundColor: 'var(--success)',
                }"
              />
              <span
                v-if="fw.summary.attention"
                class="h-full"
                :style="{
                  width: `${pct(fw.summary.attention, fw.summary.total)}%`,
                  backgroundColor: 'var(--warning)',
                }"
              />
              <span
                v-if="fw.summary.failing"
                class="h-full"
                :style="{
                  width: `${pct(fw.summary.failing, fw.summary.total)}%`,
                  backgroundColor: 'var(--destructive)',
                }"
              />
            </div>
            <p class="mt-1.5 text-xs text-muted-foreground">
              {{ fw.summary.passing }} of {{ fw.summary.total }} controls passing
            </p>
          </li>
        </ul>
      </section>
    </div>

    <div class="mt-4">
      <ControlsTable :controls="controlsStore.list" />
    </div>
  </div>
</template>
