<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhCircle, PhCircleWavy, PhFolderPlus, PhPlus, PhShieldCheck } from '@phosphor-icons/vue'
import PageHeader from '@/components/shell/PageHeader.vue'
import ReadinessRing from '@/components/controls/ReadinessRing.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { controls, frameworkProgress, type FrameworkProgress } from '@/data/controls'

const openDialog = ref(false)
const frameworks = computed(() => frameworkProgress(controls))

function frameworkIconColor(fw: FrameworkProgress) {
  if (fw.summary.readiness >= 85) return 'var(--success)'
  if (fw.summary.readiness >= 60) return 'var(--warning)'
  return 'var(--destructive)'
}

const frameworkIcons: Record<string, any> = {
  soc2: PhShieldCheck,
  iso27001: PhCircleWavy,
  gdpr: PhCircle,
}
</script>

<template>
  <div>
    <PageHeader>
      <template #actions>
        <Dialog v-model:open="openDialog">
          <DialogTrigger as-child>
            <Button size="sm">
              <PhPlus :size="16" weight="bold" aria-hidden="true" />
              Add framework
            </Button>
          </DialogTrigger>
          <DialogContent class="max-w-md">
            <DialogHeader>
              <DialogTitle>Add framework</DialogTitle>
              <DialogDescription>
                Add a new compliance framework to start tracking controls and readiness.
              </DialogDescription>
            </DialogHeader>
            <div class="py-4 text-sm text-muted-foreground">
              Frameworks can be configured in workspace settings (placeholder view).
            </div>
            <DialogFooter>
              <Button variant="outline" @click="openDialog = false">Cancel</Button>
              <Button disabled>Add framework</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <!-- Existing frameworks -->
      <article
        v-for="fw in frameworks"
        :key="fw.id"
        class="group flex flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted/30"
      >
        <header class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-lg bg-background border border-border"
              :style="{ color: frameworkIconColor(fw) }"
            >
              <component :is="frameworkIcons[fw.id]" :size="20" aria-hidden="true" />
            </div>
            <div class="flex flex-col">
              <span class="font-semibold text-foreground">{{ fw.label }}</span>
              <span class="text-xs text-muted-foreground">{{ fw.summary.total }} controls</span>
            </div>
          </div>
        </header>

        <div class="mt-6 flex items-center gap-5">
          <ReadinessRing :summary="fw.summary" :size="120" :stroke="12" />
          <div class="flex flex-1 flex-col gap-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2 text-muted-foreground">
                <span
                  class="size-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: 'var(--success)' }"
                  aria-hidden="true"
                />
                Passing
              </span>
              <span class="font-medium tabular-nums text-foreground">{{ fw.summary.passing }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2 text-muted-foreground">
                <span
                  class="size-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: 'var(--warning)' }"
                  aria-hidden="true"
                />
                Needs attention
              </span>
              <span class="font-medium tabular-nums text-foreground">{{ fw.summary.attention }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-2 text-muted-foreground">
                <span
                  class="size-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: 'var(--destructive)' }"
                  aria-hidden="true"
                />
                Failing
              </span>
              <span class="font-medium tabular-nums text-foreground">{{ fw.summary.failing }}</span>
            </div>
          </div>
        </div>

        <footer class="mt-6 flex items-center justify-between text-xs">
          <span class="text-muted-foreground">
            Next review in <span class="font-medium tabular-nums text-foreground">{{ fw.reviewInDays }}</span> days
          </span>
          <Button variant="ghost" size="sm" class="-mr-2 -my-1">
            View framework
          </Button>
        </footer>
      </article>

      <!-- Add framework card -->
      <button
        class="group flex flex-col items-center justify-center gap-4 rounded-xl border border-border border-dashed bg-transparent p-6 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground transition-colors"
        @click="openDialog = true"
      >
        <div class="flex size-10 items-center justify-center rounded-lg border border-border bg-background">
          <PhFolderPlus :size="20" aria-hidden="true" />
        </div>
        <div class="flex flex-col items-center gap-1">
          <span class="text-sm font-medium">Add new framework</span>
          <span class="text-xs text-muted-foreground">
            SOC 2, ISO 27001, GDPR, or custom
          </span>
        </div>
      </button>
    </div>
  </div>
</template>
